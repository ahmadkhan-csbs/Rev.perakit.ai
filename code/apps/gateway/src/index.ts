// Rev.perakit.ai — Gateway (real-time STT + LLM pipeline)
import { WebSocketServer, WebSocket } from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";
import { buildLiveUrl, parseResultMessage } from "@rev/stt";
import {
  generateAnswer, chunkText, retrieveRelevant,
  generateSessionNotes, generateMockQuestions, evaluateMockAnswers,
  analyzeCodeImage, BEHAVIORAL_PATTERN,
  type AnswerRequest, type ContextChunk, type AnswerModifier,
} from "@rev/ai";
import { saveSessionToDb } from "@rev/db";

// .env loader — agar root ya parent me .env hai to process.env me merge karo;
// sirf wahi set hoga jo env me pehle se nahi hai. Local run asaan karne ke liye.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
for (const p of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  break;
}

const PORT = Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 8080);
const DG_KEY = process.env.DEEPGRAM_API_KEY;
if (!DG_KEY) {
  console.error("DEEPGRAM_API_KEY missing — gateway cannot start. See .env");
  process.exit(1);
}
const FREE_LIMIT_SECONDS = Number(process.env.FREE_LIMIT_SECONDS ?? 600); // 10 min

const QUESTION_START = /^(what|why|how|when|where|who|which|can you|could you|would you|tell me|explain|describe|walk me through|do you|did you|have you|is it|are you)\b/i;
const QUESTION_WORDS = /\b(kya|kaise|kyun|kab|kahan|kitne|batao|bataiye|samjhao)\b|क्या|कैसे|क्यों|बताओ|बताइए/;
export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return t.endsWith("?") || QUESTION_START.test(t) || QUESTION_WORDS.test(t);
}

interface ClientMsg {
  type?: string;
  question?: string;
  resumeText?: string;
  jdText?: string;
  notesText?: string;
  instructions?: string;
  role?: string;
  model?: "groq" | "gemini" | "auto";
  qa?: { question: string; answer: string }[];
  imageBase64?: string;
  mimeType?: string;
  language?: string;
  starMode?: boolean;
  action?: AnswerModifier | "panic_clear";
  currentAnswer?: string;
}

// --- Shared session groups (gid) ---
interface Group {
  gid: string;
  chunks: ContextChunk[];
  instructions?: string;
  history: NonNullable<AnswerRequest["recentTranscript"]>;
  startedAt: number;
  genCounter: number;
  limitSent: boolean;
  clients: Set<(obj: unknown) => void>;
  role?: string;
  jdText?: string;
  modelPreference?: "groq" | "gemini" | "auto";
  starMode?: boolean;
}
const groups = new Map<string, Group>();
function getGroup(gid: string): Group {
  let g = groups.get(gid);
  if (!g) {
    g = { gid, chunks: [], history: [], startedAt: Date.now(), genCounter: 0, limitSent: false, clients: new Set() };
    groups.set(gid, g);
  }
  return g;
}
const overLimit = (g: Group) => (Date.now() - g.startedAt) / 1000 > FREE_LIMIT_SECONDS;

const wss = new WebSocketServer({ port: PORT });
console.log(`[rev-gateway] listening on ws://localhost:${PORT} (free limit ${FREE_LIMIT_SECONDS}s/session)`);

wss.on("connection", (client, req) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const sessionId = Math.random().toString(36).slice(2, 10);
  const channelSpeaker = url.searchParams.get("speaker") === "candidate" ? "CANDIDATE" : "INTERVIEWER";
  const group = getGroup(url.searchParams.get("gid") ?? sessionId);
  let closed = false;

  const send = (obj: unknown) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(obj));
  };
  const broadcast = (obj: unknown) => {
    for (const sendFn of group.clients) {
      try { sendFn(obj); } catch {}
    }
  };

  group.clients.add(send);
  send({ type: "session", sessionId, gid: group.gid, speaker: channelSpeaker });

  // --- Deepgram live stream ---
  const dgUrl = buildLiveUrl({
    language: url.searchParams.get("language") ?? "multi",
    encoding: url.searchParams.get("encoding") ?? undefined,
    sampleRate: url.searchParams.get("sample_rate") ? Number(url.searchParams.get("sample_rate")) : undefined,
  });

  const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  const dg = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${DG_KEY}` },
    ...(proxy ? { agent: new HttpsProxyAgent(proxy) } : {}),
  });

  // Preserve initial audio chunks (WebM EBML headers) until Deepgram is OPEN
  const audioBuffer: any[] = [];
  let dgConnected = false;

  dg.on("open", () => {
    console.log(`[${sessionId}] Deepgram connected (${channelSpeaker})`);
    dgConnected = true;
    while (audioBuffer.length > 0) {
      const chunk = audioBuffer.shift();
      if (dg.readyState === WebSocket.OPEN) dg.send(chunk);
    }
  });

  const keepAlive = setInterval(() => {
    if (dg.readyState === WebSocket.OPEN) dg.send(JSON.stringify({ type: "KeepAlive" }));
  }, 4000);

  dg.on("message", async (raw) => {
    let msg: unknown;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const ev = parseResultMessage(msg);
    if (!ev || !ev.text) return;

    // Broadcast transcript to UI
    broadcast({ type: "transcript", text: ev.text, isFinal: ev.isFinal, speechFinal: ev.speechFinal, speaker: ev.speaker, channel: channelSpeaker });

    if (!ev.isFinal) return;
    group.history.push({ speaker: channelSpeaker === "INTERVIEWER" ? "INTERVIEWER" : "USER", text: ev.text });
    if (group.history.length > 40) group.history.shift();

    // Trigger answer if:
    // 1) Audio is from INTERVIEWER (tab audio) and is a question or speechFinal
    // 2) OR audio is from CANDIDATE (user mic) and looks like a question (e.g. self-practice/testing)
    const isQuestion = looksLikeQuestion(ev.text);
    if (channelSpeaker === "INTERVIEWER" && (ev.speechFinal || isQuestion)) {
      void runAnswer(ev.text);
    } else if (channelSpeaker === "CANDIDATE" && isQuestion) {
      void runAnswer(ev.text);
    }
  });

  dg.on("error", (e) => {
    console.error(`[${sessionId}] Deepgram error:`, e.message);
    broadcast({ type: "error", source: "deepgram", message: e.message });
  });

  dg.on("close", (code, reason) => {
    console.log(`[${sessionId}] Deepgram closed (${code}) ${reason.toString()}`);
  });

  async function runAnswer(question: string, modifier?: AnswerModifier, previousAnswer?: string) {
    if (overLimit(group)) {
      if (!group.limitSent) {
        group.limitSent = true;
        broadcast({ type: "limit", message: `Free session limit (${Math.round(FREE_LIMIT_SECONDS / 60)} min) khatm — notes ban rahe hain.` });
      }
      return;
    }
    const myGen = ++group.genCounter;
    const t0 = Date.now();
    const isBehavioral = group.starMode || BEHAVIORAL_PATTERN.test(question);
    const relevant = retrieveRelevant(question, group.chunks, 4);
    const jdFirst = group.chunks.find((c) => c.source === "JD");
    const resumeChunks = group.chunks.filter((c) => c.source === "RESUME");
    const relevantResume = isBehavioral && resumeChunks.length > 0 ? retrieveRelevant(question, resumeChunks, 3) : [];
    const picked = [...new Map([...(jdFirst ? [jdFirst] : []), ...relevantResume, ...relevant].map((c) => [c.text, c])).values()];
    
    let activeEngine = group.modelPreference === "gemini" ? "gemini" : "groq";
    broadcast({ type: "answer-start", question, contextChunks: picked.length, isBehavioral, modifier, engine: activeEngine });
    try {
      const reqA: AnswerRequest = {
        question,
        role: url.searchParams.get("role") ?? group.role,
        company: url.searchParams.get("company") ?? undefined,
        instructions: group.instructions,
        context: picked,
        recentTranscript: group.history.slice(0, -1),
        language: url.searchParams.get("lang") === "en" ? "english" : "hinglish",
        modelPreference: group.modelPreference || "auto",
        starMode: isBehavioral,
        modifier,
        previousAnswer,
        onMeshEvent: (evt) => {
          activeEngine = evt.engine;
          broadcast({
            type: "mesh-event",
            engine: evt.engine,
            fromEngine: evt.fromEngine,
            action: evt.type,
            reason: evt.reason,
            latencyMs: evt.latencyMs
          });
        }
      };
      for await (const token of generateAnswer(reqA)) {
        if (closed || myGen !== group.genCounter) return;
        broadcast({ type: "answer-token", text: token, modifier, engine: activeEngine });
      }
      broadcast({ type: "answer-done", latencyMs: Date.now() - t0, modifier, engine: activeEngine });
    } catch (e: any) {
      broadcast({ type: "error", source: "llm", message: e?.message ?? "answer failed" });
    }
  }

  async function finalizeSession() {
    if (dg.readyState === WebSocket.OPEN) dg.send(JSON.stringify({ type: "CloseStream" }));
    const hist = [...group.history];
    if (hist.length === 0) {
      broadcast({ type: "notes", notes: null, message: "Notes ke liye pehle kuch conversation chahiye." });
      return;
    }
    try {
      const notes = await generateSessionNotes(hist);
      broadcast({ type: "notes", notes });
      void saveSessionToDb({
        role: group.role,
        jobDescription: group.jdText,
        instructions: group.instructions,
        startedAt: new Date(group.startedAt),
        endedAt: new Date(),
        billedSeconds: Math.floor((Date.now() - group.startedAt) / 1000),
        transcript: hist,
        notes,
      }).then((ok) => { if (ok) console.log(`[${group.gid}] session saved`); });
    } catch (e: any) {
      broadcast({ type: "error", source: "notes", message: e?.message ?? "notes failed" });
    }
  }

  // --- Client → Gateway ---
  client.on("message", (data, isBinary) => {
    if (isBinary) {
      if (dgConnected && dg.readyState === WebSocket.OPEN) {
        dg.send(data);
      } else {
        audioBuffer.push(data);
      }
      return;
    }
    let m: ClientMsg = {};
    try { m = JSON.parse(data.toString()); } catch { return; }
    if (m.type === "manual-answer" && m.question) void runAnswer(m.question);
    if (m.type === "quick-action" && m.action) {
      if (m.action === "panic_clear") {
        group.genCounter++;
        broadcast({ type: "panic-clear" });
      } else {
        const q = m.question || (group.history.length > 0 ? group.history[group.history.length - 1].text : "Interview Topic");
        void runAnswer(q, m.action, m.currentAnswer);
      }
    }
    if (m.type === "panic-clear") {
      group.genCounter++;
      broadcast({ type: "panic-clear" });
    }
    if (m.type === "set-model" && m.model) {
      group.modelPreference = m.model;
      broadcast({ type: "model-active", model: m.model });
    }
    if (m.type === "set-star-mode") {
      group.starMode = !!m.starMode;
      broadcast({ type: "star-mode-active", starMode: group.starMode });
    }
    if (m.type === "finalize") void finalizeSession();
    if (m.type === "context") {
      group.chunks = [
        ...chunkText(m.resumeText ?? "", "RESUME"),
        ...chunkText(m.jdText ?? "", "JD"),
        ...chunkText(m.notesText ?? "", "NOTES"),
      ];
      group.instructions = (m.instructions ?? "").slice(0, 20_000) || undefined;
      group.jdText = m.jdText || group.jdText;
      broadcast({ type: "context-ready", chunks: group.chunks.length });
    }
    if (m.type === "mock-questions") {
      group.role = m.role ?? group.role;
      void generateMockQuestions(m.role ?? "the role", m.jdText)
        .then((questions) => send({ type: "mock-questions", questions }))
        .catch((e: any) => send({ type: "error", source: "mock", message: e?.message ?? "questions failed" }));
    }
    if (m.type === "mock-report" && Array.isArray(m.qa)) {
      void evaluateMockAnswers(m.qa, m.role || group.role)
        .then((report) => send({ type: "mock-report", report }))
        .catch((e: any) => send({ type: "error", source: "mock", message: e?.message ?? "report failed" }));
    }
    if (m.type === "code-help" && m.imageBase64) {
      const targetLang = m.language || "python";
      void analyzeCodeImage(m.imageBase64, m.mimeType ?? "image/png", group.role, targetLang)
        .then((analysis) => broadcast({ type: "code-help", analysis, language: targetLang }))
        .catch((e: any) => broadcast({ type: "error", source: "code-help", message: e?.message ?? "analysis failed" }));
    }
  });

  const meter = setInterval(() => {
    const secs = Math.floor((Date.now() - group.startedAt) / 1000);
    send({ type: "meter", billedSeconds: secs, freeLimitSeconds: FREE_LIMIT_SECONDS });
    if (overLimit(group) && !group.limitSent) {
      group.limitSent = true;
      broadcast({ type: "limit", message: `Free session limit (${Math.round(FREE_LIMIT_SECONDS / 60)} min) khatm.` });
    }
  }, 30_000);

  client.on("close", () => {
    closed = true;
    clearInterval(keepAlive);
    clearInterval(meter);
    group.clients.delete(send);
    if (group.clients.size === 0) groups.delete(group.gid);
    if (dg.readyState === WebSocket.OPEN) {
      try { dg.send(JSON.stringify({ type: "CloseStream" })); } catch {}
      try { dg.close(); } catch {}
    }
    console.log(`[${sessionId}] disconnected (${channelSpeaker})`);
  });
});

// @rev/ai — High-speed LLM generation with Groq, Gemini Flash, Cerebras, OpenRouter Fallback Mesh
export interface ContextChunk { text: string; source: string; score?: number; }
export type AnswerModifier = "simpler" | "deep_dive" | "only_code";
export type MeshEngine = "groq" | "gemini" | "cerebras" | "openrouter";

export interface MeshEvent {
  type: "attempt" | "fallback" | "healthy" | "error";
  engine: MeshEngine;
  fromEngine?: MeshEngine;
  reason?: string;
  latencyMs?: number;
}

export interface AnswerRequest {
  question: string;
  role?: string;
  company?: string;
  instructions?: string;
  context?: ContextChunk[];
  recentTranscript?: { speaker: string; text: string }[];
  language?: string;
  modelPreference?: "groq" | "gemini" | "auto" | "cerebras" | "openrouter";
  starMode?: boolean;
  modifier?: AnswerModifier;
  previousAnswer?: string;
  onMeshEvent?: (event: MeshEvent) => void;
}

export const BEHAVIORAL_PATTERN = /\b(tell me about a time|describe a time|describe a situation|give me an example of|have you ever|how do you handle|how did you handle|walk me through a time|conflict|disagreement|tight deadline|tight schedule|failure|biggest failure|proudest|challenging project|mistake|overcame|leadership|teamwork|cross-functional|difficult stakeholder|handled pressure|prioritize tasks)\b/i;

const GROQ_MODEL = "openai/gpt-oss-120b";
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const CEREBRAS_MODEL = "llama3.3-70b";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

const ENGINE_TIMEOUTS: Record<MeshEngine, number> = {
  groq: 1800,       // Groq is sub-second; if >1.8s, trigger immediate failover
  gemini: 9000,     // Gemini Flash over international Google SSE
  cerebras: 3000,   // Cerebras high-speed 2000 tok/s
  openrouter: 6000  // OpenRouter mesh router
};

function getGroqKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

function getCerebrasKey(): string | undefined {
  return process.env.CEREBRAS_API_KEY;
}

function getOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

// ── Circuit Breaker for Multi-AI Mesh ────────────────────────────────
interface ProviderHealth {
  consecutiveFailures: number;
  lastFailureTime: number;
  lastFailureReason?: string;
}

export class MeshCircuitBreaker {
  private health = new Map<MeshEngine, ProviderHealth>();
  private readonly COOLDOWN_MS = 45_000; // 45 seconds cooldown after rate-limit or error

  isAvailable(engine: MeshEngine): boolean {
    if (engine === "groq" && !getGroqKey()) return false;
    if (engine === "gemini" && !getGeminiKey()) return false;
    if (engine === "cerebras" && !getCerebrasKey()) return false;
    if (engine === "openrouter" && !getOpenRouterKey()) return false;

    const h = this.health.get(engine);
    if (!h || h.consecutiveFailures === 0) return true;
    if (Date.now() - h.lastFailureTime > this.COOLDOWN_MS) {
      return true; // Cooldown expired, permit half-open retry
    }
    return false;
  }

  recordFailure(engine: MeshEngine, reason: string) {
    const prev = this.health.get(engine) || { consecutiveFailures: 0, lastFailureTime: 0 };
    this.health.set(engine, {
      consecutiveFailures: prev.consecutiveFailures + 1,
      lastFailureTime: Date.now(),
      lastFailureReason: reason
    });
    console.warn(`[MeshCircuitBreaker] ${engine} marked degraded (${reason})`);
  }

  recordSuccess(engine: MeshEngine) {
    this.health.set(engine, { consecutiveFailures: 0, lastFailureTime: 0 });
  }

  getOrderedMesh(preference?: string): MeshEngine[] {
    const allEngines: MeshEngine[] = ["groq", "gemini", "cerebras", "openrouter"];

    // Explicit preference overrides
    if (preference === "gemini") {
      return ["gemini", "groq", "cerebras", "openrouter"].filter(e => this.hasKey(e));
    }
    if (preference === "cerebras") {
      return ["cerebras", "groq", "gemini", "openrouter"].filter(e => this.hasKey(e));
    }
    if (preference === "openrouter") {
      return ["openrouter", "groq", "gemini", "cerebras"].filter(e => this.hasKey(e));
    }
    if (preference === "groq") {
      return ["groq", "gemini", "cerebras", "openrouter"].filter(e => this.hasKey(e));
    }

    // Auto Dynamic Mesh: Healthy available engines first
    const healthy = allEngines.filter(e => this.isAvailable(e));
    if (healthy.length > 0) return healthy;

    // Fallback if all are cooling down: return any with valid API keys
    return allEngines.filter(e => this.hasKey(e));
  }

  private hasKey(engine: MeshEngine): boolean {
    if (engine === "groq") return !!getGroqKey();
    if (engine === "gemini") return !!getGeminiKey();
    if (engine === "cerebras") return !!getCerebrasKey();
    if (engine === "openrouter") return !!getOpenRouterKey();
    return false;
  }
}

export const meshBreaker = new MeshCircuitBreaker();

// ── Watchdog Stream Runner (Instant Failover on First Token Lag) ─────
async function* streamWithWatchdog(
  generator: AsyncGenerator<string>,
  firstTokenTimeoutMs: number = 1400
): AsyncGenerator<string> {
  let firstTokenReceived = false;

  while (true) {
    const nextPromise = generator.next();

    if (!firstTokenReceived) {
      let timer: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
        timer = setTimeout(() => resolve({ timeout: true }), firstTokenTimeoutMs);
      });

      try {
        const result = await Promise.race([nextPromise, timeoutPromise]);
        if (timer) clearTimeout(timer);

        if ("timeout" in result) {
          try { generator.return?.(undefined); } catch { }
          throw new Error(`Engine response timeout (${firstTokenTimeoutMs}ms exceeded without first token)`);
        }

        const { done, value } = result;
        if (done) break;
        firstTokenReceived = true;
        if (value) yield value;
      } catch (err) {
        if (timer) clearTimeout(timer);
        throw err;
      }
    } else {
      const { done, value } = await nextPromise;
      if (done) break;
      if (value) yield value;
    }
  }
}

// ── Groq Stream Helper ───────────────────────────────────────────────
async function* groqStream(systemPrompt: string, userText: string, maxTokens: number = 350): AsyncGenerator<string> {
  const key = getGroqKey();
  if (!key) throw new Error("GROQ_API_KEY missing");
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const l = line.replace(/^data: /, "").trim();
      if (!l || l === "[DONE]") continue;
      try {
        const d = JSON.parse(l);
        const t = d.choices?.[0]?.delta?.content;
        if (t) yield t;
      } catch { }
    }
  }
}

// ── Gemini Stream Helper ─────────────────────────────────────────────
async function* geminiStream(systemPrompt: string, userText: string, maxTokens: number = 350): AsyncGenerator<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 0 }
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const l = line.replace(/^data: /, "").trim();
      if (!l) continue;
      try {
        const d = JSON.parse(l);
        const t = d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) yield t;
      } catch { }
    }
  }
}

// ── Cerebras Stream Helper (Ultra-fast 2000 tokens/sec) ──────────────
async function* cerebrasStream(systemPrompt: string, userText: string, maxTokens: number = 350): AsyncGenerator<string> {
  const key = getCerebrasKey();
  if (!key) throw new Error("CEREBRAS_API_KEY missing");
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];
  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      model: CEREBRAS_MODEL,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Cerebras error: ${res.status} ${await res.text()}`);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const l = line.replace(/^data: /, "").trim();
      if (!l || l === "[DONE]") continue;
      try {
        const d = JSON.parse(l);
        const t = d.choices?.[0]?.delta?.content;
        if (t) yield t;
      } catch { }
    }
  }
}

// ── OpenRouter Stream Helper (Universal Multi-Model Mesh) ───────────
async function* openRouterStream(systemPrompt: string, userText: string, maxTokens: number = 350): AsyncGenerator<string> {
  const key = getOpenRouterKey();
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ];
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://rev.perakit.ai",
      "X-Title": "Rev.perakit.ai"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const l = line.replace(/^data: /, "").trim();
      if (!l || l === "[DONE]") continue;
      try {
        const d = JSON.parse(l);
        const t = d.choices?.[0]?.delta?.content;
        if (t) yield t;
      } catch { }
    }
  }
}

// ── JSON generation helper with automatic fallback ───────────────────
async function generateJSON(systemPrompt: string, userText: string): Promise<string> {
  // Try Groq first (very fast, reliable JSON)
  const groqKey = getGroqKey();
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText },
          ],
          response_format: { type: "json_object" },
          max_tokens: 800,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const content = d.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch { /* fallback to Gemini */ }
  }

  // Fallback to Gemini
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800, responseMimeType: "application/json" },
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const content = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return content;
    }
  }

  throw new Error("Unable to generate response — both Groq and Gemini failed");
}

// ── A1: Coding Round Help — Vision (LeetCode / Live Snip) ─────────────────
export async function analyzeCodeImage(
  imageBase64: string,
  mimeType: string,
  role?: string,
  language: string = "python"
): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  // Use gemini-3.1-flash-lite with zero thinking budget for sub-second vision
  const visionModel = "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${key}`;
  
  const systemPrompt = `You are Rev, an elite coding interview copilot for FAANG / Top Tech live coding rounds (LeetCode, HackerRank, CoderPad, CodeSignal).
The candidate is screen-sharing or coding live. Carefully parse the problem statement, constraints, and visible code in the image.

Format your answer with these EXACT sections:

### 💡 Speaking Pitch (Say This Aloud)
2-3 natural sentences the candidate should say OUT LOUD to the interviewer immediately to explain intuition, high-level approach, and trade-offs before writing code.

### 💻 Optimal Code (${language.toUpperCase()})
Provide the production-ready, bug-free, optimal solution in ${language}.
Wrap inside a \`\`\`${language} markdown code block.
Include clean variable naming and minimal inline comments for tricky edge cases.

### ⏱️ Complexity & Dry Run
- **Time Complexity:** O(...) with 1-line justification.
- **Space Complexity:** O(...) with 1-line justification.
- **Key Edge Cases & Dry Run:** 2-3 bullets covering edge cases (empty, bounds, single element) and dry run verification on example 1.
`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: `Analyze this coding interview question from the screen. Generate the Speaking Pitch, Optimal Code in ${language}, and Complexity & Dry Run.` },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingBudget: 0 }
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vision analysis failed (${res.status}): ${errText}`);
  }
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text ?? "Analysis nahi hua — dobara try karo.";
}

// ── Main answer generator ────────────────────────────────────────────
export async function* generateAnswer(req: AnswerRequest): AsyncGenerator<string> {
  const contextText = (req.context ?? []).map(c => c.text).join("\n\n");
  const transcriptText = (req.recentTranscript ?? []).slice(-6).map(t => `${t.speaker}: ${t.text}`).join("\n");

  const isBehavioral = req.starMode || BEHAVIORAL_PATTERN.test(req.question);

  let behavioralInstruction = "";
  if (isBehavioral && req.modifier !== "simpler" && req.modifier !== "only_code") {
    behavioralInstruction = `
CRITICAL INSTRUCTION — STAR METHOD BEHAVIORAL ANSWER REQUIRED:
This is an HR / Behavioral question. You MUST format the response using the STAR method:
1. Ground the story directly in the candidate's ACTUAL resume projects or past company experiences from the Resume/Context above. Explicitly mention the specific company name or project name from the resume. If no resume is provided, pick a realistic enterprise project matching the role.
2. Structure the answer into these EXACT 4 bold tagged sections:
**[S - Situation]** 1 concise sentence: The real background problem at [Company/Project].
**[T - Task]** 1 sentence: The specific challenge and the candidate's exact responsibility.
**[A - Action]** 2 sentences: The concrete technical, architectural, or managerial actions the candidate took.
**[R - Result]** 1 sentence: The quantifiable business outcome (e.g., "reduced latency by 35%", "delivered 2 weeks early", "saved $40K/month").
`;
  }

  let modifierInstruction = "";
  let maxOutputTokens = 350;

  if (req.modifier === "simpler") {
    maxOutputTokens = 350;
    modifierInstruction = `
CRITICAL INSTRUCTION — "SIMPLER BANAO" (SHORT 2-LINER):
The candidate needs an ultra-concise, high-impact version they can deliver in 10-15 seconds.
Rules for Simpler Banao:
1. Provide EXACTLY 2 short, crisp sentences.
2. Strictly under 35 words total.
3. No greetings, no bullet points, no markdown headers — straight to the direct core explanation.
`;
  } else if (req.modifier === "deep_dive") {
    maxOutputTokens = 520;
    modifierInstruction = `
CRITICAL INSTRUCTION — "DEEP DIVE" (SYSTEM DESIGN & INTERNAL DETAILS):
The candidate needs an authoritative, deep-dive technical response.
Rules for Deep Dive:
1. Focus heavily on low-level internals, system architecture, database mechanics, memory/concurrency models, and distributed tradeoffs.
2. Structure with clear bullet points covering:
   - ⚙️ Underlying Mechanism / Internal Working
   - ⚖️ Tradeoffs & Edge Cases (P99 latency, race conditions, consistency vs availability)
   - 🚀 Production Best Practices
3. Around 130-160 words, dense with technical credibility.
`;
  } else if (req.modifier === "only_code") {
    maxOutputTokens = 650;
    modifierInstruction = `
CRITICAL INSTRUCTION — "ONLY CODE" (CLEAN PRODUCTION IMPLEMENTATION):
Rules for Only Code:
1. Provide ONLY production-ready, clean, idiomatic code inside a single standard markdown code block (\`\`\`lang ... \`\`\`).
2. Include short 1-line inline comments for non-obvious logic.
3. DO NOT include any conversational filler, intro, or concluding text outside the code block.
`;
  }

  const systemPrompt = `You are Rev, a real-time AI interview assistant. Give concise, confident answers the candidate can speak aloud.
${req.role ? `Role: ${req.role}` : ""}
${req.company ? `Company: ${req.company}` : ""}
${req.instructions ? `Instructions: ${req.instructions}` : ""}
${contextText ? `Resume/Context:\n${contextText}` : ""}
${behavioralInstruction}
${modifierInstruction}
Rules: Answer in ${req.language === "english" ? "English" : "Hinglish (mix of Hindi+English)"}, keep it under ${req.modifier === "deep_dive" ? "180" : req.modifier === "simpler" ? "35" : "115"} words, be specific, confident and direct.
If not in resume, give a realistic answer the candidate can adapt.`;

  let userText = `${transcriptText ? `Recent conversation:\n${transcriptText}\n\n` : ""}Interview question: ${req.question}`;
  if (req.previousAnswer) {
    userText += `\n\n[Previous answer to refine/modify]:\n${req.previousAnswer}`;
  }
  if (req.modifier === "simpler") {
    userText += `\n\n[Candidate command]: Make it simpler! Give me a clean 2-line version I can say in 10 seconds.`;
  } else if (req.modifier === "deep_dive") {
    userText += `\n\n[Candidate command]: Deep dive! Explain system architecture, low-level mechanics, and production tradeoffs.`;
  } else if (req.modifier === "only_code") {
    userText += `\n\n[Candidate command]: Only code! Strip all explanations and provide only the clean implementation code block.`;
  }

  // ── Multi-AI Zero-Downtime Fallback Mesh Execution ───────────────────
  const meshOrder = meshBreaker.getOrderedMesh(req.modelPreference);
  let previousEngine: MeshEngine | undefined;
  const errors: string[] = [];

  for (const engine of meshOrder) {
    const tStart = Date.now();
    if (previousEngine) {
      req.onMeshEvent?.({
        type: "fallback",
        engine,
        fromEngine: previousEngine,
        reason: errors[errors.length - 1] || "Failover triggered",
        latencyMs: Date.now() - tStart
      });
    } else {
      req.onMeshEvent?.({
        type: "attempt",
        engine,
        latencyMs: 0
      });
    }

    try {
      let stream: AsyncGenerator<string>;
      if (engine === "groq") stream = groqStream(systemPrompt, userText, maxOutputTokens);
      else if (engine === "gemini") stream = geminiStream(systemPrompt, userText, maxOutputTokens);
      else if (engine === "cerebras") stream = cerebrasStream(systemPrompt, userText, maxOutputTokens);
      else stream = openRouterStream(systemPrompt, userText, maxOutputTokens);

      let yieldedAny = false;
      const timeoutMs = ENGINE_TIMEOUTS[engine] || 3500;
      for await (const token of streamWithWatchdog(stream, timeoutMs)) {
        yieldedAny = true;
        yield token;
      }

      if (yieldedAny) {
        meshBreaker.recordSuccess(engine);
        req.onMeshEvent?.({
          type: "healthy",
          engine,
          latencyMs: Date.now() - tStart
        });
        return; // Success! Finished streaming cleanly.
      }
    } catch (err: any) {
      const errMsg = err?.message || "Unknown error";
      console.warn(`[MeshFailover] ${engine} failed:`, errMsg);
      meshBreaker.recordFailure(engine, errMsg);
      errors.push(`${engine}: ${errMsg}`);
      previousEngine = engine;
    }
  }

  throw new Error(`Multi-AI Mesh exhausted. Attempted: [${meshOrder.join(" -> ")}]. Errors: ${errors.join("; ")}`);
}

export function chunkText(text: string, source: string, maxLen = 400): ContextChunk[] {
  if (!text?.trim()) return [];
  const chunks: ContextChunk[] = [];
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > maxLen && cur) { chunks.push({ text: cur.trim(), source }); cur = ""; }
    cur += s + " ";
  }
  if (cur.trim()) chunks.push({ text: cur.trim(), source });
  return chunks;
}

export function retrieveRelevant(query: string, chunks: ContextChunk[], topK = 4): ContextChunk[] {
  const q = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  return chunks
    .map(c => ({ ...c, score: q.filter(w => c.text.toLowerCase().includes(w)).length }))
    .filter(c => c.score > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topK);
}

export async function generateSessionNotes(transcript: { speaker: string; text: string }[]) {
  const text = transcript.map(t => `${t.speaker}: ${t.text}`).join("\n");
  const raw = await generateJSON(
    "You are an interview coach. Analyze this interview transcript and return JSON with keys: summary (string), questionsAsked (string[]), strengths (string[]), improvements (string[]). Be specific and helpful.",
    `Transcript:\n${text}`
  );
  return JSON.parse(raw);
}

export const FILLER_WORDS = [
  "um", "uh", "like", "you know", "actually", "basically",
  "so", "sort of", "kind of", "i mean", "right", "literally"
];

export interface SpeakingMetrics {
  totalWords: number;
  totalDurationSec: number;
  wpm: number;
  paceRating: "Too Slow" | "Ideal Conversational Pace" | "Too Fast";
  paceFeedback: string;
  totalFillers: number;
  fillerRatePercent: number;
  detectedFillers: { word: string; count: number }[];
  fillerFeedback: string;
}

export function analyzeSpeakingMetrics(
  qa: { question: string; answer: string; durationSeconds?: number }[]
): SpeakingMetrics {
  let totalWords = 0;
  let totalDurationSec = 0;
  const fillerCounts: Record<string, number> = {};

  for (const item of qa) {
    const text = item.answer || "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    totalWords += words.length;
    totalDurationSec += (item.durationSeconds && item.durationSeconds > 0)
      ? item.durationSeconds
      : Math.max(12, Math.round(words.length * 0.45));

    const lower = text.toLowerCase();
    for (const f of FILLER_WORDS) {
      const regex = new RegExp(`\\b${f}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) {
        fillerCounts[f] = (fillerCounts[f] || 0) + matches.length;
      }
    }
  }

  const totalFillers = Object.values(fillerCounts).reduce((a, b) => a + b, 0);
  const minutes = Math.max(0.15, totalDurationSec / 60);
  const wpm = Math.round(totalWords / minutes);

  let paceRating: "Too Slow" | "Ideal Conversational Pace" | "Too Fast" = "Ideal Conversational Pace";
  let paceFeedback = "Great speaking rhythm (115–155 WPM). Interviewer will follow your technical explanations clearly.";
  if (wpm < 110) {
    paceRating = "Too Slow";
    paceFeedback = `Speaking pace is ${wpm} WPM. Aim for 120–140 WPM so you don't sound hesitant or uncertain.`;
  } else if (wpm > 160) {
    paceRating = "Too Fast";
    paceFeedback = `Speaking pace is ${wpm} WPM. Slow down slightly so technical architecture details land with authority.`;
  }

  const fillerRatePercent = totalWords > 0 ? Math.round((totalFillers / totalWords) * 1000) / 10 : 0;
  const detectedFillers = Object.entries(fillerCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  let fillerFeedback = "Excellent! You maintained clear, crisp delivery with almost zero filler words.";
  if (totalFillers > 0) {
    const topWord = detectedFillers[0]?.word || "filler";
    fillerFeedback = `Detected ${totalFillers} filler words (${fillerRatePercent}% rate), primarily '${topWord}'. Replace '${topWord}' with a deliberate 1-second silent pause while gathering your thoughts.`;
  }

  return {
    totalWords,
    totalDurationSec,
    wpm,
    paceRating,
    paceFeedback,
    totalFillers,
    fillerRatePercent,
    detectedFillers,
    fillerFeedback
  };
}

export async function generateMockQuestions(role: string, jd?: string): Promise<string[]> {
  const raw = await generateJSON(
    "Generate 5 realistic interview questions. Return JSON object with key 'questions' containing an array of strings. Mix behavioral and technical questions.",
    `Role: ${role}${jd ? `\nJD: ${jd}` : ""}`
  );
  const parsed = JSON.parse(raw);
  return parsed.questions ?? parsed;
}

export async function evaluateMockAnswers(
  qa: { question: string; answer: string; durationSeconds?: number }[],
  role: string = "Software Engineer"
) {
  const metrics = analyzeSpeakingMetrics(qa);

  const prompt = `You are an elite Principal Bar Raiser evaluating a candidate's mock interview for the role: ${role}.
Speaking Analytics Calculated:
- Total Words: ${metrics.totalWords}
- Speaking Pace: ${metrics.wpm} WPM (${metrics.paceRating})
- Total Filler Words: ${metrics.totalFillers} (${metrics.fillerRatePercent}% filler rate)
- Detected Fillers: ${metrics.detectedFillers.map(f => `${f.word} (${f.count}x)`).join(", ") || "None"}

Evaluate technical accuracy, communication clarity, STAR structure, and overall interview presence.
Return a STRICT JSON object with these EXACT keys:
{
  "overallScore": number (0-100 Technical Confidence Score, e.g. 84),
  "confidenceLevel": "High Confidence" | "Moderate Confidence" | "Needs Practice",
  "confidenceAssessment": string (2-3 sentences evaluating technical presence and authority),
  "feedback": string (Comprehensive executive summary),
  "strengths": string[] (Array of 3 top strengths observed),
  "improvements": string[] (Array of 3 prioritized areas to improve),
  "questionFeedback": [
    {
      "question": string,
      "score": number (1-10),
      "tip": string (Actionable tip to make the answer 10/10)
    }
  ]
}`;

  let parsed: any;
  try {
    const raw = await generateJSON(prompt, JSON.stringify(qa));
    parsed = JSON.parse(raw);
  } catch (e) {
    parsed = {
      overallScore: 80,
      confidenceLevel: "Moderate Confidence",
      confidenceAssessment: "Candidate demonstrated solid domain fundamentals with clear reasoning.",
      feedback: "Good technical foundations. Aim for more quantifiable metrics in your results.",
      strengths: ["Strong problem framing", "Logical communication"],
      improvements: ["Elaborate on production edge cases", "Use brief pauses instead of filler words"],
      questionFeedback: []
    };
  }

  // Ensure overallScore is on 100-point scale
  let score = typeof parsed.overallScore === "number" ? parsed.overallScore : 80;
  if (score <= 10) score = Math.round(score * 10);

  return {
    ...parsed,
    overallScore: score,
    metrics
  };
}

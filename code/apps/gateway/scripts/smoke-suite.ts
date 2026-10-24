// Suite smoke: (1) shared gid context (2) finalize → post-call notes (3) mock questions + report
// Usage: gateway (DG+Groq env ke saath) chalu ho, phir `npm run smoke-suite --workspace=@rev/gateway`
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const RESUME = `Ahmad Verma — Senior Backend Engineer, 5 years.
Payments platform at FinEdge: UPI payment API, 8000 requests per second.
Reduced payment API latency from 4 seconds to 300 ms (92 percent) using Redis caching and removing N+1 queries.
Skills: Node.js, PostgreSQL, Redis, Kafka, Kubernetes, system design.`;

const wav = readFileSync(fileURLToPath(new URL("../../../phase0-benchmark/audio/t05.wav", import.meta.url))).subarray(44);
const results: Record<string, boolean> = {};
const done = (name: string, ok: boolean, extra = "") => { results[name] = ok; console.log(`${ok ? "✅" : "❌"} ${name} ${extra}`); };
setTimeout(() => { console.log("\nSUITE TIMEOUT", results); process.exit(1); }, 90_000);

function streamAudio(ws: WebSocket) {
  const CHUNK = 8000; let off = 0;
  setTimeout(() => {
    const iv = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN || off >= wav.length) { clearInterval(iv); return; }
      ws.send(wav.subarray(off, off + CHUNK)); off += CHUNK;
    }, 250);
  }, 1200);
}

// --- Phase 1+2: group context + notes ---
const gid = "suite" + Math.random().toString(36).slice(2, 7);
const cand = new WebSocket(`ws://localhost:8080/?speaker=candidate&gid=${gid}`);
cand.on("open", () => cand.send(JSON.stringify({ type: "context", resumeText: RESUME })));

const iv = new WebSocket(`ws://localhost:8080/?speaker=interviewer&gid=${gid}&lang=en&encoding=linear16&sample_rate=16000`);
let phase = 0;
iv.on("open", () => {
  // context CANDIDATE connection se gaya tha; answer INTERVIEWER se mangege — chunks shared hone chahiye
  setTimeout(() => iv.send(JSON.stringify({ type: "manual-answer", question: "Tell me about a time you improved API performance." })), 600);
  streamAudio(iv);
});
iv.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === "answer-start" && phase === 0) {
    phase = 1;
    done("group-shared-context", m.contextChunks > 0, `(chunks=${m.contextChunks})`);
  }
  if (m.type === "transcript" && m.isFinal && phase === 1) {
    phase = 2;
    setTimeout(() => iv.send(JSON.stringify({ type: "finalize" })), 800);
  }
  if (m.type === "notes") {
    done("post-call-notes", !!m.notes?.summary, m.notes ? `(summary ${m.notes.summary.length} chars, ${m.notes.questionsAsked?.length ?? 0} questions)` : "(notes null)");
    phase3();
  }
  if (m.type === "error") console.log("ERR", m.source, m.message);
});

// --- Phase 3: mock ---
function phase3() {
  const mk = new WebSocket("ws://localhost:8080/?speaker=candidate");
  mk.on("open", () => mk.send(JSON.stringify({ type: "mock-questions", role: "Senior Backend Engineer" })));
  mk.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === "mock-questions") {
      done("mock-questions", Array.isArray(m.questions) && m.questions.length >= 3, `(${m.questions?.length} questions)`);
      mk.send(JSON.stringify({
        type: "mock-report",
        qa: [
          { question: m.questions[0], answer: "I am a backend engineer with 5 years at FinEdge. I built a UPI payment API handling 8000 requests per second and cut latency from 4 seconds to 300 ms using Redis caching and removing N+1 queries." },
          { question: m.questions[1] ?? "Behavioral?", answer: "Team ke saath kaam kiya." },
        ],
      }));
    }
    if (m.type === "mock-report") {
      done("mock-report", typeof m.report?.overallScore === "number", `(score=${m.report?.overallScore})`);
      const all = Object.values(results).every(Boolean) && Object.keys(results).length === 4;
      console.log(all ? "\n🎉 SUITE PASS — group context + notes + mock sab live" : "\n❌ SUITE PARTIAL FAIL", results);
      process.exit(all ? 0 : 1);
    }
    if (m.type === "error") console.log("ERR", m.source, m.message);
  });
}

// Context smoke: WS connect → context (fake resume+JD) send → manual question →
// verify: context-ready chunks>0, answer-start.contextChunks>0, answer tokens stream.
// Usage: gateway chalu ho, phir `npm run smoke-context --workspace=@rev/gateway`
import WebSocket from "ws";

const RESUME = `Ahmad Verma — Senior Backend Engineer, 5 years.
Payments platform at FinEdge: built UPI payment API handling 8000 requests per second.
Reduced payment API latency from 4 seconds to 300 ms (92 percent improvement) using Redis caching and removing N+1 queries.
Migrated monolith billing module to microservices with Kafka event streaming.
Skills: Node.js, PostgreSQL, Redis, Kafka, Kubernetes, system design.`;

const JD = `Senior Backend Engineer — Payments. Own high-throughput APIs, PostgreSQL optimization,
Redis caching, event-driven microservices. Experience with latency reduction and reliability at scale required.`;

const ws = new WebSocket("ws://localhost:8080/?lang=en");
let ready = 0, answerChunks = -1, tokens = "";
const fail = (why: string) => { console.log("\n❌ CONTEXT SMOKE FAIL — " + why); process.exit(1); };
setTimeout(() => fail(`timeout (ready=${ready}, answerChunks=${answerChunks})`), 30_000);

ws.on("open", () => {
  ws.send(JSON.stringify({ type: "context", resumeText: RESUME, jdText: JD, instructions: "Payments experience highlight karo." }));
});
ws.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === "context-ready") {
    ready = m.chunks;
    console.log("context-ready chunks =", ready);
    ws.send(JSON.stringify({ type: "manual-answer", question: "Tell me about a time you improved API performance and reduced latency." }));
  }
  if (m.type === "answer-start") { answerChunks = m.contextChunks; console.log("answer-start contextChunks =", answerChunks); }
  if (m.type === "answer-token") tokens += m.text;
  if (m.type === "answer-done") {
    console.log("tokens received:", tokens.length, "chars | latency:", m.latencyMs, "ms");
    if (ready > 0 && answerChunks > 0 && tokens.length > 0) {
      console.log("\n✅ CONTEXT SMOKE PASS — resume chunks bane aur answer me use hue");
      process.exit(0);
    }
    fail(`bad state ready=${ready} answerChunks=${answerChunks} tokens=${tokens.length}`);
  }
  if (m.type === "error") console.log("ERROR:", m.source, m.message);
});
ws.on("error", (e) => fail("ws error " + e.message));

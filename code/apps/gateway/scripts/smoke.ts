// Smoke test: gateway ko benchmark wav (t05 Hinglish) stream karke dekho —
// transcript + answer events aane chahiye. Pehle dusre terminal me gateway chalao:
//   DEEPGRAM_API_KEY=... npm run gateway
// Phir: npm run smoke --workspace=@rev/gateway
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";

const file = process.argv[2] ??
  join(homedir(), "workspace/Rev.perakit.ai/code/phase0-benchmark/audio/t05.wav");
const wav = readFileSync(file);
// strip 44-byte WAV header → raw linear16 16kHz mono
const pcm = wav.subarray(44);

const ws = new WebSocket("ws://localhost:8080/?encoding=linear16&sample_rate=16000&lang=hi");
let gotTranscript = "";
let gotAnswer = false;
const done = (ok: boolean, why: string) => {
  console.log(ok ? `\n✅ SMOKE PASS — ${why}` : `\n❌ SMOKE FAIL — ${why}`);
  process.exit(ok ? 0 : 1);
};
setTimeout(() => done(gotTranscript.length > 0, "timeout — transcript: " + gotTranscript.slice(0, 80)), 30_000);

ws.on("open", async () => {
  console.log("connected, streaming", file.split("/").pop(), `(${pcm.length} bytes PCM)`);
  const CHUNK = 6400; // 0.2s of 16kHz int16
  for (let off = 0; off < pcm.length; off += CHUNK) {
    ws.send(pcm.subarray(off, off + CHUNK));
    await new Promise((r) => setTimeout(r, 40)); // ~5x realtime — Deepgram handle kar leta hai
  }
  ws.send(JSON.stringify({ type: "finalize" }));
});
ws.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === "transcript" && m.isFinal) {
    gotTranscript += m.text + " ";
    console.log("TRANSCRIPT:", m.text);
  }
  if (m.type === "answer-start") console.log("ANSWER for:", m.question.slice(0, 70));
  if (m.type === "answer-token" && !gotAnswer) { gotAnswer = true; process.stdout.write("ANSWER tokens: " + m.text); }
  else if (m.type === "answer-token") process.stdout.write(m.text);
  if (m.type === "answer-done") {
    console.log(`\n(latency ${m.latencyMs}ms)`);
    setTimeout(() => done(gotTranscript.length > 0 && gotAnswer, "transcript + answer received"), 300);
  }
  if (m.type === "error") console.log("ERROR EVENT:", m.source, m.message);
});
ws.on("error", (e) => done(false, "ws error: " + e.message));

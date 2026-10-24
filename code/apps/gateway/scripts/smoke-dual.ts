// Dual-channel smoke: same Hinglish question audio do channels par bhejo —
//  interviewer channel → transcript(channel=INTERVIEWER) + answer trigger hona chahiye
//  candidate  channel → transcript(channel=CANDIDATE) aaye, par answer trigger NAHI hona chahiye
// Usage: gateway chalu ho, phir `npm run smoke-dual --workspace=@rev/gateway`
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const wavPath = fileURLToPath(new URL("../../../phase0-benchmark/audio/t05.wav", import.meta.url));
const wav = readFileSync(wavPath).subarray(44); // PCM data

function streamAudio(ws: WebSocket) {
  // Pehle 1.2s Deepgram ko connect hone do, phir REALTIME pace: 16kHz×16bit = 32000 B/s
  const CHUNK = 8000; // 250ms of audio
  let off = 0;
  setTimeout(() => {
    const iv = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN || off >= wav.length) { clearInterval(iv); return; }
      ws.send(wav.subarray(off, off + CHUNK));
      off += CHUNK;
    }, 250);
  }, 1200);
}

const state = {
  aFinals: 0, aAnswers: 0, aChannelOk: false,
  bFinals: 0, bAnswers: 0, bChannelOk: false,
};
const fail = (why: string) => { console.log("\n❌ DUAL SMOKE FAIL — " + why, JSON.stringify(state)); process.exit(1); };
setTimeout(() => fail("timeout"), 45_000);

function watch(done: () => boolean) {
  const iv = setInterval(() => {
    if (done()) {
      clearInterval(iv);
      console.log("\n✅ DUAL SMOKE PASS — interviewer se jawab bana, candidate se nahi", JSON.stringify(state));
      process.exit(0);
    }
  }, 500);
}

const a = new WebSocket("ws://localhost:8080/?speaker=interviewer&encoding=linear16&sample_rate=16000");
a.on("open", () => streamAudio(a));
a.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === "transcript" && m.isFinal) { state.aFinals++; if (m.channel === "INTERVIEWER") state.aChannelOk = true; }
  if (m.type === "answer-start") state.aAnswers++;
  if (m.type === "answer-done") watch(() => state.aAnswers >= 1 && state.aChannelOk && state.bFinals >= 1 && state.bChannelOk && state.bAnswers === 0);
});

const b = new WebSocket("ws://localhost:8080/?speaker=candidate&encoding=linear16&sample_rate=16000");
b.on("open", () => streamAudio(b));
b.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === "transcript" && m.isFinal) { state.bFinals++; if (m.channel === "CANDIDATE") state.bChannelOk = true; }
  if (m.type === "answer-start") state.bAnswers++;
});

a.on("error", (e) => fail("interviewer ws error " + e.message));
b.on("error", (e) => fail("candidate ws error " + e.message));

# Phase 0 — Hinglish STT Benchmark (GO / NO-GO gate)

## Purpose
Phase 1 shuru karne se pehle verify karo: kya Deepgram Nova-3 real interview audio (English + Hinglish code-switching) ko achhi accuracy se transcribe karta hai? Agar nahi — to plan badlo (dual-stream fallback, ya STT provider change) *before* building.

## Pass criteria
| Metric | Gate |
|---|---|
| English questions WER | ≤ 10% |
| Hinglish/Hindi questions WER | ≤ 20% |
| Keyterm recall (tech terms) | ≥ 90% |

**GO** = teeno pass → Phase 1 scaffold. **NO-GO** = koi fail → dual-stream EN+HI fallback test karo, phir bhi fail to STT strategy revise.

## Steps
1. Deepgram free account banao → API key lo ($200 free credits, card nahi lagta).
2. `test-scripts.json` ke 10 scripts ko padhkar **real voice me record karo** — audio file per script: `audio/<id>.mp3` (ya .wav/.m4a). Real recording preferred hai (accent, pace, background noise asli cheez test karega). TTS chalega agar recording possible nahi.
3. Run: `DEEPGRAM_API_KEY=xxx node benchmark.mjs`
4. `report.md` check karo — per-test WER, keyterm recall, aur kya transcribe hua.
5. Teeno models run honge: nova-3-multilingual (auto-detect), nova-3-en, nova-3-hi — best run per test report me aayega.

## Notes
- Benchmark prerecorded API use karta hai (streaming se sasta/faster); streaming latency alag se Phase 1 me measure hogi.
- Script me syntax error ho to `node --version` check karo (Node 18+ chahiye).

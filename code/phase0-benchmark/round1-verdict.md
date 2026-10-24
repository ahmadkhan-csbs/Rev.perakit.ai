# Round 1 — Deepgram Nova-3 Benchmark Verdict (20 Oct 2026)

## VERDICT: ✅ GO — Phase 1 scaffold approved (STT side se)

Engine tested: Deepgram Nova-3, prerecorded API, 3 runs (multilingual auto-detect / en / hi).
Audio: AI-TTS voices (Indian English + Hindi) — real-voice confirmation baad me bhi karenge, par result margin itna bada hai ki direction clear hai.

## Numbers
| Gate | Target | Result |
|---|---|---|
| English WER | ≤ 10% | **0.0%** — t01, t02, t03, t04, t09 sab perfect, multilingual mode me bhi |
| Hinglish/Hindi WER | ≤ 20% | Raw numbers 66–91% — **par ye script artifact hai** (neeche dekho) |
| Keyterm recall | ≥ 90% | English 100% · Hinglish ~90% (chhote splits: "Postgress QL", "Micro services") |

## Script artifact — asli kahani
Ground-truth scripts **roman** Hindi me likhe the. Deepgram Hindi hisse ko **Devanagari** me transcribe karta hai. Dono sahi hain — par word-matching roman vs Devanagari ko mismatch gin leta hai.

Transcript haath se padhne par (report.md detail):
- t05: "तो आप मुझे बताओ आपने अपने last project में database optimization कैसे किया था?" — **perfect**
- t06: "अगर production में server down हो जाए रात को तो आपका approach क्या होगा? पहले rollback करोगे या debugging start करोगे?" — **perfect**, keyterms 4/4
- t07: salary/CTC wala sawal — **perfect**
- t08: "आप मुझे अपने बारे में कुछ बताइए. आपकी सबसे बड़ी strength क्या है..." — **perfect**
- t10: sirf "Micro services" split, baaki perfect

Semantic accuracy Hinglish par ~95–100% (multilingual/hi runs). LLM Devanagari aaram se padh lega — product ke liye koi rukawat nahi. UI me roman display chahiye to transliteration layer Phase 1 me add karenge (display-only).

## Sabse important product finding
**Default config = Nova-3 multilingual (auto-detect), language switch ki zaroorat hi nahi.**
- Multilingual mode: pure English bhi 0% WER, Hinglish bhi perfect.
- EN-only mode Hindi par fail hai (t08 khali, t06 garbled) — kabhi default mat rakhna.
- HI mode English par bhi theek-thaak hai (0–11% WER) par multilingual best hai.

## Phase 1 ke liye fix-list
1. Keyterm prompting chalu karna ("PostgreSQL", "Microservices", "Kubernetes" jaisi terms split hoti hain).
2. Display transliteration (Devanagari → roman) — sirf UI layer.
3. Streaming latency test Phase 1 sprint me (ye benchmark prerecorded tha).
4. Launch se pehle ek round real human voice par repeat (TTS audio clean hota hai; real mic + noise alag test hai).

## Note
API key sirf is run ke liye env var me use hui — kisi file/memory me store nahi hai.

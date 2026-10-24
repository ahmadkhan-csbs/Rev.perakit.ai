# Rev.perakit.ai — Real-Time AI Interview Assistant

Phase 1 scaffold (Oct 2026). Plan: `~/workspace/Rev.perakit.ai/docs/tech-plan.md`

## Structure
```
apps/web        Next.js 15 — landing + /session live UI
apps/gateway    Node WS service — browser audio → Deepgram → transcript → answers
packages/stt    Deepgram Nova-3 helpers (live URL builder, keyterms, prerecorded)
packages/ai     Answer engine (LLM router, anti-fabrication prompt, notes schema)
packages/db     Prisma schema (users, sessions, transcripts, answers, credits ledger)
```

## ₹0-Mode (abhi ka rule — ek rupya nahi)
| Cheez | Free jugaad |
|---|---|
| Speech-to-text | Deepgram — signup par **$200 free credits** (card nahi) |
| Answer LLM | **Groq free tier** (Llama 3.3 70B, bahut fast) — backup: Gemini free tier. Paid OpenAI sirf revenue ke baad |
| Hosting (jab deploy hoga) | Vercel / Render / Railway free tiers |
| Database | Neon / Supabase free Postgres |
| Domain | Abhi free subdomain; Rev.perakit.ai domain paisa aane par |

## Run locally
```bash
npm install
cp .env.example .env   # DEEPGRAM_API_KEY zaroor; OPENAI_API_KEY optional (bina iske answers DEMO mode me)

# Terminal 1 — gateway (port 8080)
DEEPGRAM_API_KEY=... npm run gateway

# Terminal 2 — web (port 3000)
npm run web
# → http://localhost:3000/session — mic allow karo, bolo, transcript + answer live aayega

# Smoke test (dusre terminal se, gateway chalu ho tab)
npm run smoke --workspace=@rev/gateway   # benchmark Hinglish wav stream karke PASS/FAIL deta hai
```

## Verified (scaffold day)
- Typecheck: saare 5 workspaces green
- Gateway smoke test: PASS — Hinglish audio → Deepgram transcript → question detect → streaming answer
- Benchmark (Phase 0): Deepgram Nova-3 — English WER 0.0%, Hinglish semantic ~95–100% (multilingual default)

## Known pending (environment, code nahi)
- `prisma validate` / `next build` is sandbox me network/native limits ki wajah se complete nahi hue (Prisma engine download + SWC bus error). Normal machine/CI par chalenge — pehla kaam wahan ye dono verify karna.
- OPENAI_API_KEY milte hi answers real ho jayenge (abhi DEMO template mode, clearly labeled).

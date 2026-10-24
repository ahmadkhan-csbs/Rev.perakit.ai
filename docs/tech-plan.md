# Real-Time AI Interview Assistant — Detailed Tech Plan
### ParakeetAI-style product, built India-first
**Prepared for:** Ahmad · **Date:** 20 Oct 2026 · **Status:** Plan v1 — ready for go/no-go on Phase 1

> **Working codename:** `InterviewCopilot` (final name — open decision, §16)
> **One-line pitch:** Live interview/meeting me question suno → 2–3 second me resume-based, ready-to-speak answer screen par.
> **Positioning (important):** Product ko *permitted-use* assistant ke roop me position karenge — mock interviews, practice, sales calls, internal meetings, aur woh interviews jahan AI assistance allowed hai. ParakeetAI khud yahi line leta hai, aur yahi positioning legally safe + marketable hai.

---

## 1. ParakeetAI Teardown — Humein Kya Banana Hai

ParakeetAI (parakeet-ai.com, checked 20 Oct 2026) ke verified features aur humara Phase mapping:

| Parakeet Feature | Kaise kaam karta hai | Humara Phase |
|---|---|---|
| Auto Answer | Call audio live transcribe → question detect → answer suggest | Phase 1 (core) |
| Resume/CV + Documents | Uploaded CV, docs, JD aur Instructions (20,000 chars tak) se personalized answers | Phase 1 |
| Live Transcript | Streaming speech-to-text, speaker-wise | Phase 1 |
| AI Notes | Call ke baad summary, action items, decisions | Phase 1 |
| Model Choice | GPT / Claude / Gemini models ka dropdown, fast default | Phase 1 (router) |
| Mock Interview | AI interviewer ke saath practice call | Phase 2 |
| Coding Support | Screenshot capture → vision model → code + explanation | Phase 2 |
| Undetectable Overlay | Desktop app screen-share/dock/task-manager me invisible | Phase 2 (Electron) |
| Auto-detect Meetings | Meeting start hote hi join prompt | Phase 2 |
| Phone Calls (Google Voice) | Browser session + phone audio routing | Phase 3 |
| 50+ Languages | Session language select, ek time par ek language | Phase 1 (EN + Hindi/Hinglish) |
| Pricing | Credits ($38/credit ≈ 2×30-min calls) ya $149.90/mo unlimited; 10 free 10-min sessions | §11 — hum India pricing karenge |

**Parakeet ki known kamzori (reviews se, Oct 2026):** Jab personal question ka answer documents me nahi hota, to wo candidate ki taraf se *story fabricate* kar deta hai. Hum isko §7 me explicitly fix karenge — ye humara quality differentiator hai.

**Scale signal:** Parakeet 1.5M+ users claim karta hai aur founders ke hisaab se $1M+/month revenue — category proven hai, demand real hai.

---

## 2. Humara Differentiation — India-First

Parakeet US-centric hai: USD pricing, English-first, Indian users ke liye mehenga. Humara wedge:

1. **₹ Pricing + UPI** — ₹499–₹999/month band, Parakeet ke $149.90 (≈₹13,000+) ke against no-brainer.
2. **Hinglish / code-switching support** — Indian interviews me English + Hindi mix hota hai. STT ko code-switching par test karenge (§5), answer language user select karega (English / Hinglish / Hindi).
3. **Indian interview patterns** — TCS/Infosys/Wipro HR rounds, service-company behavioral questions, fresher interviews ke liye ready templates + resume formats.
4. **WhatsApp-first onboarding/support** — Ahmad ke existing ecosystem ke saath fit.

---

## 3. System Architecture

```
┌────────────────────────── CLIENT ──────────────────────────┐
│  Web App (Chrome)              Desktop App (Electron)       │
│  • Mic + Tab/System audio      • System audio loopback      │
│  • Live session UI             • Invisible overlay window   │
│  • Dashboard, docs, billing    • Tray, hotkeys, auto-detect │
└──────────────┬──────────────────────────┬──────────────────┘
               │ WebSocket (audio chunks,  │
               │  transcript, answers)     │
┌──────────────▼──────────────────────────▼──────────────────┐
│  REALTIME GATEWAY (Node.js, separate service)               │
│  • Session manager (Redis state)                            │
│  • Audio fan-out → STT stream                               │
│  • Question detection + answer orchestration                │
│  • Credit metering (per-second ledger)                      │
└──┬───────────────┬──────────────────┬─────────────────────┘
   │               │                  │
   ▼               ▼                  ▼
 Deepgram      LLM Router        Context Service
 Nova-3        (fast default →   • Resume/JD chunks (pgvector)
 streaming     premium on        • Instructions (≤20k chars)
               demand)           • Conversation history window
   │               │                  │
┌──▼───────────────▼──────────────────▼─────────────────────┐
│  CORE PLATFORM (reuse: AI TITANS stack)                     │
│  Next.js 15 · Prisma · PostgreSQL · Clerk · Stripe          │
│  BullMQ/Redis (post-call notes, emails) · Upstash limits    │
└─────────────────────────────────────────────────────────────┘
```

**Key design decision:** Realtime gateway **alag Node service** hoga (Next.js ke andar nahi). Reason: WebSocket long-lived connections + audio streaming Next.js serverless model me fit nahi hota. Dashboard/API Next.js me, realtime alag — bilkul jaise AI TITANS me web + worker alag hain.

---

## 4. Realtime Pipeline — Dil Hai Product Ka

Har session ke andar ye loop chalta hai. **Target: question khatam hone se answer screen par ≤ 3 second.**

### 4.1 Audio Capture
- **Web (Phase 1):** `getUserMedia` (mic) + `getDisplayMedia` audio (Chrome tab/system audio). Do alag streams: **"Interviewer" channel** (tab/system) aur **"Me" channel** (mic) — isse diarization free me mil jati hai, speaker guess nahi karna padta.
- **Desktop (Phase 2):** Electron + native loopback (Windows WASAPI / macOS ScreenCaptureKit) bina kisi virtual driver ke.

### 4.2 Speech-to-Text (verified Oct 2026)
| Option | Streaming price | Latency | Note |
|---|---|---|---|
| **Deepgram Nova-3 (primary)** | ~$0.0058–0.0077/min | sub-300ms first token | Diarization, punctuation, keyterm prompting built-in. $200 free credits to start |
| AssemblyAI Universal-Streaming | ~$0.0025–0.0075/min | ~300–600ms | Cost-sensitive fallback |
| OpenAI gpt-live-transcribe | $0.017/min | streaming | Mehenga; sirf agar single-vendor chahiye |
| Self-hosted Whisper | infra cost | variable | Phase 3 me volume aane par evaluate |

**Decision: Deepgram Nova-3.** Keyterm prompting se company names, tech terms (Kubernetes, PostgreSQL) ki accuracy badhegi. Hindi/Hinglish: Nova-3 multilingual stream par code-switching ka **Phase 0 me 10 real interview recordings par benchmark** mandatory hai — agar Hinglish WER kharab hua to fallback plan: do parallel streams (EN + HI) aur transcript merge. Ye risk §15 me track hai.

### 4.3 Question Detection (do layer)
1. **End-of-turn:** Deepgram ka endpointing (silence ~300–500ms) + transcript final segment.
2. **Question classifier:** Chhota fast model (ya heuristic + LLM combo) har final segment ko classify karta hai — `QUESTION / STATEMENT / FILLER`. Sirf QUESTION par answer trigger. "Me" channel ke segments kabhi trigger nahi honge.
3. **Manual trigger:** Hotkey / button — user khud bhi answer mang sakta hai (Parakeet me bhi hai), aur screenshot bhej sakta hai.

Debounce rule: ek question ke liye **ek hi answer generation**; agar interviewer follow-up bolta rahe to generation cancel + restart (stale answer screen par nahi dikhega).

### 4.4 Answer Generation
- **Default model: GPT-4o-mini class** ($0.15 in / $0.60 out per 1M tokens, verified Oct 2026) — fast + sasta. Alternatives router me: Gemini Flash (aur sasta), Claude Haiku (quality), premium models user-selectable jaise Parakeet karta hai.
- **Streaming response:** Token-by-token UI me render, taaki pehla useful line ~1 sec me dikhe, pura answer baad me complete ho.
- **Answer format (prompt-enforced):**
  - Pehli line: **seedha bolne layak answer** (2–3 sentences, first person, resume ki language me)
  - Neeche: bullet points / STAR structure (behavioral ke liye), code block (technical ke liye)
  - Max length cap — interview me lamba essay useless hai; 120–180 words default.
- **Context assembly (har question par):** system prompt (role, company, JD summary) + top-4 relevant resume/doc chunks (pgvector similarity) + pichle 6–8 transcript exchanges + user instructions. Total prompt ~3–4k tokens target.

### 4.5 Latency Budget (3 second ka hisaab)
| Stage | Budget |
|---|---|
| Audio chunk → Deepgram final transcript | 400–700ms |
| Question classification | 100–200ms |
| Context retrieval (pgvector) | 50–100ms |
| LLM first token | 400–800ms |
| Render | <50ms |
| **Pehla answer text screen par** | **~1.2–1.8s typical, ≤3s worst case** |

---

## 5. Tech Stack — Kya Reuse, Kya Naya

| Layer | Choice | Reuse? |
|---|---|---|
| Web app / dashboard / API | Next.js 15, React 19, TS, Tailwind | ✅ AI TITANS se seedha |
| Auth | Clerk | ✅ |
| DB | PostgreSQL + Prisma 6 | ✅ |
| Embeddings | **pgvector** (Postgres extension — alag vector DB nahi) | Naya, chhota |
| Realtime gateway | Node.js + `ws`, Redis session state | Naya service (worker pattern reuse) |
| Queue | BullMQ (notes generation, emails, doc parsing) | ✅ |
| STT | Deepgram Nova-3 streaming | Naya |
| LLM | Router: GPT-4o-mini (default), Gemini Flash, Claude Haiku, premium models optional | ✅ AI gateway pattern reuse |
| Desktop | Electron (Phase 2) — Tauri evaluate kiya, reject: system-audio + content-protection APIs Electron me mature hain | Naya |
| Billing | Stripe (cards) + **Razorpay (UPI) India ke liye** | Stripe ✅, Razorpay naya |
| File storage | S3-compatible (resume/docs/recordings) | ✅ pattern |
| Testing | Vitest + Playwright | ✅ |

**Monorepo structure (AI TITANS jaisa hi pnpm workspace):**
```
apps/web          → Next.js dashboard + session UI
apps/gateway      → realtime WebSocket service
apps/desktop      → Electron (Phase 2)
packages/ai       → LLM router, prompts, schemas (structured output)
packages/stt      → Deepgram client + transcript processing
packages/db       → Prisma schema + client
packages/billing  → credits ledger + Stripe/Razorpay
```

---

## 6. Data Model (Prisma sketch)

```prisma
model User        { id, clerkId, email, credits Decimal, plan, sessions[], documents[] }
model Session     { id, userId, mode (INTERVIEW | MEETING | MOCK), role, company,
                    jobDescription, instructions (≤20k chars), language,
                    modelChoice, status, startedAt, endedAt, billedSeconds,
                    transcriptSegments[], notes? }
model TranscriptSegment { id, sessionId, speaker (INTERVIEWER | USER | AI_INTERVIEWER),
                    text, isFinal, startMs, endMs, detectedQuestion Boolean }
model Answer      { id, sessionId, segmentId, question, answerText, model,
                    latencyMs, inputTokens, outputTokens, costUsd }
model Document    { id, userId, type (RESUME | JD | NOTES | PLAYBOOK), fileUrl,
                    parsedText, chunks[] }
model DocChunk    { id, documentId, text, embedding vector(1536) }  // pgvector
model SessionNotes{ id, sessionId, summary, actionItems Json, decisions Json, rating? }
model CreditLedger{ id, userId, delta, reason (SESSION_DEBIT | PURCHASE | FREE_GRANT | REFUND),
                    sessionId?, createdAt }   // append-only, kabhi update nahi
model Payment     { id, userId, provider (STRIPE | RAZORPAY), amountInr/Usd, status }
```

**Rule:** Credits hamesha `CreditLedger` se derive honge — balance field sirf cache hai. Ye AI TITANS ke Stripe webhook replay-protection wale pattern par hi banega.

---

## 7. Context & RAG — Answer Quality Yahi Se Aayegi

1. **Resume parsing:** Upload (PDF/DOCX) → text extract → structured parse (experience, projects, skills, **numbers/metrics alag se extract** — interview answers me numbers sabse zyada value dete hain).
2. **Chunking:** Section-wise chunks (per job, per project), har chunk embed → pgvector.
3. **Per-question retrieval:** Question embed → top-4 chunks + hamesha-pinned chunks (current role summary, JD key requirements).
4. **Anti-fabrication guard (Parakeet ki galti hum nahi karenge):**
   - Prompt rule: personal experience sirf resume/docs se; agar info nahi hai to answer me `[Not in resume — apne words me bolo]` marker ke saath generic framework do, **jhooti story mat banao**.
   - UI me resume-based lines aur generic lines visually alag (halka color difference) — user ko pata ho kya uska real hai.
5. **Instructions field:** Session create karte time free-text (company style, tone, "mere 5 saal ke experience ko highlight karo") — 20,000 char limit, Parakeet parity.

---

## 8. Coding Interview Module (Phase 2)

- **Screenshot trigger:** Hotkey → screen region capture → vision model (GPT-4o-mini vision / Gemini Flash) → problem parse.
- **Output format fixed:** Approach (1 line) → Code (user ki language: Java/Python/JS/C++) → Complexity → Bolne layak explanation (2–3 lines).
- LeetCode/HackerRank style problems par 20-problem test set se accuracy benchmark Phase 2 ke start me.

---

## 9. Mock Interview Module (Phase 2)

- AI interviewer: role + company select → LLM question bank + follow-up logic → TTS se bolega (Deepgram Aura / OpenAI TTS) → user bolega → STT → per-answer scoring (structure, relevance, confidence) → session-end report card.
- **Ye module marketing engine hai:** pehla mock free = Parakeet ki tarah top-of-funnel. Share-able report card = viral loop.

---

## 10. Desktop App & "Invisible" Overlay (Phase 2) — Verified Technique

Electron ka official API hai, koi hack nahi:

```ts
win.setContentProtection(true)   // ← core
win.setAlwaysOnTop(true, 'screen-saver')
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
win.setIgnoreMouseEvents(true, { forward: true })  // click-through mode
```

- **macOS:** `setContentProtection(true)` window ki `sharingType = NSWindowSharingNone` set karta hai — Zoom/Meet/Teams/QuickTime capture me window aati hi nahi.
- **Windows:** andar se `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` (Win10 2004+) — capture se poori tarah exclude; purane Windows par black rectangle fallback.
- **Saath me:** frameless + transparent window, dock/taskbar icon hide option, global hotkeys (answer trigger, screenshot, panic-hide), tray-only presence.
- **Limits (honest):** Kuch proctoring software (jo khud ko screen-capture se neeche hook karta hai) isko detect kar sakta hai; browser-based full-screen proctoring alag category hai. Hum "invisible on standard screen-share" claim karenge, "100% undetectable everywhere" jaisa overclaim nahi — Parakeet ki refund complaints ka ek reason yahi overclaim hai.
- **Auto-detect meetings:** Calendar (Google) + running-process check (Zoom/Meet/Teams window titles) → "Meeting detect hua, session start karun?" prompt.

---

## 11. Billing & Unit Economics — Numbers Check Kiye Hue

### Per-session cost (30-min interview, ~20 questions)
| Item | Calculation | Cost |
|---|---|---|
| STT (Deepgram streaming) | 30 min × ~$0.0077 | **$0.23** |
| LLM answers | 20 × (3.5k in + 250 out tokens) @ GPT-4o-mini | **~$0.013** |
| Notes generation | 1 call, ~8k tokens | ~$0.003 |
| Infra (gateway, DB, storage) | amortized | ~$0.03 |
| **Total COGS / 30-min session** | | **≈ $0.28 (~₹24)** |

### Proposed India pricing (Parakeet ke $38/credit ke against)
| Plan | Price | Includes | Gross margin |
|---|---|---|---|
| Free | ₹0 | 2 × 10-min sessions + 1 mock | acquisition cost ~₹16/user |
| Starter | ₹499 | 5 × 30-min credits | ~88% |
| Pro (hero plan) | ₹999/mo | Unlimited sessions* (fair-use 20 hrs) | ~85%+ |
| One-shot | ₹299 | 1 × 60-min "kal interview hai" pack | ~92% |

*Fair-use cap infra abuse rokne ke liye; copy me "unlimited" Parakeet style rahega, terms me cap clear hoga.

**Ledger design:** Session start par credit hold → har 60 sec metering tick → end par settle. Beech me disconnect ho to sirf used seconds ka debit. Free sessions bhi ledger se jayenge (reason=FREE_GRANT) taaki abuse tracking rahe.

---

## 12. APIs & Env (naya hissa sirf)

```
DEEPGRAM_API_KEY=
OPENAI_API_KEY=  ANTHROPIC_API_KEY=  GOOGLE_AI_API_KEY=   (LLM router)
RAZORPAY_KEY_ID= RAZORPAY_KEY_SECRET=                      (Stripe already hai)
REALTIME_GATEWAY_URL=  REDIS_URL=                          (already hai pattern)
```
Saari keys server-side hi rahengi; browser ko Deepgram ke liye **short-lived temporary token** gateway se milega, asli key kabhi client par nahi.

---

## 13. Security, Privacy & Compliance

- **Consent-first:** Session start par recording/transcription consent checkbox + meeting me use ke liye user ki responsibility disclaimer. India DPDP Act 2023 ke hisaab se data-processing notice.
- **Data:** Audio by-default **store nahi** hoga (sirf transcript) — storage cost bhi bachega, privacy story bhi strong hogi. Recording opt-in only.
- **Encryption:** TLS everywhere, docs/recordings at-rest encrypted, signed URLs.
- **Employer opt-out:** Parakeet ki tarah ek public page jahan companies apna domain block-list kar sakti hain — trust + press ke liye gold hai.
- **Retention:** Free users ka transcript 30 din, paid ka jab tak account hai; one-click delete-all.

---

## 14. Roadmap

### Phase 0 — Validation (3–4 din)
- Landing page + waitlist (Next.js, existing pattern) — "India ka pehla Hinglish interview copilot"
- Hinglish STT benchmark: 10 real mock recordings par Deepgram test — **go/no-go gate**
- 20 user interviews (fresher/job-seeker communities) — pricing validate

### Phase 1 — Web MVP (2–3 hafte)
| Week | Deliverable |
|---|---|
| W1 | Monorepo scaffold, auth, Prisma schema, docs upload + resume parse + pgvector |
| W2 | Realtime gateway: audio → Deepgram → transcript UI; question detection v1 |
| W3 | Answer engine (streaming, format, anti-fabrication), notes generation, credits ledger + Stripe/Razorpay, free-tier limits |
| — | **Exit criteria:** Ek real 30-min mock call end-to-end, answer latency ≤3s, cost ≤₹30/session |

### Phase 2 — Desktop + Coding + Mock (3–4 hafte)
Electron overlay (content protection), system audio, hotkeys, meeting auto-detect, screenshot coding module, mock interview + report card, model picker UI.

### Phase 3 — Scale (ongoing)
Mobile web session, phone-call support, team/sales-call mode, self-hosted STT evaluation (volume >14,000 audio-hrs/month par hi fayda), affiliate/creator program.

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hinglish code-switching par STT accuracy kharab | Core experience fail | Phase 0 benchmark gate; dual-stream fallback; keyterm prompting |
| LLM answer latency spikes | >3s = product dead | Fast default model, streaming render, generation cancel-on-new-question, regional gateway |
| Proctoring/platform detection changes | Desktop feature degrade | Sirf standard screen-share invisibility claim; permitted-use positioning |
| Personal-answer fabrication | User interview me fas sakta hai | §7 anti-fabrication guard + visual separation |
| API price changes | Margin hit | LLM/STT dono provider-agnostic abstraction; router se one-line switch |
| Payment refunds (Parakeet ki top complaint) | Chargebacks, reputation | Clear credit terms, unused-credit auto-refund 7 din, session-fail par auto credit-back |

---

## 16. Decisions — LOCKED (20 Oct 2026, Ahmad)

1. **Product name: `Rev.perakit.ai`** (Ahmad ki di hui spelling hi use hogi).
2. **Launch audience: Experienced IT pehle** (zyada ARPU; freshers baad me free mock se aayenge).
3. **Sequence: Phase 0 pehle** — Landing page + Hinglish STT benchmark (4 din), phir Phase 1 scaffold. STT benchmark = go/no-go gate.

---

*Sources checked Oct 2026: parakeet-ai.com (features), Deepgram Nova-3 published streaming rates (~$0.0058–0.0077/min), GPT-4o-mini published rates ($0.15/$0.60 per 1M), Electron `setContentProtection` docs (macOS NSWindowSharingNone / Windows WDA_EXCLUDEFROMCAPTURE), Parakeet pricing reviews ($38/credit, $149.90/mo). Prices change hote rehte hain — Phase 1 start par ek baar phir verify karenge.*

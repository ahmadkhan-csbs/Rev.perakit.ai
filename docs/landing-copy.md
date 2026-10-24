# Rev.perakit.ai — Landing Page Copy & Structure (Phase 0)
**Audience:** Experienced IT professionals (2–10 yrs) preparing for / attending interviews
**Goal:** Waitlist signups. Ek hi CTA poore page par: "Join the Waitlist"
**Tone:** Hinglish accents headline me, body mostly English (IT audience isi mix me padhta hai). Confidence, no overclaim.

---

## 1. Hero
- **Logo/Name:** Rev.perakit.ai
- **Badge:** 🇮🇳 India's first Hinglish-ready AI interview copilot — launching soon
- **H1:** Interview me kabhi blank mat ho.
- **Sub:** Rev listens to your live interview, understands the question, and shows you a ready-to-speak answer built from YOUR resume — in under 3 seconds. Technical, HR, Hinglish mix — sab handle hota hai.
- **CTA:** Join the Waitlist (free mock interview on launch)
- **Micro-trust line:** No card. Pehla mock interview free. English + Hinglish.
- **Visual:** Live session UI ka screenshot-style mock — left: interviewer question transcript, right: answer card (bold pehli line + bullets)

## 2. Problem strip (3 cards)
1. **"Blank ho gaya."** — Sab aata tha, us moment par yaad nahi aaya.
2. **"Resume alag, jawab alag."** — Generic answers interviewer ko turant samajh jaate hain.
3. **"$38 per session?"** — Foreign tools mehenga pricing, INR me payment jhanjhat.

## 3. How it works (3 steps)
1. **Setup (2 min):** Resume upload karo, job description paste karo. Bass.
2. **Live call:** Rev question sunta hai, transcript banata hai, tumhare experience se answer ready karta hai — 3 second ke andar.
3. **After the call:** Full transcript + AI notes + kahan improve karna hai — sab saved.

## 4. Features (6)
- ⚡ **Real-time answers** — question khatm, jawab ready
- 📄 **Resume-based, hamesha** — answers tumhare real projects & numbers se (fabricated stories kabhi nahi)
- 🗣️ **Hinglish ready** — mixed Hindi-English questions bhi samajhta hai
- 💻 **Coding rounds** — screenshot bhejo, approach + code + bolne-wala explanation
- 🎤 **Free mock interviews** — AI interviewer ke saath practice, report card included
- 🔒 **Private by design** — audio store nahi hota; sirf transcript, wo bhi tumhare control me

## 5. Demo answer card (static example, page par dikhega)
> **Q:** "Tell me about a challenging production issue you solved."
> **Rev suggests:** "At [Company], our payment API latency spiked to 4 seconds during peak. I traced it to an N+1 query, added eager loading and a Redis cache — latency came down to 300ms, a 92% improvement."
> *(Neeche chhoti line: Yeh answer tumhare resume ke real project se banega.)*

## 6. Pricing teaser (launch pricing — locked plan se)
| Plan | Price | For |
|---|---|---|
| Free | ₹0 | 2 live sessions (10 min) + 1 mock |
| Starter | ₹499 | 5 × 30-min session credits |
| Pro | ₹999/mo | Unlimited sessions* — "kal interview hai" tension khatam |
| One-shot | ₹299 | Ek 60-min interview pack |

*UPI / cards accepted. Unused credits par 7-din auto-refund.*

## 7. FAQ (5)
1. **Kya ye har interview me use kar sakta hoon?** — Jahan AI assistance allowed/permitted ho, wahan ke liye bana hai. Mock interviews, practice, aur permitted rounds ke liye best hai. Company ke rules hamesha pehle check karo.
2. **Hinglish chalega?** — Haan. Session language English ya Hinglish select karo.
3. **Mera resume/data safe hai?** — Audio store nahi hota. Documents encrypted; one-click delete-all kabhi bhi.
4. **Coding round me kaam karega?** — Haan, screenshot-based code help launch ke baad Phase 2 me (landing par "coming soon" tag ke saath).
5. **Payment kaise?** — UPI, cards — INR pricing, koi forex jhanjhat nahi.

## 8. Waitlist form
Fields: **Name · Email ya WhatsApp number · Current role (dropdown: Backend / Frontend / Full-stack / Data / DevOps / Other) · Experience (dropdown: 2–5 yrs / 5–10 yrs / 10+)**
Submit par message: "You're in! 🎉 Launch par pehla mock interview tumhara free hoga. WhatsApp par update milega."

## 9. Footer
- Permitted-use line: "Rev is built for interviews and calls where AI assistance is permitted. Always follow your employer's rules."
- Employer opt-out link · Privacy · Terms · Contact

---

### Build notes (jab build hoga tab ke liye)
- Dark theme, ek accent color (electric green/parrot 🦜 palette — naam se match)
- Mobile-first (waitlist traffic WhatsApp/Instagram se aayega)
- Page load < 2s: static page, koi heavy framework nahi chahiye landing ke liye
- Analytics: sirf page-view + form-submit events (privacy-first)

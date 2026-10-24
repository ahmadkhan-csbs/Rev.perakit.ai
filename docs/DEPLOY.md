# 🚀 Deploy Guide — Rev.perakit.ai (sab FREE tier, ₹0)

App ke 2 hisse hain: **Gateway** (engine — Render par) aur **Web** (website — Vercel par).
Dono ke liye ek hi **GitHub account** lagega (free). Kul time: ~10–15 minute, pehli baar.

## Step 0 — Code GitHub par
1. github.com par account/login
2. Naya repo banao: `rev-perakit`
3. Is `code` folder ka saara content repo me push karo (ya ZIP se upload)

## Step 1 — Gateway → Render (free)
1. render.com → GitHub se signup (card nahi mangta)
2. **New → Blueprint** → apna `rev-perakit` repo select karo
   - Repo me `render.yaml` hai — gateway service apne aap ban jayegi
3. Do secret values bharna hain (dashboard khud puchega):
   - `DEEPGRAM_API_KEY` — tumhari Deepgram key
   - `GROQ_API_KEY` — tumhari Groq key (`gsk_...`)
4. Deploy dabao → 2–3 min me gateway live. URL milega jaisa:
   `https://rev-gateway.onrender.com`
   - WebSocket URL iska: `wss://rev-gateway.onrender.com`
   - ⚠️ Free tier: 15 min idle par service so jati hai; pehla session 30–50 sec me jagti hai. Demo ke liye theek hai; hamesha-jaagta chahiye to baad me ₹~600/mo wala plan (revenue ke baad).

## Step 2 — Web → Vercel (free)
1. vercel.com → GitHub se signup
2. **Add New → Project** → `rev-perakit` repo import karo
3. **Root Directory:** `apps/web` select karo (bahut important!)
4. Environment Variable add karo:
   - `NEXT_PUBLIC_GATEWAY_URL` = `wss://rev-gateway.onrender.com` (Step 1 wala URL, https ki jagah wss)
5. Deploy → tumhari website live: `https://rev-perakit.vercel.app`

## Step 3 — Test
- Link kholo → `/session` page → resume PDF do → Tab Audio jodo → bolo → jawab aana chahiye 🎉

## Baad me (revenue ke baad)
- Apna domain `Rev.perakit.ai` kharid kar Vercel me connect (10 min ka kaam)
- Render paid plan (gateway hamesha jaagta rahega) + Vercel Pro agar traffic badhe

## Note — abhi ka LIVE landing link
Landing page ka design dekhne ke liye ek temporary public link Muse storage par
host hai (48 ghante valid). Permanent landing bhi yahi Vercel deploy se aa jayegi
kyunki web app ki home page par wahi branding hai.

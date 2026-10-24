# 🦜 Rev.perakit.ai — 100% Invisible Real-Time AI Interview Copilot

<div align="center">

![Rev.perakit.ai Banner](https://img.shields.io/badge/Rev.perakit.ai-Next--Gen%20Interview%20Copilot-blueviolet?style=for-the-badge&logo=openai)
![Stealth](https://img.shields.io/badge/Stealth-100%25%20Invisible-00C853?style=for-the-badge&logo=windows)
![Latency](https://img.shields.io/badge/Latency-Sub--Second%20Streaming-FF6D00?style=for-the-badge&logo=fastify)
![Cost](https://img.shields.io/badge/Cost-%E2%82%B90%20Operating%20Model-00B0FF?style=for-the-badge)

**India's Premier Real-Time AI Interview Copilot with 100% Undetectable Stealth HUD, Multi-AI Mesh Failover, and AI Voice Mock Practice with Executive Speech Analytics.**

[Key Features](#-key-features) • [Stealth Architecture](#-100-invisible-stealth-architecture) • [Quick Start](#-quick-start) • [Shortcuts](#-global-hotkey-cheatsheet) • [Architecture](#-monorepo-architecture) • [Environment Config](#-environment-configuration)

</div>

---

## 🌟 Overview

**Rev.perakit.ai** is built for candidates facing high-stakes technical, coding, and behavioral interviews (Google, Amazon, Microsoft, Top Indian Product Startups & MNCs).

Unlike typical interview tools that require awkward tab-sharing, manual typing, or obvious mouse movements, **Rev.perakit.ai runs as a completely undetectable floating HUD directly over your screen**—silent, invisible on Zoom/Teams screen shares, and controllable entirely through discreet global keyboard shortcuts.

---

## 🚀 Key Features

### 1. 👁️ Auto LeetCode & Coding Screen Snip (`Ctrl + Alt + S`)
- **Zero Copy-Pasting:** Hit `Ctrl + Alt + S` on any LeetCode, HackerRank, or Codeforces problem.
- **Multimodal Gemini Vision:** Silently grabs the question region in the background and delivers:
  - 💡 **Speaking Pitch:** 2–3 line executive explanation to speak naturally to the interviewer before writing code.
  - 💻 **Optimal Clean Code:** Production-grade Python, Java, C++, or JavaScript solution.
  - ⏱️ **Time & Space Complexity:** Big-$O$ analysis ($O(N)$, $O(1)$) with dry-run edge cases.

### 2. 🎯 Webcam Teleprompter (`Alt + T`)
- **Natural Eye-Contact Mode:** Floats a slim, transparent prompter bar **directly beneath your physical webcam lens** at the very top of your screen.
- **Auto-Scrolling Bullets:** Answers auto-scroll at a natural human speaking pace (130–150 words per minute).
- **Impact:** The interviewer sees you looking directly into the camera with effortless confidence.

### 3. 🔊 Windows Virtual Audio Loopback (Zero Tab-Share Required)
- **Silent Audio Capture:** Desktop app uses Windows WASAPI system loopback.
- **No Browser Sharing Popups:** Silently captures audio from Zoom, Microsoft Teams, Google Meet, or Slack without requesting screen or tab audio permission.

### 4. 💼 STAR Method HR & Behavioral Matcher (`Alt + B`)
- **Resume-Grounded Answers:** Automatically parses the candidate's uploaded resume and frames behavioral answers using the **STAR** framework:
  - **S (Situation):** Specific company context & business challenge.
  - **T (Task):** The candidate's explicit ownership and goal.
  - **A (Action):** The technical and leadership solution implemented.
  - **R (Result):** Quantifiable metrics (e.g., *"reduced latency by 38%"*, *"scaled to 5M DAU"*).

### 5. ⚡ Quick Hotkey Actions (Panic & Prompts)
Candidate controls the HUD completely via keyboard without touching the mouse:
- `Alt + S` : **"Simpler Banao"** — Condenses complex answer into a punchy 2-line verbal response.
- `Alt + D` : **"Deep Dive"** — Internal system design, trade-offs, and architecture depths.
- `Alt + C` : **"Only Code"** — Strips all conversational text and outputs pure, clean code.
- `Alt + Z` : **"Panic Clear"** — Instantly blanks out the HUD if someone walks up behind you.
- `Alt + X` : **"Click-Through Toggle"** — Makes the window mouse-transparent so clicks pass straight to the IDE/Browser underneath.
- `Alt + H` : **"Panic Hide / Show"** — Toggles HUD visibility instantly.
- `Alt + Up / Down` : Adjust HUD opacity on the fly (20% to 100%).

### 6. 🛡️ Multi-AI Zero-Downtime Fallback Mesh
Never get stuck with a rate-limit or downtime during a live interview:
- **Primary:** Groq Llama-3.3-70b / GPT-OSS-120b (ultra-fast sub-200ms TTFT).
- **Secondary:** Google Gemini 3.1 Flash Lite (calibrated fallback with zero thinking overhead).
- **Tertiary:** Cerebras Llama-3.3-70b (sub-second inference).
- **Quaternary:** OpenRouter auto-routing.
- **Circuit Breaker:** Autonomous watchdog aborts sluggish engines within 1800ms and seamlessly switches without dropping the candidate's stream.

### 7. 🗣️ AI Voice Mock Interviewer with Executive Analytics (`/mock`)
Practice before the real interview with a full voice-driven AI Bar Raiser:
- **Natural Voice TTS:** AI asks realistic behavioral and technical questions verbally.
- **Auto-Recording:** Automatically listens and transcribes candidate answers as soon as the AI finishes speaking.
- **Post-Session Analytics Dashboard (3 Hero Cards):**
  1. 📊 **Technical Confidence Score (/100):** Comprehensive assessment with strengths & priority growth areas.
  2. ⏱️ **Speaking Pace Meter (WPM):** Live indicator calibrated to ideal 115–155 WPM range (Too Slow / Ideal / Too Fast).
  3. ⚠️ **Filler Words Counter:** Exact breakdown of filler words (`um`, `uh`, `like`, `basically`, `actually`, `you know`) with percentage speech penalty and coaching tips.
  4. 📄 **Printable PDF Export:** Single-click export of complete executive feedback for interview review.

---

## 🛡️ 100% Invisible Stealth Architecture

| Stealth Layer | Technique | How It Works |
|---|---|---|
| **Screen Share Invisibility** | `WDA_EXCLUDEFROMCAPTURE` | Windows DWM GPU hardware exclusion. Window is completely invisible on Zoom, MS Teams, and Google Meet screen shares. |
| **Taskbar Invisibility** | `skipTaskbar: true` | Electron window creates no icon in the Windows taskbar or Alt+Tab switcher. |
| **Process Disguise** | Task Manager Masking | Disguised as `Windows Audio Enhancement Service` so surveillance tools see normal OS audio drivers. |
| **Click-Through Transparency** | `setIgnoreMouseEvents` | Mouse clicks pass through the HUD to underlying editors (VS Code, Chrome, LeetCode). |
| **Tab Switching Immunity** | Floating Frameless HUD | Candidate never has to switch tabs or leave the coding test window. |

---

## ⌨️ Global Hotkey Cheatsheet

| Shortcut | Action | Description |
|---|---|---|
| `Ctrl + Alt + S` | **Auto LeetCode Snip** | Silent question snip ➔ Gemini Flash Vision ➔ Speaking pitch + code + complexity. |
| `Alt + T` | **Webcam Teleprompter** | Pins floating HUD directly under webcam lens with auto-scrolling bullets. |
| `Alt + S` | **Simpler 2-Liner** | Shortens answer to a crisp verbal response. |
| `Alt + D` | **Deep Dive** | Explains low-level architecture and system design internals. |
| `Alt + C` | **Only Code** | Removes commentary and outputs clean, indented code. |
| `Alt + B` | **STAR Method** | Frames behavioral response from uploaded resume context. |
| `Alt + X` | **Click-Through Mode** | Toggles mouse transparency on/off. |
| `Alt + Z` | **Panic Clear** | Instantly clears HUD content. |
| `Alt + H` | **Panic Hide/Show** | Toggles window visibility on/off. |
| `Alt + Up / Down` | **Opacity Control** | Increases or decreases HUD background opacity. |

---

## 🏗️ Monorepo Architecture

```
Rev.perakit.ai/
├── CHALAO.bat                      # 1-Click Browser Launcher (Gateway + Web)
├── CHALAO-INVISIBLE-DESKTOP.bat    # 1-Click Invisible Floating Overlay Launcher
├── CHALAO-BUILD-EXE.bat            # Windows Standalone .EXE Installer Builder
├── landing/                        # High-converting Landing Page (index.html + UPI QR)
├── docs/                           # Architecture, interview scripts & deployment guides
└── code/
    ├── apps/
    │   ├── web/                    # Next.js 14 App Router (Live HUD & Mock Interviewer)
    │   ├── desktop/                # Electron 45 Invisible HUD & WASAPI loopback
    │   └── gateway/                # Fastify + WebSocket Server (Deepgram STT & Engine)
    └── packages/
        ├── ai/                     # Multi-AI Fallback Mesh, Filler Analyzer & LeetCode Vision
        └── db/                     # Prisma ORM Schema & Database Models
```

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- Windows 10/11 (for full hardware stealth & WASAPI loopback support; macOS/Linux supported for web & gateway)

### 1. Clone Repository
```bash
git clone https://github.com/ahmadkhan-csbs/Rev.perakit.ai.git
cd Rev.perakit.ai
```

### 2. Configure Environment (`.env`)
Copy `.env.example` in `code/` to `.env`:
```bash
cd code
cp .env.example .env
```
Fill in your free API keys:
- **`DEEPGRAM_API_KEY`**: Free credit signup at [console.deepgram.com](https://console.deepgram.com/)
- **`GROQ_API_KEY`**: Free key at [console.groq.com](https://console.groq.com/)
- **`GEMINI_API_KEY`**: Free key at [aistudio.google.com](https://aistudio.google.com/)

### 3. Launch via 1-Click Batch Files (Windows)
- **Browser Mode:** Double-click `CHALAO.bat` (Starts Gateway + Web app on `http://localhost:3000/session`).
- **100% Invisible Desktop Mode:** Double-click `CHALAO-INVISIBLE-DESKTOP.bat` (Launches the screen-share invisible floating HUD).
- **Build Standalone Windows EXE:** Double-click `CHALAO-BUILD-EXE.bat` (Generates portable setup in `code/apps/desktop/dist/`).

### 4. Manual Launch (Developer Mode)
```bash
# In code/ directory:
npm install

# Start Gateway (Port 8080)
npm run gateway

# Start Web App (Port 3000)
npm run web

# Start Electron Invisible Overlay
npm run desktop
```

---

## ⚙️ Environment Configuration

| Variable | Required | Free Tier Provider | Description |
|---|---|---|---|
| `DEEPGRAM_API_KEY` | **Yes** | [Deepgram](https://console.deepgram.com/) | Real-time Nova-2 streaming STT ($200 free credits, no CC). |
| `GROQ_API_KEY` | **Yes** | [GroqCloud](https://console.groq.com/) | Ultra-low latency primary answer engine (<200ms TTFT). |
| `GEMINI_API_KEY` | **Yes** | [Google AI Studio](https://aistudio.google.com/) | Multimodal Vision (LeetCode snip) & Zero-downtime mesh fallback. |
| `LLM_PROVIDER` | Optional | Default `mesh` | Set to `mesh`, `groq`, or `gemini`. |
| `CEREBRAS_API_KEY` | Optional | [Cerebras](https://cloud.cerebras.ai/) | Secondary ultra-fast mesh fallback. |
| `OPENROUTER_API_KEY`| Optional | [OpenRouter](https://openrouter.ai/) | Emergency fallback failover. |
| `GATEWAY_PORT` | Optional | Default `8080` | Real-time WebSocket server port. |
| `NEXT_PUBLIC_UPI_VPA`| Optional| Direct UPI | UPI address for QR billing (`ahmadkhankhan6840-1@okaxis`). |

---

## 💰 ₹0 Operating Cost Architecture

Rev.perakit.ai is specifically designed with a **zero-cost operating model**:
- **STT (Deepgram Nova-2):** Deepgram provides $200 free credits upon signup (sufficient for ~400+ full interview hours).
- **LLM Engine (Groq):** Generous free developer tier with high rate limits and sub-second generation.
- **Vision & Fallback (Google Gemini 2.5 Flash):** Google AI Studio provides 15 RPM free tier with multimodal capabilities.
- **Hosting / Local Deployment:** Runs 100% locally on the candidate's machine, eliminating cloud GPU hosting overhead.

---

## 👤 Author & Credits

- **Creator & Lead Developer:** **Ahmad Khan** ([@ahmadkhan-csbs](https://github.com/ahmadkhan-csbs))
- **Official Repository:** [https://github.com/ahmadkhan-csbs/Rev.perakit.ai](https://github.com/ahmadkhan-csbs/Rev.perakit.ai)

---

## ⚖️ License & Disclaimer

This project is licensed under the MIT License. It is intended for educational purposes, mock interview preparation, and real-time accessibility assistance.

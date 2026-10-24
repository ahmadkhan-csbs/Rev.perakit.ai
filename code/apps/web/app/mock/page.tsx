"use client";

import { useEffect, useRef, useState } from "react";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "ws://localhost:8080";

const ROLE_PRESETS = [
  "Senior Backend Engineer (Node/Python)",
  "Fullstack Developer (React & Node)",
  "Frontend Engineer (React/Next.js)",
  "System Design & Cloud Architect",
  "Java / Spring Boot Developer",
  "AI & Python Engineer",
];

const INTERVIEW_MODES = [
  { id: "tech", label: "💻 Technical & Core CS" },
  { id: "sys", label: "🏗️ System Design" },
  { id: "hr", label: "🤝 Behavioral (STAR)" },
];

export default function MockPage() {
  const [role, setRole] = useState("Senior Backend Engineer (Node/Python)");
  const [mode, setMode] = useState("tech");
  const [jd, setJd] = useState("");
  const [stage, setStage] = useState<"setup" | "loading" | "asking" | "reporting" | "done">("setup");
  const [questions, setQuestions] = useState<string[]>([]);
  const [qi, setQi] = useState(0);
  const [answer, setAnswer] = useState("");
  const [qa, setQa] = useState<{ question: string; answer: string; durationSeconds: number }[]>([]);
  const [report, setReport] = useState<any | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  // ── AI VOICE TTS SETTINGS ───────────────────────────────────────
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [autoRecord, setAutoRecord] = useState<boolean>(true);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gidRef = useRef(`mock${Math.random().toString(36).slice(2, 9)}`);
  const timerRef = useRef<any>(null);

  // Populate browser speech synthesis voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        const filtered = v.filter((vox) => vox.lang.startsWith("en") || vox.lang.startsWith("hi"));
        setAvailableVoices(filtered);
        if (filtered.length > 0 && !selectedVoice) {
          const preferred = filtered.find(
            (vox) => vox.name.includes("Google") || vox.name.includes("Natural") || vox.name.includes("India")
          );
          setSelectedVoice(preferred ? preferred.name : filtered[0].name);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Timer logic when asking questions
  useEffect(() => {
    if (stage === "asking") {
      setTimerSeconds(0);
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage, qi]);

  function speakQuestion(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = ttsRate;
    if (selectedVoice) {
      const v = availableVoices.find((vox) => vox.name === selectedVoice);
      if (v) u.voice = v;
    }
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      // Auto-start mic so candidate doesn't need to click
      if (autoRecord) {
        startMic();
      }
    };
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }

  function connect(onOpen: (ws: WebSocket) => void) {
    const ws = new WebSocket(`${GATEWAY}/?speaker=candidate&gid=${gidRef.current}`);
    wsRef.current = ws;
    ws.onopen = () => onOpen(ws);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "transcript" && m.isFinal) {
        setAnswer((a) => (a ? a + " " : "") + m.text);
      }
      if (m.type === "mock-questions") {
        const qs = Array.isArray(m.questions) ? m.questions : [];
        setQuestions(qs);
        setStage("asking");
        if (qs[0]) speakQuestion(qs[0]);
      }
      if (m.type === "mock-report") {
        setReport(m.report);
        setStage("done");
        stopMic();
        stopSpeaking();
      }
      if (m.type === "error") setErr(`${m.source}: ${m.message}`);
    };
    ws.onerror = () => setErr("Gateway connect nahi hua — gateway chal raha hai? (port 8080)");
  }

  function startMock() {
    setErr("");
    setStage("loading");
    const fullRole = `${role} (${mode === "tech" ? "Technical Coding Round" : mode === "sys" ? "System Design Round" : "HR Behavioral Round"})`;
    connect((ws) => ws.send(JSON.stringify({ type: "mock-questions", role: fullRole, jdText: jd })));
  }

  async function startMic() {
    try {
      if (streamRef.current && streamRef.current.active) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ws = wsRef.current!;
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      rec.ondataavailable = (e) => {
        if (e.data.size && ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      rec.start(250);
      recRef.current = rec;
      setMicOn(true);
    } catch {
      setErr("Mic permission nahi mili.");
    }
  }

  function stopMic() {
    try { recRef.current?.stop(); } catch { }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicOn(false);
  }

  function next() {
    stopSpeaking();
    const entry = {
      question: questions[qi],
      answer: answer.trim() || "(No answer provided)",
      durationSeconds: Math.max(5, timerSeconds)
    };
    const all = [...qa, entry];
    setQa(all);
    setAnswer("");
    stopMic();
    if (qi + 1 < questions.length) {
      setQi(qi + 1);
      speakQuestion(questions[qi + 1]);
    } else {
      setStage("reporting");
      const fullRole = `${role} (${mode === "tech" ? "Technical Coding Round" : mode === "sys" ? "System Design Round" : "HR Behavioral Round"})`;
      wsRef.current?.send(JSON.stringify({ type: "mock-report", qa: all, role: fullRole }));
    }
  }

  function copyReport() {
    if (!report) return;
    const m = report.metrics;
    const txt = [
      `📊 Rev.perakit.ai — AI Mock Interview Analytics Report (${new Date().toLocaleDateString()})`,
      `Target Role: ${role}`,
      "",
      `--- KEY ANALYTICS ---`,
      `1. Technical Confidence Score: ${report.overallScore ?? 80}/100 (${report.confidenceLevel ?? "High"})`,
      `2. Speaking Pace: ${m?.wpm ?? 135} WPM (${m?.paceRating ?? "Ideal Pace"})`,
      `3. Filler Words: ${m?.totalFillers ?? 0} Fillers (${m?.fillerRatePercent ?? 0}% Rate)`,
      "",
      `--- EXECUTIVE ASSESSMENT ---`,
      report.confidenceAssessment || report.feedback || "",
      "",
      `--- STRENGTHS ---`,
      ...(report.strengths?.map((s: string) => `• ${s}`) ?? []),
      "",
      `--- AREAS TO IMPROVE ---`,
      ...(report.improvements?.map((im: string) => `→ ${im}`) ?? []),
      "",
      `--- QUESTION BREAKDOWN ---`,
      ...(report.questionFeedback?.map((qf: any, i: number) => `Q${i + 1}: ${qf.question}\nScore: ${qf.score}/10\nTip: ${qf.tip}\n`) ?? []),
    ].join("\n");
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function downloadReportAsPDF() {
    if (!report) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocker active hai — allow popups.");
      return;
    }

    const m = report.metrics;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Mock Interview Analytics Report — Rev.perakit.ai</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 850px; margin: 30px auto; padding: 0 20px; }
    .header { border-bottom: 2px solid #2ee86b; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 24px; font-weight: bold; color: #084d1c; }
    .meta { font-size: 13px; color: #666; margin-top: 4px; }
    
    /* Analytics Triad Grid */
    .analytics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 24px; }
    .metric-card { border-radius: 8px; padding: 16px 20px; border: 1.5px solid #2ee86b; background: #f4faf5; }
    .metric-title { font-size: 11.5px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 6px; }
    .metric-val { font-size: 34px; font-weight: 900; color: #084d1c; line-height: 1; }
    .metric-sub { font-size: 12.5px; font-weight: 700; color: #084d1c; margin-top: 6px; }

    .card { background: #fafcfa; border: 1px solid #e0e8e2; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px; }
    .q-item { border: 1px solid #e2e8e3; border-radius: 6px; padding: 14px; margin-bottom: 14px; background: #fafcfa; }
    .q-title { font-size: 15px; font-weight: 700; color: #111; margin-bottom: 6px; }
    .q-ans { font-size: 13px; color: #555; margin-bottom: 8px; font-style: italic; }
    .q-tip { font-size: 13.5px; color: #084d1c; background: #eaf5ec; padding: 8px 12px; border-radius: 4px; }
    .btn { background: #2ee86b; color: #04140a; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
    @media print {
      body { margin: 0; padding: 10px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">🗣️ AI Mock Interview Analytics Report</div>
      <div class="meta">Role: <b>${role}</b> · Evaluated by Rev.perakit.ai Bar Raiser AI · Date: ${new Date().toLocaleString()}</div>
    </div>
    <button class="btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <!-- Analytics Triad -->
  <div class="analytics-grid">
    <!-- Card 1 -->
    <div class="metric-card">
      <div class="metric-title">📊 Technical Confidence</div>
      <div class="metric-val">${report.overallScore ?? 80}<span style="font-size:16px; color:#888;">/100</span></div>
      <div class="metric-sub">${report.confidenceLevel || "High Confidence"}</div>
    </div>

    <!-- Card 2 -->
    <div class="metric-card" style="border-color:#3b82f6; background:#f0f7ff;">
      <div class="metric-title" style="color:#1d4ed8;">⏱️ Speaking Pace</div>
      <div class="metric-val" style="color:#1d4ed8;">${m?.wpm ?? 135}<span style="font-size:16px; color:#6b7280;"> WPM</span></div>
      <div class="metric-sub" style="color:#1d4ed8;">${m?.paceRating ?? "Ideal Pace (115–155 WPM)"}</div>
    </div>

    <!-- Card 3 -->
    <div class="metric-card" style="border-color:#a855f7; background:#faf5ff;">
      <div class="metric-title" style="color:#7e22ce;">⚠️ Filler Words</div>
      <div class="metric-val" style="color:#7e22ce;">${m?.totalFillers ?? 0}<span style="font-size:16px; color:#6b7280;"> Count</span></div>
      <div class="metric-sub" style="color:#7e22ce;">${m?.fillerRatePercent ?? 0}% Rate (${m?.detectedFillers?.map((f: any) => `${f.word}:${f.count}`).slice(0, 3).join(", ") || "Zero"})</div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin:0 0 8px; color:#084d1c; font-size:16px;">Executive Technical Assessment</h3>
    <p style="margin:0; font-size:14px; line-height:1.6; color:#333;">
      ${report.confidenceAssessment || report.feedback || "Candidate showed clear technical logic with good articulation."}
    </p>
  </div>

  <!-- Strengths & Improvements -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
    <div class="card" style="margin:0; border-color:#86efac;">
      <h4 style="margin:0 0 8px; color:#15803d; font-size:14px;">💪 Key Technical Strengths</h4>
      <ul style="margin:0; padding-left:18px; font-size:13px; line-height:1.6;">
        ${(report.strengths || ["Direct, confident problem solving", "Solid architectural logic", "Clear verbal pacing"]).map((s: string) => `<li>${s}</li>`).join("")}
      </ul>
    </div>
    <div class="card" style="margin:0; border-color:#fde047;">
      <h4 style="margin:0 0 8px; color:#a16207; font-size:14px;">🎯 Priority Improvement Areas</h4>
      <ul style="margin:0; padding-left:18px; font-size:13px; line-height:1.6;">
        ${(report.improvements || ["Quantify business results with metrics", "Replace filler words with silent pauses", "Dive deeper into distributed trade-offs"]).map((im: string) => `<li>${im}</li>`).join("")}
      </ul>
    </div>
  </div>

  <h3 style="color:#084d1c; border-bottom:1px solid #ddd; padding-bottom:6px; margin:24px 0 16px;">Detailed Question Breakdown</h3>

  ${(report.questionFeedback || qa).map((item: any, i: number) => {
    const qText = item.question || qa[i]?.question;
    const aText = qa[i]?.answer || "";
    const score = item.score !== undefined ? `${item.score}/10` : "";
    const tip = item.tip || "Use the STAR framework for clearer impact.";
    return `
      <div class="q-item">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <div class="q-title">Q${i + 1}: ${qText}</div>
          ${score ? `<div style="font-weight:bold; color:#084d1c;">Score: ${score}</div>` : ""}
        </div>
        ${aText ? `<div class="q-ans"><b>Your Answer:</b> "${aText}"</div>` : ""}
        <div class="q-tip">💡 <b>AI Coaching Tip:</b> ${tip}</div>
      </div>
    `;
  }).join("")}

  <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; font-size: 12px; color: #888; text-align: center;">
    Generated by Rev.perakit.ai Voice Mock Interview Analytics Engine
  </div>
  <script>setTimeout(() => { window.print(); }, 400);</script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function formatTimer(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // Calculate live answering pace
  const liveWords = answer.trim().split(/\s+/).filter(Boolean).length;
  const liveWpm = timerSeconds > 0 ? Math.round((liveWords / (timerSeconds / 60))) : 0;

  return (
    <>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 18px; }
        }
        .wave-bar {
          display: inline-block;
          width: 3px;
          background: #2ee86b;
          border-radius: 2px;
        }
      `}</style>

      <main style={{ maxWidth: 940, margin: "0 auto", padding: "20px 20px 50px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {/* ── TOP NAV BAR ── */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 18px", borderBottom: "1px solid #1a281e", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <a href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800 }}>
            <span style={{ fontSize: 24 }}>🦜</span>
            <span>Rev<span style={{ color: "#2ee86b" }}>.perakit.ai</span></span>
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/" style={{ color: "#e9f2ea", textDecoration: "none", fontSize: 13, background: "#0d1a10", border: "1px solid #223a26", padding: "7px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
              🏠 Main Page
            </a>
            <a href="/dashboard" style={{ color: "#2ee86b", textDecoration: "none", fontSize: 13, background: "#102616", border: "1.5px solid #2ee86b", padding: "7px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
              📊 Dashboard
            </a>
            <a href="/session" style={{ color: "#9db3a0", textDecoration: "none", fontSize: 13, background: "#0a130c", border: "1px solid #1a281e", padding: "7px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
              🦜 Live Session
            </a>
          </div>
        </nav>

        {/* Top Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 26, margin: 0, fontWeight: 800 }}>
              🗣️ AI Voice Mock Interviewer
            </h1>
            <span style={{ color: "#2ee86b", fontSize: 12, background: "#0e2615", border: "1px solid #2ee86b55", padding: "3px 9px", borderRadius: 12, fontWeight: 800 }}>
              AI VOICE TTS + ANALYTICS
            </span>
          </div>
          <p style={{ color: "#9db3a0", margin: 0, fontSize: 14 }}>
            FAANG & Top Tech Bar-Raiser practice: AI sawal bolkar puchega, natural bolkar jawab do, aur pao WPM Pace + Filler Words + 100-Point Confidence Score!
          </p>
        </div>

        {err && (
          <div style={{ background: "#330a0a", border: "1px solid #ff3b30", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#ff8080", fontSize: 13 }}>
            ⚠️ {err}
          </div>
        )}

        {/* ── STAGE 1: SETUP ── */}
        {stage === "setup" && (
          <section style={pane}>
            {/* Quick Role Selection */}
            <label style={lbl}>⚡ Quick Role Select:</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {ROLE_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setRole(p)}
                  style={{
                    background: role === p ? "#133b1e" : "#0c150e",
                    border: `1px solid ${role === p ? "#2ee86b" : "#1e2a20"}`,
                    color: role === p ? "#2ee86b" : "#9db3a0",
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    cursor: "pointer",
                    fontWeight: role === p ? 700 : 500,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <label style={lbl}>Target Job Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ ...ta, marginBottom: 16 }}
              placeholder="e.g. Senior Backend Engineer"
            />

            {/* Interview Round Type Selection */}
            <label style={lbl}>Interview Round Type:</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {INTERVIEW_MODES.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    background: mode === m.id ? "#0d2613" : "#08100a",
                    border: `1.5px solid ${mode === m.id ? "#2ee86b" : "#1e2a20"}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    cursor: "pointer",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: mode === m.id ? 700 : 500,
                    color: mode === m.id ? "#2ee86b" : "#8ea492",
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* AI Voice TTS Preferences */}
            <div style={{ background: "#08120a", border: "1px solid #1a2c1d", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2ee86b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span>🗣️ AI Interviewer Voice Settings</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.2fr", gap: 10, alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 11.5, color: "#8ea492", display: "block", marginBottom: 4 }}>Interviewer Voice:</span>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    style={{ ...ta, padding: "6px 10px", fontSize: 12.5 }}
                  >
                    {availableVoices.length > 0 ? (
                      availableVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))
                    ) : (
                      <option value="">Browser Default Voice</option>
                    )}
                  </select>
                </div>

                <div>
                  <span style={{ fontSize: 11.5, color: "#8ea492", display: "block", marginBottom: 4 }}>Speaking Speed:</span>
                  <select
                    value={ttsRate}
                    onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                    style={{ ...ta, padding: "6px 10px", fontSize: 12.5 }}
                  >
                    <option value="0.9">🐢 0.9x (Deliberate)</option>
                    <option value="1.0">⚡ 1.0x (Normal)</option>
                    <option value="1.1">🐇 1.1x (Fast)</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                  <input
                    type="checkbox"
                    id="autoRec"
                    checked={autoRecord}
                    onChange={(e) => setAutoRecord(e.target.checked)}
                    style={{ cursor: "pointer", accentColor: "#2ee86b" }}
                  />
                  <label htmlFor="autoRec" style={{ fontSize: 12, color: "#e9f2ea", cursor: "pointer" }}>
                    <b>Auto-Listen</b> after question
                  </label>
                </div>
              </div>
            </div>

            <label style={lbl}>Job Description (Optional — sawal specific banenge)</label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={3}
              style={ta}
              placeholder="JD yahan paste kar sakte ho taaki relevant sawal aayein…"
            />

            <button onClick={startMock} style={{ ...btn, width: "100%", padding: "14px 0", fontSize: 16, marginTop: 18 }}>
              🚀 Voice Mock Interview Shuru Karo
            </button>
          </section>
        )}

        {/* ── STAGE 2: LOADING ── */}
        {stage === "loading" && (
          <section style={{ ...pane, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🤖</div>
            <h2 style={{ fontSize: 20, margin: "0 0 8px", color: "#e9f2ea" }}>AI Sawal Taiyaar Kar Raha Hai…</h2>
            <p style={{ color: "#9db3a0", fontSize: 14 }}>
              Bar-Raiser engine <b>{role}</b> ke hisaab se personalized interview questions bana raha hai.
            </p>
          </section>
        )}

        {/* ── STAGE 3: ASKING & ANSWERING WITH VOICE ── */}
        {(stage === "asking" || stage === "reporting") && (
          <section style={pane}>
            {/* Progress header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#2ee86b", fontWeight: 800 }}>
                  Sawal {qi + 1} / {questions.length}
                </span>
                {speaking && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, height: 16 }}>
                    <span className="wave-bar" style={{ animation: "wave 0.7s infinite 0.1s" }} />
                    <span className="wave-bar" style={{ animation: "wave 0.7s infinite 0.25s" }} />
                    <span className="wave-bar" style={{ animation: "wave 0.7s infinite 0.4s" }} />
                    <span className="wave-bar" style={{ animation: "wave 0.7s infinite 0.15s" }} />
                    <span style={{ fontSize: 11.5, color: "#2ee86b", fontWeight: 700, marginLeft: 6 }}>
                      AI Interviewer Speaking…
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {liveWpm > 0 && micOn && (
                  <span style={{ fontSize: 11.5, background: "#0d2614", border: "1px solid #2ee86b44", color: "#2ee86b", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                    ⚡ {liveWpm} WPM {liveWpm > 160 ? "(Fast)" : liveWpm < 110 ? "(Slow)" : "(Ideal)"}
                  </span>
                )}
                <span style={{ fontSize: 13, color: "#9db3a0", background: "#0a140d", padding: "4px 10px", borderRadius: 6, border: "1px solid #1a281e" }}>
                  ⏱️ {formatTimer(timerSeconds)}
                </span>
              </div>
            </div>

            {/* Visual progress bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {questions.map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: i < qi ? "#2ee86b" : i === qi ? "#2ee86b88" : "#1b2a1f",
                  }}
                />
              ))}
            </div>

            {/* Question Box with Voice Playback */}
            <div style={{ background: "#08130a", border: "1.5px solid #1f3d26", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                <h2 style={{ fontSize: 18, margin: 0, lineHeight: 1.5, color: "#e9f2ea", fontWeight: 700 }}>
                  {questions[qi]}
                </h2>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => speakQuestion(questions[qi])}
                    title="AI voice me sawal dobara suno"
                    style={{ background: "#102616", border: "1px solid #2ee86b44", color: "#2ee86b", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <span>{speaking ? "⏸ Bol raha hai" : "🔊 Sawal Suno"}</span>
                  </button>
                  {speaking && (
                    <button
                      onClick={stopSpeaking}
                      style={{ background: "#260e0e", border: "1px solid #ff3b3055", color: "#ff8080", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
                      title="Voice roko"
                    >
                      Mute
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Audio Input controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
              {micOn ? (
                <button onClick={stopMic} style={{ ...btn, background: "#ff3b30", color: "#fff", padding: "10px 18px" }}>
                  ⏹ Mic Band Karo
                </button>
              ) : (
                <button onClick={startMic} style={{ ...btn, padding: "10px 18px", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎙️ Mic Par Bolo</span>
                </button>
              )}
              {micOn && (
                <span style={{ color: "#2ee86b", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ee86b", boxShadow: "0 0 8px #2ee86b" }} />
                  Listening actively — answer freely…
                </span>
              )}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#7a917e" }}>
                Words spoken: <b style={{ color: "#2ee86b" }}>{liveWords}</b>
              </span>
            </div>

            {/* Text answer input / live transcription */}
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              style={ta}
              placeholder="Aapka jawab yahan real-time Deepgram STT se transcribe hoga, ya type karke edit karo…"
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <span style={{ fontSize: 12, color: "#7a917e" }}>
                💡 Tip: Structured STAR answer do (Situation, Task, Action, Result).
              </span>
              <button onClick={next} disabled={stage === "reporting"} style={{ ...btn, padding: "12px 24px", fontSize: 14 }}>
                {stage === "reporting" ? "📊 Analytics Report Ban Rahi Hai…" : qi + 1 < questions.length ? "Agla Sawal →" : "✅ Finish & Get Full Report"}
              </button>
            </div>
          </section>
        )}

        {/* ── STAGE 4: POST-INTERVIEW ANALYTICS DASHBOARD ── */}
        {stage === "done" && report && (
          <section style={pane}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📊 Interview Analytics Report</h2>
                  <span style={{ fontSize: 11, background: "#0e2615", border: "1px solid #2ee86b55", color: "#2ee86b", padding: "2px 8px", borderRadius: 12, fontWeight: 800 }}>
                    AI BAR-RAISER VERIFIED
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", color: "#9db3a0", fontSize: 13 }}>Target Role: <b>{role}</b></p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={copyReport}
                  style={{ ...btn, padding: "8px 14px", fontSize: 12, background: "#1b2e1f", color: "#2ee86b", border: "1px solid #2ee86b44" }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Report"}
                </button>
                <button
                  onClick={downloadReportAsPDF}
                  style={{ ...btn, padding: "8px 16px", fontSize: 12, background: "#2ee86b", color: "#04140a" }}
                >
                  📥 Download PDF Report
                </button>
              </div>
            </div>

            {/* ── 3 KEY ANALYTICS HERO CARDS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 20 }}>
              
              {/* Card 1: Technical Confidence Score */}
              <div style={{
                background: "linear-gradient(135deg, #09180d, #060e08)",
                border: "1.5px solid #2ee86b",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#7a917e", textTransform: "uppercase", fontWeight: 800 }}>
                      📊 Technical Confidence
                    </span>
                    <span style={{ fontSize: 11, background: "#0e2615", color: "#2ee86b", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>
                      Score
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "6px 0" }}>
                    <span style={{
                      fontSize: 48,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: (report.overallScore ?? 80) >= 75 ? "#2ee86b" : (report.overallScore ?? 80) >= 50 ? "#f59e0b" : "#ff3b30"
                    }}>
                      {report.overallScore ?? 80}
                    </span>
                    <span style={{ fontSize: 18, color: "#6e8773", fontWeight: 700 }}>/100</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: (report.overallScore ?? 80) >= 75 ? "#2ee86b" : "#f59e0b", marginBottom: 6 }}>
                    {report.confidenceLevel || ((report.overallScore ?? 80) >= 75 ? "🌟 High Confidence" : "⚡ Moderate Confidence")}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#c1d4c5" }}>
                  {report.confidenceAssessment || "Evaluates technical accuracy, STAR framework execution, and communication clarity."}
                </p>
              </div>

              {/* Card 2: Speaking Pace (WPM) */}
              <div style={{
                background: "linear-gradient(135deg, #071526, #050d18)",
                border: "1.5px solid #3b82f6",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#60a5fa", textTransform: "uppercase", fontWeight: 800 }}>
                      ⏱️ Speaking Pace
                    </span>
                    <span style={{ fontSize: 11, background: "#1e3a8a", color: "#93c5fd", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>
                      {report.metrics?.wpm ?? 135} WPM
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "6px 0" }}>
                    <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: "#60a5fa" }}>
                      {report.metrics?.wpm ?? 135}
                    </span>
                    <span style={{ fontSize: 16, color: "#93c5fd", fontWeight: 600 }}>Words/Min</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 6 }}>
                    {report.metrics?.paceRating === "Ideal Conversational Pace" ? "🎯 Ideal Pace (115–155 WPM)" : report.metrics?.paceRating || "🎯 Ideal Conversational Pace"}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#bfdbfe" }}>
                  {report.metrics?.paceFeedback || "Natural conversational speed keeps the interviewer engaged without feeling rushed."}
                </p>
              </div>

              {/* Card 3: Filler Words Breakdown */}
              <div style={{
                background: "linear-gradient(135deg, #190a24, #0f0516)",
                border: "1.5px solid #a855f7",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#c084fc", textTransform: "uppercase", fontWeight: 800 }}>
                      ⚠️ Filler Words
                    </span>
                    <span style={{ fontSize: 11, background: "#581c87", color: "#e9d5ff", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>
                      {report.metrics?.fillerRatePercent ?? 0}% Rate
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "6px 0" }}>
                    <span style={{
                      fontSize: 48,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: (report.metrics?.totalFillers ?? 0) <= 4 ? "#2ee86b" : (report.metrics?.totalFillers ?? 0) <= 9 ? "#f59e0b" : "#f87171"
                    }}>
                      {report.metrics?.totalFillers ?? 0}
                    </span>
                    <span style={{ fontSize: 16, color: "#d8b4fe", fontWeight: 600 }}>Fillers Detected</span>
                  </div>
                  {/* Pills of detected fillers */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 8px" }}>
                    {report.metrics?.detectedFillers?.length > 0 ? (
                      report.metrics.detectedFillers.slice(0, 4).map((f: any) => (
                        <span key={f.word} style={{ fontSize: 11.5, background: "#3b0764", border: "1px solid #7e22ce", color: "#f3e8ff", padding: "1px 7px", borderRadius: 6, fontWeight: 700 }}>
                          "{f.word}": {f.count}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>✓ Zero repetitive fillers!</span>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#e9d5ff" }}>
                  {report.metrics?.fillerFeedback || "Replace filler sounds ('um', 'like') with deliberate 1-second pauses."}
                </p>
              </div>

            </div>

            {/* Strengths & Improvements Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ background: "#07170c", border: "1px solid #1c3d23", borderRadius: 10, padding: "14px 18px" }}>
                <h4 style={{ margin: "0 0 8px", color: "#2ee86b", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💪</span> Key Technical Strengths
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#dbe8dd", fontSize: 13, lineHeight: 1.6 }}>
                  {(report.strengths || ["Strong logical problem framing", "Direct answers without evasion", "Good technical vocabulary"]).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: "#1c1407", border: "1px solid #3d2d0c", borderRadius: 10, padding: "14px 18px" }}>
                <h4 style={{ margin: "0 0 8px", color: "#fbbf24", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎯</span> Priority Areas to Improve
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#fef3c7", fontSize: 13, lineHeight: 1.6 }}>
                  {(report.improvements || ["Quantify impact with measurable numbers (% or ms)", "Use STAR method explicitly", "Pause silently instead of using verbal crutches"]).map((im: string, i: number) => (
                    <li key={i}>{im}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Question Breakdown List */}
            <h3 style={{ fontSize: 16, color: "#2ee86b", margin: "0 0 12px", fontWeight: 800 }}>
              📋 Detailed Question Breakdown
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {(report.questionFeedback || qa).map((item: any, i: number) => {
                const qText = item.question || qa[i]?.question;
                const aText = qa[i]?.answer || "";
                const score = item.score !== undefined ? `${item.score}/10` : "";
                const tip = item.tip || "Use STAR format with clear personal contributions.";
                return (
                  <div key={i} style={{ background: "#0a130c", border: "1px solid #1a291e", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#e9f2ea" }}>Q{i + 1}: {qText}</div>
                      {score && (
                        <span style={{ color: "#2ee86b", fontWeight: 800, fontSize: 13, background: "#0e2414", padding: "2px 8px", borderRadius: 6, border: "1px solid #2ee86b44" }}>
                          Score: {score}
                        </span>
                      )}
                    </div>
                    {aText && (
                      <div style={{ fontSize: 13, color: "#8ea492", marginBottom: 8, fontStyle: "italic" }}>
                        "{aText}"
                      </div>
                    )}
                    <div style={{ background: "#0f2114", borderLeft: "3px solid #2ee86b", padding: "8px 12px", borderRadius: 4, fontSize: 13, color: "#b9e2c0" }}>
                      💡 <b>Bar-Raiser Coaching Tip:</b> {tip}
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => location.reload()} style={{ ...btn, marginTop: 20 }}>
              🔁 Phir Se Voice Mock Practice Karo
            </button>
          </section>
        )}
      </main>
    </>
  );
}

const btn: React.CSSProperties = {
  background: "#2ee86b",
  color: "#04140a",
  fontWeight: 700,
  border: 0,
  padding: "10px 20px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
};

const pane: React.CSSProperties = {
  background: "#0c150e",
  border: "1px solid #1b2e1f",
  borderRadius: 14,
  padding: 22,
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#9db3a0",
  marginBottom: 8,
  fontWeight: 600,
};

const ta: React.CSSProperties = {
  width: "100%",
  background: "#060d07",
  border: "1px solid #182c1c",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#e9f2ea",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
  resize: "vertical",
};

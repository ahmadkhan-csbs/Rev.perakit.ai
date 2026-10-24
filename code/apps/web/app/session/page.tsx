"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .filter(Boolean);
    full += strings.join(" ") + "\n";
  }
  return full.trim();
}

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "ws://localhost:8080";

function parseCodeSections(raw: string) {
  if (!raw) return null;

  let pitch = "";
  let code = "";
  let extractedLang = "";
  let complexity = "";
  let dryRun = "";

  // 1. Speaking Pitch
  const pitchMatch = raw.match(/### 💡 Speaking Pitch[^\n]*\n([\s\S]*?)(?=### 💻 Optimal Code|### ⏱️|$)/i);
  if (pitchMatch) {
    pitch = pitchMatch[1].trim();
  }

  // 2. Code Block
  const codeBlockMatch = raw.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    extractedLang = codeBlockMatch[1] || "";
    code = codeBlockMatch[2].trim();
  }

  // 3. Complexity
  const compMatch = raw.match(/### ⏱️[^\n]*\n([\s\S]*?)(?=### 🔍 Dry Run|###|$)/i);
  if (compMatch) {
    complexity = compMatch[1].trim();
  }

  // 4. Dry run
  const dryMatch = raw.match(/### 🔍 Dry Run[^\n]*\n([\s\S]*?)$/i);
  if (dryMatch) {
    dryRun = dryMatch[1].trim();
  }

  return { pitch, code, extractedLang, complexity, dryRun, isStructured: !!(pitch || code) };
}

function formatTeleprompterBullets(rawAnswer: string): { hook: string; bullets: string[] } {
  if (!rawAnswer) return { hook: "", bullets: [] };

  // If answer is in STAR format, structure naturally for camera eye-contact
  const star = parseStarSections(rawAnswer);
  if (star?.isStar) {
    const bullets: string[] = [];
    if (star.situation) bullets.push(`🟦 SITUATION: ${star.situation}`);
    if (star.task) bullets.push(`🟨 TASK: ${star.task}`);
    if (star.action) bullets.push(`🟩 ACTION: ${star.action}`);
    if (star.result) bullets.push(`🟪 RESULT: ${star.result}`);
    return {
      hook: star.situation ? `At my previous role/project: ${star.situation.slice(0, 85)}...` : "STAR Response:",
      bullets
    };
  }

  const clean = rawAnswer.replace(/\*\*/g, "").replace(/###/g, "").trim();
  const rawLines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  let hook = "";
  const bullets: string[] = [];
  for (const line of rawLines) {
    if (!hook && !line.startsWith("•") && !line.startsWith("-") && !line.match(/^\d+\./)) {
      hook = line;
    } else {
      const cleanedLine = line.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "");
      if (cleanedLine) bullets.push(cleanedLine);
    }
  }
  if (!hook && bullets.length > 0) {
    hook = bullets.shift() || "";
  }
  return { hook, bullets };
}

function parseStarSections(raw: string) {
  if (!raw) return null;

  // Patterns for [S - Situation], [T - Task], [A - Action], [R - Result]
  const sMatch = raw.match(/\*\*\[S\s*-\s*Situation\]\*\*[:\s]*([\s\S]*?)(?=\*\*\[T|\*\*\[A|\*\*\[R|$)/i);
  const tMatch = raw.match(/\*\*\[T\s*-\s*Task\]\*\*[:\s]*([\s\S]*?)(?=###|\*\*\[A|\*\*\[R|$)/i);
  const aMatch = raw.match(/\*\*\[A\s*-\s*Action\]\*\*[:\s]*([\s\S]*?)(?=###|\*\*\[R|$)/i);
  const rMatch = raw.match(/\*\*\[R\s*-\s*Result\]\*\*[:\s]*([\s\S]*?)$/i);

  if (sMatch || tMatch || aMatch || rMatch) {
    return {
      situation: sMatch?.[1]?.trim() || "",
      task: tMatch?.[1]?.trim() || "",
      action: aMatch?.[1]?.trim() || "",
      result: rMatch?.[1]?.trim() || "",
      isStar: true
    };
  }
  return null;
}

export default function SessionPage() {
  const [status, setStatus] = useState<"idle" | "live" | "error">("idle");
  const [lines, setLines] = useState<{ text: string; final: boolean; who?: string }[]>([]);
  const [interim, setInterim] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [instructions, setInstructions] = useState("");
  const [chunks, setChunks] = useState<number | null>(null);
  const [pdfMsg, setPdfMsg] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [tabLive, setTabLive] = useState(false);
  const [tabErr, setTabErr] = useState("");
  const [notes, setNotes] = useState<any | null>(null);
  const [limitMsg, setLimitMsg] = useState("");
  const [liveErr, setLiveErr] = useState("");
  const [wrapping, setWrapping] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [clickThrough, setClickThrough] = useState(false);
  const gidRef = useRef(`g${Math.random().toString(36).slice(2, 9)}`);
  const tabWsRef = useRef<WebSocket | null>(null);
  const tabRecRef = useRef<MediaRecorder | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);

  // Auto-scroll refs
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const answerEndRef = useRef<HTMLDivElement | null>(null);

  // Audio activity counters
  const [micPackets, setMicPackets] = useState(0);
  const [tabPackets, setTabPackets] = useState(0);

  // Model preference (Live Switcher)
  const [selectedModel, setSelectedModel] = useState<"auto" | "groq" | "gemini">("auto");

  function changeModel(m: "auto" | "groq" | "gemini") {
    setSelectedModel(m);
    const msg = JSON.stringify({ type: "set-model", model: m });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    }
    if (tabWsRef.current && tabWsRef.current.readyState === WebSocket.OPEN) {
      tabWsRef.current.send(msg);
    }
  }

  // Quick manual question testing
  const [manualInput, setManualInput] = useState("");

  // A1 — Coding Help & Auto Snip state
  const [codeAnalysis, setCodeAnalysis] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [codeLang, setCodeLang] = useState<string>("python");
  const [codeImagePreview, setCodeImagePreview] = useState<string>("");
  const [snipToast, setSnipToast] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  // ── TELEPROMPTER (Natural Eye Contact Mode) ───────────────────
  const [teleprompterMode, setTeleprompterMode] = useState(false);
  const [scrollSpeedWpm, setScrollSpeedWpm] = useState<number>(135);
  const [isScrolling, setIsScrolling] = useState<boolean>(true);
  const [prompterFontSize, setPrompterFontSize] = useState<number>(14.5);
  const prompterScrollRef = useRef<HTMLDivElement | null>(null);
  const prompterAnimRef = useRef<number | null>(null);

  function toggleTeleprompterMode(force?: boolean) {
    setTeleprompterMode((curr) => {
      const next = typeof force === "boolean" ? force : !curr;
      if ((window as any).revDesktop?.toggleTeleprompter) {
        (window as any).revDesktop.toggleTeleprompter(next);
      }
      return next;
    });
  }

  // Smooth speaking pace auto-scroll (110 - 160 WPM)
  useEffect(() => {
    if (!teleprompterMode || !isScrolling || !answer) {
      if (prompterAnimRef.current) cancelAnimationFrame(prompterAnimRef.current);
      return;
    }

    let lastTime = performance.now();
    // Calibrated: average 10 words per line, 26px line height
    const pxPerSecond = ((scrollSpeedWpm / 10) * 26) / 60;

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (prompterScrollRef.current) {
        prompterScrollRef.current.scrollTop += pxPerSecond * dt;
      }
      prompterAnimRef.current = requestAnimationFrame(step);
    };

    prompterAnimRef.current = requestAnimationFrame(step);
    return () => {
      if (prompterAnimRef.current) cancelAnimationFrame(prompterAnimRef.current);
    };
  }, [teleprompterMode, isScrolling, scrollSpeedWpm, answer]);

  // ── STAR METHOD HR & BEHAVIORAL MATCHER ────────────────────────
  const [starMode, setStarMode] = useState<boolean>(false);
  const [isStarAnswer, setIsStarAnswer] = useState<boolean>(false);

  function toggleStarMode(force?: boolean) {
    setStarMode((curr) => {
      const next = typeof force === "boolean" ? force : !curr;
      const msg = JSON.stringify({ type: "set-star-mode", starMode: next });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(msg);
      if (tabWsRef.current && tabWsRef.current.readyState === WebSocket.OPEN) tabWsRef.current.send(msg);
      return next;
    });
  }

  // ── QUICK HOTKEY ACTIONS (Panic & Prompts) ──────────────────────
  const [activeModifier, setActiveModifier] = useState<"simpler" | "deep_dive" | "only_code" | null>(null);

  // ── MULTI-AI ZERO-DOWNTIME FALLBACK MESH ────────────────────────
  const [liveEngine, setLiveEngine] = useState<string>("groq");
  const [meshFailoverMsg, setMeshFailoverMsg] = useState<string>("");

  async function triggerQuickAction(action: "simpler" | "deep_dive" | "only_code" | "panic_clear") {
    if (action === "panic_clear") {
      setQuestion("");
      setAnswer("");
      setLines([]);
      setInterim("");
      setShowCodePanel(false);
      setCodeAnalysis("");
      setCodeImagePreview("");
      setNotes(null);
      setLimitMsg("");
      setLiveErr("");
      setActiveModifier(null);
      setSnipToast("🧹 Screen Cleared (Panic Clear Alt+Z)");
      setTimeout(() => setSnipToast(""), 2200);

      const msg = JSON.stringify({ type: "panic-clear" });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(msg);
      if (tabWsRef.current && tabWsRef.current.readyState === WebSocket.OPEN) tabWsRef.current.send(msg);
      return;
    }

    setActiveModifier(action);
    const q = question || manualInput || (lines.length > 0 ? lines[lines.length - 1].text : "Interview Topic");
    const label = action === "simpler" ? "Simpler 2-Liner (Alt+S)" : action === "deep_dive" ? "Deep Dive (Alt+D)" : "Only Code (Alt+C)";
    setSnipToast(`⚡ Generating ${label}...`);
    setTimeout(() => setSnipToast(""), 3500);

    try {
      const ws = await ensureGatewayWs();
      ws.send(JSON.stringify({
        type: "quick-action",
        action,
        question: q,
        currentAnswer: answer
      }));
    } catch (err: any) {
      setLiveErr(`Quick action failed: ${err?.message}`);
    }
  }

  // ── STEALTH STATE ──────────────────────────────────────────────
  const [hidden, setHidden] = useState(false);
  const [camouflage, setCamouflage] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // Auto-scroll transcript to bottom when new line arrives
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, interim]);

  async function ensureGatewayWs(): Promise<WebSocket> {
    const existing = wsRef.current ?? tabWsRef.current;
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${GATEWAY}/?speaker=candidate&gid=${gidRef.current}`);
      wsRef.current = ws;
      ws.onopen = () => {
        sendContext(ws);
        ws.send(JSON.stringify({ type: "set-model", model: selectedModel }));
        ws.send(JSON.stringify({ type: "set-star-mode", starMode }));
        resolve(ws);
      };
      ws.onmessage = (e) => handleMsg(JSON.parse(e.data));
      ws.onerror = () => reject(new Error("Gateway connection failed"));
    });
  }

  async function sendCodeImageBase64(base64: string, mimeType: string = "image/png") {
    setCodeLoading(true);
    setCodeAnalysis("");
    setCodeImagePreview(`data:${mimeType};base64,${base64}`);
    setShowCodePanel(true);
    setSnipToast("⚡ Screenshot captured! Gemini 2.5 Flash analyzing problem...");
    setTimeout(() => setSnipToast(""), 5000);

    try {
      const ws = await ensureGatewayWs();
      ws.send(JSON.stringify({
        type: "code-help",
        imageBase64: base64,
        mimeType,
        language: codeLang
      }));
    } catch (err: any) {
      setCodeLoading(false);
      setLiveErr(`Gateway connect nahi hua: ${err?.message}`);
    }
  }

  async function triggerScreenSnip() {
    // 1. If running inside Electron desktop app with OS capture
    if ((window as any).revDesktop?.captureScreen) {
      try {
        setSnipToast("📸 Capturing primary screen silently...");
        const res = await (window as any).revDesktop.captureScreen();
        if (res && res.success && res.imageBase64) {
          sendCodeImageBase64(res.imageBase64, "image/png");
        } else {
          setLiveErr(`Screen capture error: ${res?.error || "Capture failed"}`);
        }
      } catch (err: any) {
        setLiveErr(`Screen capture exception: ${err?.message}`);
      }
      return;
    }

    // 2. In browser: if tab stream has active video track, grab current frame instantly
    try {
      if (tabStreamRef.current && tabStreamRef.current.getVideoTracks().length > 0) {
        const videoTrack = tabStreamRef.current.getVideoTracks()[0];
        const video = document.createElement("video");
        video.srcObject = new MediaStream([videoTrack]);
        video.muted = true;
        await video.play();
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        sendCodeImageBase64(base64, "image/png");
        return;
      }

      // 3. Otherwise trigger 1-click display media snip
      setSnipToast("📸 Screen / Tab select karo snip ke liye...");
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach((t) => t.stop());
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      sendCodeImageBase64(base64, "image/png");
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") {
        setLiveErr(`Screen capture nahi hua: ${e?.message}`);
      }
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const desktop = !!(window as any).revDesktop || window.location.search.includes("overlay=true");
      setIsDesktop(desktop);
      if ((window as any).revDesktop?.onStealthStatus) {
        (window as any).revDesktop.onStealthStatus((status: any) => {
          setClickThrough(status.clickThrough);
        });
      }
      // Listen for Teleprompter Eye-Contact mode from Electron
      if ((window as any).revDesktop?.onTeleprompterStatus) {
        (window as any).revDesktop.onTeleprompterStatus((status: any) => {
          setTeleprompterMode(status.isTeleprompter);
        });
      }
      // Listen for silent hotkey snip from Electron main process
      if ((window as any).revDesktop?.onAutoScreenSnip) {
        (window as any).revDesktop.onAutoScreenSnip((data: any) => {
          if (data?.imageBase64) {
            sendCodeImageBase64(data.imageBase64, "image/png");
          }
        });
      }
      // Listen for Quick Hotkey Actions from Electron (Alt+S, Alt+D, Alt+C, Alt+Z)
      if ((window as any).revDesktop?.onQuickAction) {
        (window as any).revDesktop.onQuickAction((data: any) => {
          if (data?.action) {
            triggerQuickAction(data.action);
          }
        });
      }
    }
  }, [codeLang]);

  // Global Keyboard Shortcuts (Alt+H panic hide & Ctrl+Alt+S coding snip & Alt+T teleprompter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setHidden((v) => !v);
      }
      // Alt+T: Teleprompter Eye-Contact toggle
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        toggleTeleprompterMode();
      }
      // Alt+B: STAR Method HR & Behavioral Matcher toggle
      if (e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleStarMode();
      }
      // Space: Pause/Resume teleprompter auto-scroll
      if (e.code === "Space" && teleprompterMode) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          setIsScrolling((s) => !s);
        }
      }
      // Alt+Z: Panic Clear (Screen turant blank ho jaye)
      if (e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        triggerQuickAction("panic_clear");
      }
      // Alt+S: Simpler Banao (Short 2-liner version)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        triggerQuickAction("simpler");
      }
      // Alt+D: Deep Dive (Advanced system design / internal details)
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        triggerQuickAction("deep_dive");
      }
      // Alt+C: Only Code (Faltu text hatakar sirf code dikhaye)
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        triggerQuickAction("only_code");
      }
      // Silent LeetCode screen snip hotkey: Ctrl+Alt+S or Cmd+Alt+S
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        triggerScreenSnip();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            sendCodeImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, [codeLang]);

  function openPopup() {
    const w = 420, h = 680;
    const left = window.screen.width - w - 20;
    const top = window.screen.height - h - 60;
    const p = window.open(
      window.location.href,
      "rev-stealth",
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    if (p) { popupRef.current = p; p.focus(); }
    else alert("Popup blocked! Browser mein popup allow karo.");
  }

  function sendContext(ws: WebSocket) {
    if (resume || jd || instructions) {
      ws.send(JSON.stringify({ type: "context", resumeText: resume, jdText: jd, instructions }));
    }
  }

  function handleMsg(m: any) {
    if (m.type === "context-ready") setChunks(m.chunks);
    if (m.type === "transcript") {
      if (m.isFinal) {
        setLines((l) => [...l, { text: m.text, final: true, who: m.channel ?? "INTERVIEWER" }]);
        setInterim("");
      } else {
        setInterim(m.text);
      }
    }
    if (m.type === "panic-clear") {
      setQuestion("");
      setAnswer("");
      setLines([]);
      setInterim("");
      setShowCodePanel(false);
      setCodeAnalysis("");
      setCodeImagePreview("");
      setNotes(null);
      setLimitMsg("");
      setLiveErr("");
      setActiveModifier(null);
    }
    if (m.type === "mesh-event") {
      if (m.engine) setLiveEngine(m.engine);
      if (m.action === "fallback") {
        const msg = `🛡️ Mesh Failover: ${(m.fromEngine || "PRIMARY").toUpperCase()} → ${(m.engine || "BACKUP").toUpperCase()}`;
        setMeshFailoverMsg(msg);
        setSnipToast(msg);
        setTimeout(() => { setMeshFailoverMsg(""); setSnipToast(""); }, 6000);
      }
    }
    if (m.type === "answer-start") {
      setQuestion(m.question);
      setAnswer("");
      setLatency(null);
      setIsStarAnswer(!!m.isBehavioral || starMode);
      if (m.modifier) setActiveModifier(m.modifier);
      if (m.engine) setLiveEngine(m.engine);
    }
    if (m.type === "star-mode-active") {
      setStarMode(!!m.starMode);
    }
    if (m.type === "answer-token") setAnswer((a) => a + m.text);
    if (m.type === "answer-done") {
      setLatency(m.latencyMs);
      if (m.engine) setLiveEngine(m.engine);
    }
    if (m.type === "limit") setLimitMsg(m.message);
    if (m.type === "notes") { setNotes(m.notes ?? { summary: m.message ?? "Notes nahi bane." }); closeSockets(); }
    if (m.type === "code-help") { setCodeAnalysis(m.analysis); setCodeLoading(false); setShowCodePanel(true); }
    if (m.type === "error") {
      console.error(m.source, m.message);
      setLiveErr(`[${m.source}] ${m.message}`);
    }
  }

  async function sendCodeImage(file: File) {
    setCodeLoading(true);
    setCodeAnalysis("");
    setShowCodePanel(true);
    setSnipToast("⚡ Image loaded! Analyzing with Gemini 2.5 Flash...");
    setTimeout(() => setSnipToast(""), 4000);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setCodeImagePreview(dataUrl);
      try {
        const ws = await ensureGatewayWs();
        ws.send(JSON.stringify({
          type: "code-help",
          imageBase64: base64,
          mimeType: file.type || "image/png",
          language: codeLang
        }));
      } catch (err: any) {
        setCodeLoading(false);
        setLiveErr(`Gateway connect nahi hua: ${err?.message}`);
      }
    };
    reader.readAsDataURL(file);
  }

  function closeSockets() {
    try { recRef.current?.stop(); } catch { }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    try { tabRecRef.current?.stop(); } catch { }
    tabStreamRef.current?.getTracks().forEach((t) => t.stop());
    tabWsRef.current?.close();
    setTabLive(false);
    setStatus("idle");
    setWrapping(false);
    setMicPackets(0);
    setTabPackets(0);
  }

  function pipeAudio(stream: MediaStream, ws: WebSocket, isTab = false) {
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    rec.ondataavailable = (e) => {
      if (e.data.size && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data);
        if (isTab) setTabPackets((p) => p + 1);
        else setMicPackets((p) => p + 1);
      }
    };
    rec.start(250);
    return rec;
  }

  async function start() {
    setLiveErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ws = new WebSocket(`${GATEWAY}/?speaker=candidate&gid=${gidRef.current}`);
      wsRef.current = ws;
      ws.onopen = () => {
        sendContext(ws);
        ws.send(JSON.stringify({ type: "set-model", model: selectedModel }));
        ws.send(JSON.stringify({ type: "set-star-mode", starMode }));
        recRef.current = pipeAudio(stream, ws, false);
        setStatus("live");
      };
      ws.onmessage = (e) => handleMsg(JSON.parse(e.data));
      ws.onerror = () => { setStatus("error"); setLiveErr("Gateway WebSocket connect nahi hua."); };
    } catch (e: any) {
      setStatus("error");
      setLiveErr(`Mic permission denied: ${e?.message}`);
    }
  }

  function stopMic() {
    try { recRef.current?.stop(); } catch { }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("idle");
    setMicPackets(0);
  }

  async function startTab() {
    setTabErr("");
    setLiveErr("");
    try {
      const disp = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      tabStreamRef.current = disp;
      const audioTrack = disp.getAudioTracks()[0];
      if (!audioTrack) {
        disp.getTracks().forEach((t) => t.stop());
        setTabErr(isDesktop
          ? "⚠️ Windows system loopback audio initialize nahi hua. Speaker volume check karo."
          : "⚠️ Tab audio nahi mila! Chrome popup me 'Chrome Tab' chunna aur 'Share tab audio' checkbox ON rakhna.");
        return;
      }
      // Stop video track in desktop mode to save GPU resources
      if (isDesktop) {
        disp.getVideoTracks().forEach((t) => t.stop());
      }
      audioTrack.onended = () => stopTab();
      const ws = new WebSocket(`${GATEWAY}/?speaker=interviewer&gid=${gidRef.current}`);
      tabWsRef.current = ws;
      ws.onopen = () => {
        sendContext(ws);
        ws.send(JSON.stringify({ type: "set-model", model: selectedModel }));
        ws.send(JSON.stringify({ type: "set-star-mode", starMode }));
        tabRecRef.current = pipeAudio(new MediaStream([audioTrack]), ws, true);
        setTabLive(true);
      };
      ws.onmessage = (e) => handleMsg(JSON.parse(e.data));
      ws.onerror = () => setTabErr("Gateway connect nahi hua.");
    } catch (err: any) {
      setTabErr(isDesktop
        ? `Loopback error: ${err?.message || "User dismissed"}`
        : "Tab share cancel hua ya browser ne roka (Chrome use karo).");
    }
  }

  function stopTab() {
    try { tabRecRef.current?.stop(); } catch { }
    tabStreamRef.current?.getTracks().forEach((t) => t.stop());
    tabWsRef.current?.close();
    tabWsRef.current = null;
    setTabLive(false);
    setTabPackets(0);
  }

  function stop() {
    const target = tabWsRef.current?.readyState === WebSocket.OPEN ? tabWsRef.current : wsRef.current;
    if (target && target.readyState === WebSocket.OPEN) {
      setWrapping(true);
      target.send(JSON.stringify({ type: "finalize" }));
      setTimeout(() => closeSockets(), 12000);
    } else { closeSockets(); }
  }

  function askManualQuestion(e: React.FormEvent) {
    e.preventDefault();
    const q = manualInput.trim();
    if (!q) return;
    const ws = tabWsRef.current ?? wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert("Pehle mic ya tab audio start karo, phir test karo.");
      return;
    }
    setQuestion(q);
    setAnswer("");
    ws.send(JSON.stringify({ type: "manual-answer", question: q }));
    setManualInput("");
  }

  const [copied, setCopied] = useState(false);

  function copyNotes() {
    if (!notes) return;
    const txt = [
      `🦜 Rev.perakit.ai — Interview Notes (${new Date().toLocaleDateString()})`,
      "",
      "--- SUMMARY ---",
      notes.summary || "",
      "",
      ...(notes.questionsAsked?.length ? ["--- QUESTIONS ASKED ---", ...notes.questionsAsked.map((q: string) => `• ${q}`), ""] : []),
      ...(notes.strengths?.length ? ["--- STRENGTHS ---", ...notes.strengths.map((s: string) => `+ ${s}`), ""] : []),
      ...(notes.improvements?.length ? ["--- IMPROVEMENTS ---", ...notes.improvements.map((s: string) => `→ ${s}`), ""] : []),
    ].join("\n");
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function downloadNotesAsPDF() {
    if (!notes) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocked! Browser mein allow karo.");
      return;
    }
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Interview Notes — Rev.perakit.ai</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 800px; margin: 30px auto; padding: 0 20px; }
    .header { border-bottom: 2px solid #2ee86b; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 22px; font-weight: bold; color: #084d1c; }
    .date { font-size: 13px; color: #666; }
    .sec { margin-bottom: 20px; }
    .sec-t { font-size: 15px; font-weight: 700; color: #084d1c; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 8px; }
    .sum-box { background: #f4faf5; border-left: 4px solid #2ee86b; padding: 12px 14px; border-radius: 4px; font-size: 14.5px; }
    ul { margin: 6px 0; padding-left: 20px; }
    li { margin-bottom: 5px; font-size: 14px; }
    .btn { background: #2ee86b; color: #04140a; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; }
    @media print {
      body { margin: 0; padding: 10px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">🦜 Rev.perakit.ai — Post-Interview Notes</div>
      <div class="date">Session Date: ${new Date().toLocaleString()}</div>
    </div>
    <button class="btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="sec">
    <div class="sec-t">Executive Summary</div>
    <div class="sum-box">${notes.summary || "No summary."}</div>
  </div>

  ${notes.questionsAsked?.length ? `
  <div class="sec">
    <div class="sec-t">Questions Asked (${notes.questionsAsked.length})</div>
    <ul>${notes.questionsAsked.map((q: string) => `<li>${q}</li>`).join("")}</ul>
  </div>` : ""}

  ${notes.strengths?.length ? `
  <div class="sec">
    <div class="sec-t">💪 Candidate Strengths</div>
    <ul>${notes.strengths.map((s: string) => `<li>${s}</li>`).join("")}</ul>
  </div>` : ""}

  ${notes.improvements?.length ? `
  <div class="sec">
    <div class="sec-t">🎯 Areas to Improve</div>
    <ul>${notes.improvements.map((s: string) => `<li>${s}</li>`).join("")}</ul>
  </div>` : ""}

  <div style="margin-top: 35px; border-top: 1px solid #eee; padding-top: 10px; font-size: 12px; color: #888; text-align: center;">
    Generated by Rev.perakit.ai — Real-time AI Interview Copilot
  </div>
  <script>
    setTimeout(() => { window.print(); }, 400);
  </script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const isLive = status === "live" || tabLive || wrapping;

  // ── S1: Hidden state — pulsing green dot ──────────────────────────
  if (hidden) {
    return (
      <div
        onClick={() => setHidden(false)}
        title="Rev kholo (Alt+H)"
        style={{
          position: "fixed", bottom: 18, right: 18,
          width: 22, height: 22, borderRadius: "50%",
          background: "#2ee86b",
          cursor: "pointer", zIndex: 99999,
          boxShadow: "0 0 12px #2ee86b88",
          animation: "pulse 2s infinite",
        }}
      />
    );
  }

  // ── S4: Camouflage — plain notepad look ────────────────────────────
  if (camouflage) {
    return (
      <div style={{
        fontFamily: "Consolas, 'Courier New', monospace",
        background: "#f5f5f0",
        color: "#333",
        minHeight: "100vh",
        padding: "32px 40px",
        fontSize: 14,
        lineHeight: 1.7,
      }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, opacity: 0.3, fontSize: 11 }}>
          <span onClick={() => setCamouflage(false)} style={{ cursor: "pointer" }}>[ Normal ]</span>
          <span onClick={() => setHidden(true)} style={{ cursor: "pointer" }}>[ Hide Alt+H ]</span>
          {status !== "live" && <span onClick={start} style={{ cursor: "pointer" }}>[ mic on ]</span>}
          {status === "live" && <span onClick={stopMic} style={{ cursor: "pointer", color: "green" }}>[ mic live ]</span>}
          {!tabLive && <span onClick={startTab} style={{ cursor: "pointer" }}>[ tab audio ]</span>}
          {tabLive && <span onClick={stopTab} style={{ cursor: "pointer", color: "green" }}>[ tab live ]</span>}
          {isLive && <span onClick={stop} style={{ cursor: "pointer" }}>[ stop ]</span>}
        </div>

        <div style={{ marginBottom: 24, color: "#555", maxHeight: "40vh", overflowY: "auto" }}>
          {lines.slice(-10).map((l, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              {l.who === "CANDIDATE" ? "→ " : "• "}{l.text}
            </div>
          ))}
          {interim && <div style={{ color: "#aaa" }}>  {interim}…</div>}
        </div>

        {answer && (
          <div style={{ background: "#eef7ee", border: "1px solid #ccc", borderRadius: 4, padding: "12px 16px", color: "#222", maxHeight: "45vh", overflowY: "auto" }}>
            {answer}
          </div>
        )}
      </div>
    );
  }

  // ── NORMAL UI ─────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        /* Sleek custom scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #08110a;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #1b3321;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #2ee86b;
        }
      `}</style>

      {/* ── STEALTH TOOLBAR ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        background: "#060e08",
        borderBottom: "1px solid #1e2a20",
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 20px", zIndex: 1000, fontSize: 12,
      }}>
        {/* Navigation to Main Page & Dashboard */}
        <a href="/" style={{ color: "#e9f2ea", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginRight: 6 }}>
          <span>🦜</span>
          <span>Rev<span style={{ color: "#2ee86b" }}>.perakit.ai</span></span>
        </a>
        <a href="/dashboard" style={{ color: "#2ee86b", textDecoration: "none", fontWeight: 700, marginRight: 10 }}>
          📊 Dashboard
        </a>

        {isDesktop ? (
          <>
            <span style={{ background: "#0c2b16", border: "1.5px solid #2ee86b", color: "#2ee86b", padding: "4px 12px", borderRadius: 6, fontWeight: 700, fontSize: 11.5, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🛡️ 100% OS Invisible Active</span>
              <span style={{ color: "#3a6045" }}>|</span>
              <span style={{ color: clickThrough ? "#ffea79" : "#a8f5c0" }}>
                {clickThrough ? "👆 Click-Through ON (Alt+X)" : "🖱️ Interactive Mode (Alt+X)"}
              </span>
            </span>
            <button
              onClick={() => toggleTeleprompterMode()}
              style={{
                background: teleprompterMode ? "#2ee86b" : "#0d2614",
                color: teleprompterMode ? "#04140a" : "#2ee86b",
                border: "1px solid #2ee86b",
                padding: "4px 12px",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 11.5,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
              title="Pin directly under camera lens (Alt+T)"
            >
              <span>🎯 Teleprompter Eye-Contact</span>
              <span style={{ fontSize: 9.5, opacity: 0.8 }}>Alt+T</span>
            </button>
            <button
              onClick={() => toggleStarMode()}
              style={{
                background: starMode ? "#7c3aed" : "#1a162b",
                color: starMode ? "#fff" : "#c084fc",
                border: "1px solid #a855f7",
                padding: "4px 12px",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 11.5,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
              title="Toggle STAR Method HR Matcher (Alt+B)"
            >
              <span>💼 STAR Mode</span>
              <span style={{
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 4,
                background: starMode ? "#2ee86b" : "#444",
                color: starMode ? "#000" : "#ccc",
                fontWeight: 800
              }}>
                {starMode ? "ON" : "OFF"}
              </span>
              <span style={{ fontSize: 9.5, opacity: 0.8 }}>Alt+B</span>
            </button>
            <button
              onClick={() => triggerQuickAction("panic_clear")}
              style={{
                background: "#2a0c0c",
                color: "#fca5a5",
                border: "1px solid #7f1d1d",
                padding: "4px 12px",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 11.5,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
              title="Instant Blank Screen (Alt+Z)"
            >
              <span>🧹 Panic Clear</span>
              <span style={{ fontSize: 9.5, opacity: 0.8 }}>Alt+Z</span>
            </button>
          </>
        ) : (
          <>
            <span style={{ color: "#5c7160", marginRight: 2 }}>| 🔒 STEALTH:</span>
            <button
              onClick={() => toggleTeleprompterMode()}
              title="Pin directly under camera lens (Alt+T)"
              style={{
                ...stealthBtn,
                background: teleprompterMode ? "#2ee86b" : "#0d2614",
                color: teleprompterMode ? "#04140a" : "#2ee86b",
                border: "1px solid #2ee86b",
                fontWeight: 700
              }}
            >
              🎯 Teleprompter (Alt+T)
            </button>
            <button
              onClick={() => toggleStarMode()}
              title="Toggle STAR Method HR Matcher (Alt+B)"
              style={{
                ...stealthBtn,
                background: starMode ? "#7c3aed" : "#1a162b",
                color: starMode ? "#fff" : "#c084fc",
                border: "1px solid #a855f7",
                fontWeight: 700
              }}
            >
              💼 STAR Mode ({starMode ? "ON" : "OFF"})
            </button>
            <button
              onClick={() => triggerQuickAction("panic_clear")}
              title="Instant Blank Screen (Alt+Z)"
              style={{
                ...stealthBtn,
                background: "#2a0c0c",
                borderColor: "#7f1d1d",
                color: "#fca5a5",
                fontWeight: 700
              }}
            >
              🧹 Panic Clear (Alt+Z)
            </button>
            <button onClick={() => setHidden(true)} title="Alt+H" style={stealthBtn}>👁️ Hide (Alt+H)</button>
            <button onClick={openPopup} title="Alag window mein khulega" style={stealthBtn}>🪟 Popup Window</button>
            <button onClick={() => setCamouflage(true)} title="Notepad look" style={stealthBtn}>📝 Camouflage</button>
          </>
        )}
        <span style={{ marginLeft: "auto", color: "#2ee86b", fontSize: 11, fontWeight: 700 }}>
          💡 YouTube / Meet tab share karo — Rev ka tab nahi!
        </span>
      </div>

      {/* ── WEBCAM TELEPROMPTER OVERLAY (Natural Eye-Contact Mode) ── */}
      {teleprompterMode && (() => {
        const { hook, bullets } = formatTeleprompterBullets(answer);
        return (
          <div style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(520px, 62vw, 800px)",
            height: 165,
            background: "rgba(5, 14, 8, 0.95)",
            border: "1.5px solid #2ee86b",
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.85), 0 0 25px rgba(46,232,107,0.3)",
            backdropFilter: "blur(20px)",
            zIndex: 9999999,
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            fontFamily: "system-ui, -apple-system, sans-serif"
          }}>
            {/* Top Beacon & Direct Eye Alignment */}
            <div style={{
              background: "linear-gradient(90deg, transparent, rgba(46,232,107,0.18), transparent)",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(46,232,107,0.25)",
              fontSize: 11
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ display: "inline-flex", width: 8, height: 8, borderRadius: "50%", background: "#2ee86b", boxShadow: "0 0 8px #2ee86b", animation: "pulse 1.5s infinite" }} />
                <span style={{ color: "#2ee86b", fontWeight: 800, letterSpacing: 0.5 }}>
                  ▲ LOOK AT WEBCAM ▲ (Direct Eye-Contact)
                </span>
              </div>

              {/* Speaking Pace Control */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#6e8773", fontSize: 10.5, marginRight: 2 }}>Pace:</span>
                {[
                  { label: "🐢 110", wpm: 110 },
                  { label: "⚡ 135", wpm: 135 },
                  { label: "🐇 160", wpm: 160 }
                ].map((s) => (
                  <button
                    key={s.wpm}
                    onClick={() => setScrollSpeedWpm(s.wpm)}
                    style={{
                      background: scrollSpeedWpm === s.wpm ? "#2ee86b" : "#0d1f12",
                      color: scrollSpeedWpm === s.wpm ? "#04140a" : "#9db3a0",
                      border: "1px solid rgba(46,232,107,0.3)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => setIsScrolling((v) => !v)}
                  title="Space bar to pause/play"
                  style={{
                    background: isScrolling ? "#102e18" : "#3b2608",
                    color: isScrolling ? "#2ee86b" : "#f59e0b",
                    border: `1px solid ${isScrolling ? "#2ee86b55" : "#f59e0b55"}`,
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {isScrolling ? "⏸ Pause" : "▶ Play"}
                </button>

                <button
                  onClick={() => setPrompterFontSize((s) => Math.max(12, s - 1))}
                  style={{ background: "#0e1a11", color: "#9db3a0", border: "1px solid #1f3323", padding: "1px 6px", borderRadius: 4, fontSize: 10.5, cursor: "pointer" }}
                  title="Smaller font"
                >
                  A-
                </button>
                <button
                  onClick={() => setPrompterFontSize((s) => Math.min(20, s + 1))}
                  style={{ background: "#0e1a11", color: "#9db3a0", border: "1px solid #1f3323", padding: "1px 6px", borderRadius: 4, fontSize: 10.5, cursor: "pointer" }}
                  title="Larger font"
                >
                  A+
                </button>

                <button
                  onClick={() => toggleTeleprompterMode(false)}
                  style={{ background: "transparent", border: "none", color: "#6e8773", cursor: "pointer", fontSize: 14, marginLeft: 4 }}
                  title="Exit Teleprompter (Alt+T)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Auto-scrolling Body */}
            <div
              ref={prompterScrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 16px",
                scrollBehavior: "smooth",
                fontSize: prompterFontSize,
                lineHeight: 1.55,
                color: "#e8f7ec"
              }}
              onMouseEnter={() => setIsScrolling(false)}
              onMouseLeave={() => setIsScrolling(true)}
            >
              {question && (
                <div style={{ color: "#2ee86b", fontSize: Math.max(11, prompterFontSize - 3), fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                  ❓ {question}
                </div>
              )}

              {hook ? (
                <div style={{
                  background: "rgba(46, 232, 107, 0.12)",
                  borderLeft: "3px solid #2ee86b",
                  padding: "5px 10px",
                  borderRadius: "0 6px 6px 0",
                  marginBottom: 8,
                  color: "#67f398",
                  fontWeight: 700
                }}>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, display: "block", color: "#2ee86b" }}>
                    ⚡ Speak This First (Opening Hook):
                  </span>
                  "{hook}"
                </div>
              ) : null}

              {bullets.length > 0 ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {bullets.map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ color: "#2ee86b", fontSize: 13, marginTop: 2 }}>•</span>
                      <span style={{ color: "#e8f7ec" }}>{b}</span>
                    </div>
                  ))}
                </div>
              ) : !hook ? (
                <div style={{ color: "#5c7160", fontStyle: "italic", textAlign: "center", marginTop: 25, fontSize: 13 }}>
                  Awaaz ya question ka intezaar hai… Answer yahan natural eye-contact speaking speed ({scrollSpeedWpm} WPM) par auto-scroll hoga.
                </div>
              ) : null}

              <div style={{ height: 80 }} />
            </div>
          </div>
        );
      })()}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "54px 20px 20px", fontFamily: "system-ui, sans-serif" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>
              🦜 Live Session {isLive && <span style={{ color: "#2ee86b", fontSize: 15 }}>● ACTIVE</span>}
            </h1>
            <a href="/" style={{ color: "#e9f2ea", textDecoration: "none", fontSize: 12.5, background: "#0d1a10", border: "1px solid #223a26", padding: "5px 12px", borderRadius: 6, fontWeight: 600 }}>
              🏠 Main Page
            </a>
            <a href="/dashboard" style={{ color: "#2ee86b", textDecoration: "none", fontSize: 12.5, background: "#102616", border: "1px solid #2ee86b55", padding: "5px 12px", borderRadius: 6, fontWeight: 700 }}>
              📊 Dashboard
            </a>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Live AI Model Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0c1f13", border: "1px solid #1e3a24", borderRadius: 8, padding: "5px 10px" }} title="Live Model Switcher">
              <span style={{ fontSize: 12, color: "#9db3a0" }}>🤖 Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => changeModel(e.target.value as any)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2ee86b",
                  fontSize: 12.5,
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="auto" style={{ background: "#0c1f13", color: "#e9f2ea" }}>⚡ Auto (Llama 3.3 + Gemini)</option>
                <option value="groq" style={{ background: "#0c1f13", color: "#e9f2ea" }}>⚡ Groq Llama 3.3 (&lt;1s Superfast)</option>
                <option value="gemini" style={{ background: "#0c1f13", color: "#e9f2ea" }}>🧠 Gemini 2.5 Flash (Deep Reason)</option>
              </select>
            </div>

            <a href="/mock" style={{ color: "#9db3a0", textDecoration: "none", fontSize: 13, background: "#0a130c", border: "1px solid #1a281e", padding: "7px 14px", borderRadius: 8 }}>
              🎤 Mock Interview →
            </a>
            {isLive && (
              <button onClick={stop} style={{ ...btn, background: wrapping ? "#444" : "#ff3b30", color: "#fff", padding: "8px 16px" }}>
                {wrapping ? "📝 Notes ban rahe hain…" : "⏹ Stop + Notes"}
              </button>
            )}
          </div>
        </div>

        {/* Live error toast */}
        {liveErr && (
          <div style={{ background: "#330a0a", border: "1px solid #ff3b30", borderRadius: 8, padding: "8px 14px", marginBottom: 12, color: "#ff8080", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {liveErr}</span>
            <button onClick={() => setLiveErr("")} style={{ background: "transparent", border: "none", color: "#ff8080", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* ── SETUP CARDS (When not live) ── */}
        {!isLive && (
          <>
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={badge}>Step 1</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "#e9f2ea" }}>📄 Resume Upload karo (Optional)</h3>
              </div>
              <p style={sub}>PDF ya text file select karo — Rev answers mein resume context use karega.</p>

              <label style={uploadLabel}>
                <span>📁 PDF / TXT file choose karo</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPdfMsg("");
                    if (f.name.toLowerCase().endsWith(".pdf")) {
                      try {
                        const text = await extractPdfText(f);
                        if (text.length < 30) { setPdfMsg("PDF mein text nahi mila — text paste kar do."); return; }
                        setResume(text);
                        setPdfMsg(`✓ PDF padh liya — ${text.length} characters`);
                      } catch { setPdfMsg("PDF nahi padha — text paste kar do."); }
                    } else {
                      const text = await f.text();
                      setResume(text);
                      setPdfMsg(`✓ File load ho gayi — ${text.length} characters`);
                    }
                  }}
                />
              </label>

              {pdfMsg && <p style={{ color: "#2ee86b", fontSize: 13, margin: "8px 0" }}>{pdfMsg}</p>}

              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Ya resume yahan paste kar do…"
                rows={3}
                style={{ ...ta, marginTop: 10 }}
              />

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", color: "#2ee86b", fontSize: 13 }}>+ Job Description / Special Instructions add karo</summary>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#9db3a0" }}>Job Description (JD)</label>
                    <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={3} style={ta} placeholder="JD yahan paste karo…" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#9db3a0" }}>Special Instructions</label>
                    <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} style={ta} placeholder="e.g. System design experience highlight karo" />
                  </div>
                </div>
              </details>
            </div>

            {/* START BUTTONS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={badge}>Step 2</span>
                  <h3 style={{ margin: 0, fontSize: 15, color: "#e9f2ea" }}>🎙️ Mic Start karo</h3>
                </div>
                <p style={sub}>Apni awaaz test karo — candidate microphone connect hota hai.</p>
                <button onClick={start} style={{ ...btn, width: "100%", padding: "12px 0", fontSize: 15, marginTop: 10 }}>
                  🎙️ Mic Start karo
                </button>
              </div>

              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ ...badge, background: isDesktop ? "#102e18" : "#1a221c", color: isDesktop ? "#2ee86b" : "#9db3a0", border: `1px solid ${isDesktop ? "#2ee86b55" : "#3e5242"}` }}>
                    {isDesktop ? "Step 3 • WASAPI" : "Step 3"}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15, color: "#e9f2ea" }}>
                    {isDesktop ? "🔊 Zoom / Teams WASAPI Loopback" : "🎧 Interviewer / YouTube Audio"}
                  </h3>
                </div>
                {isDesktop ? (
                  <div style={{ background: "#0c2614", border: "1px solid #2ee86b55", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "#9df3ba" }}>
                    🛡️ <b>100% Invisible Desktop Loopback:</b> Zoom, MS Teams, ya Meet ka sound direct Windows system loopback se silently capture hoga. No tab-sharing popup!
                  </div>
                ) : (
                  <div style={{ background: "#201202", border: "1px solid #ff9500", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "#ffc060" }}>
                    💡 <b>Chrome Tab</b> (YouTube) chuno + <b>Share tab audio</b> checkbox ON rakho!
                    <span style={{ display: "block", marginTop: 4, color: "#ffd090", fontSize: 11 }}>
                      🚀 <i>Desktop App me Zero Tab-Share WASAPI Loopback auto-active hota hai.</i>
                    </span>
                  </div>
                )}
                <button
                  onClick={startTab}
                  style={{ ...btn, width: "100%", padding: "12px 0", fontSize: 15, background: "#0f2e1a", color: "#2ee86b", border: "1.5px solid #2ee86b" }}
                >
                  {isDesktop ? "🔊 Connect Zoom / Teams Audio (WASAPI)" : "🎧 YouTube / Meet Tab Audio jodo"}
                </button>
                {tabErr && <p style={{ color: "#ff3b30", fontSize: 12, marginTop: 8 }}>⚠️ {tabErr}</p>}
              </div>
            </div>

            {/* Live Coding Snip Card */}
            <div style={{ ...card, marginTop: 14, background: "linear-gradient(135deg, #0b0b1f 0%, #060612 100%)", border: "1.5px solid #4338ca", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>👁️</span>
                  <h4 style={{ margin: 0, fontSize: 15, color: "#c7d2fe", fontWeight: 700 }}>
                    Step 4: LeetCode & Coding Copilot — Ready (Gemini 2.5 Flash)
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#818cf8" }}>
                  Screen par LeetCode / HackerRank question kholo aur <kbd style={{ background: "#1e1b4b", padding: "2px 7px", borderRadius: 4, color: "#fff", border: "1px solid #6366f1", fontWeight: 700 }}>Ctrl+Alt+S</kbd> dabao — Gemini Speaking Pitch, Optimal Code & Complexity generate kar dega!
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  style={{ background: "#1e1b4b", border: "1px solid #4338ca", color: "#c7d2fe", padding: "7px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                >
                  <option value="python">🐍 Python</option>
                  <option value="java">☕ Java</option>
                  <option value="cpp">⚡ C++</option>
                  <option value="javascript">🟡 JavaScript</option>
                  <option value="go">🔵 Go</option>
                </select>
                <button
                  type="button"
                  onClick={triggerScreenSnip}
                  style={{ ...btn, padding: "8px 16px", fontSize: 13, background: "#4f46e5", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span>📸 Test Auto Snip</span>
                  <span style={{ fontSize: 10, background: "#312e81", padding: "2px 5px", borderRadius: 4 }}>Ctrl+Alt+S</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── LIVE CONTROLS & MONITOR ── */}
        {isLive && (
          <>
            {/* Live toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={status === "live" ? stopMic : start}
                style={{ ...btn, padding: "8px 14px", fontSize: 13, background: status === "live" ? "#0f2e1a" : "#1a221c", color: status === "live" ? "#2ee86b" : "#9db3a0", border: `1.5px solid ${status === "live" ? "#2ee86b" : "#3e5242"}` }}
              >
                {status === "live" ? `🎙️ Mic LIVE (${micPackets} pkts)` : "🎙️ Mic Chalu karo"}
              </button>

              <button
                onClick={tabLive ? stopTab : startTab}
                style={{ ...btn, padding: "8px 14px", fontSize: 13, background: tabLive ? "#0f2e1a" : "#1a221c", color: tabLive ? "#2ee86b" : "#9db3a0", border: `1.5px solid ${tabLive ? "#2ee86b" : "#3e5242"}` }}
              >
                {tabLive
                  ? (isDesktop ? `🔊 WASAPI Loopback LIVE (${tabPackets} pkts)` : `🎧 Tab Audio LIVE (${tabPackets} pkts)`)
                  : (isDesktop ? "🔊 Connect Zoom/Teams Sound" : "🎧 Tab Audio jodo")}
              </button>

              {/* Feature 1: Silent Auto LeetCode / Screen Snip Button */}
              <button
                type="button"
                onClick={triggerScreenSnip}
                style={{
                  ...btn,
                  padding: "8px 14px",
                  fontSize: 13,
                  background: "#25184d",
                  color: "#c7d2fe",
                  border: "1.5px solid #6366f1",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700,
                  boxShadow: "0 0 12px rgba(99, 102, 241, 0.35)"
                }}
                title="Silent Auto Screen Snip (Ctrl+Alt+S)"
              >
                <span>⚡ Auto Snip</span>
                <span style={{ fontSize: 10.5, background: "#3730a3", color: "#e0e7ff", padding: "1px 6px", borderRadius: 4, border: "1px solid #4f46e5" }}>
                  Ctrl+Alt+S
                </span>
              </button>

              {/* Language Selector */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#101026", border: "1px solid #3730a3", borderRadius: 8, padding: "4px 8px" }}>
                <span style={{ fontSize: 11.5, color: "#818cf8", fontWeight: 600 }}>Lang:</span>
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  style={{ background: "transparent", border: "none", color: "#c7d2fe", fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer" }}
                >
                  <option value="python" style={{ background: "#0c0c1e", color: "#fff" }}>🐍 Python</option>
                  <option value="java" style={{ background: "#0c0c1e", color: "#fff" }}>☕ Java</option>
                  <option value="cpp" style={{ background: "#0c0c1e", color: "#fff" }}>⚡ C++</option>
                  <option value="javascript" style={{ background: "#0c0c1e", color: "#fff" }}>🟡 JS</option>
                  <option value="go" style={{ background: "#0c0c1e", color: "#fff" }}>🔵 Go</option>
                </select>
              </div>

              {/* Manual upload or toggle panel */}
              <label style={{ ...btn, padding: "8px 12px", fontSize: 12.5, background: "#131326", color: "#a5b4fc", border: "1px solid #2d2b55", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span>📁 Upload Snip</span>
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) sendCodeImage(f); e.target.value = ""; }} />
              </label>

              {/* Feature 2: Teleprompter Eye-Contact Mode Toggle */}
              <button
                type="button"
                onClick={() => toggleTeleprompterMode()}
                style={{
                  ...btn,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  background: teleprompterMode ? "#2ee86b" : "#0d2614",
                  color: teleprompterMode ? "#04140a" : "#2ee86b",
                  border: "1px solid #2ee86b",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 700
                }}
                title="Webcam Eye-Contact Prompter (Alt+T)"
              >
                <span>🎯 Teleprompter</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>Alt+T</span>
              </button>

              <button
                type="button"
                onClick={() => toggleStarMode()}
                style={{
                  ...btn,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  background: starMode ? "#7c3aed" : "#1a162b",
                  borderColor: starMode ? "#a855f7" : "#3b2a59",
                  color: starMode ? "#fff" : "#c084fc",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700
                }}
                title="Toggle STAR Method HR Matcher (Alt+B)"
              >
                <span>💼 STAR Mode</span>
                <span style={{
                  fontSize: 9.5,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: starMode ? "#2ee86b" : "#444",
                  color: starMode ? "#000" : "#ccc",
                  fontWeight: 800
                }}>
                  {starMode ? "ON" : "OFF"}
                </span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>Alt+B</span>
              </button>

              {showCodePanel && (
                <button
                  type="button"
                  onClick={() => setShowCodePanel(false)}
                  style={{ ...btn, padding: "8px 10px", fontSize: 12, background: "#1f1f2e", color: "#888", border: "1px solid #333" }}
                >
                  Hide Code
                </button>
              )}

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {meshFailoverMsg && (
                  <span style={{ fontSize: 11.5, background: "#78350f", color: "#fef08a", border: "1px solid #facc15", padding: "3px 10px", borderRadius: 6, fontWeight: 700, animation: "pulse 1.5s infinite" }}>
                    {meshFailoverMsg}
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "#08140c", border: "1px solid #1c3b23", borderRadius: 6, padding: "4px 10px" }}>
                  <span style={{ color: "#77967e" }}>🛡️ Multi-AI Mesh:</span>
                  <span style={{
                    color: liveEngine === "groq" ? "#2ee86b" : liveEngine === "gemini" ? "#818cf8" : liveEngine === "cerebras" ? "#f59e0b" : "#38bdf8",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    {liveEngine === "groq" ? "⚡ Groq (<1s)" : liveEngine === "gemini" ? "🧠 Gemini Flash" : liveEngine === "cerebras" ? "⚡⚡ Cerebras" : "🌐 OpenRouter"}
                  </span>
                </div>
              </div>

              {limitMsg && <span style={{ color: "#ffb02e", fontSize: 12 }}>⚠️ {limitMsg}</span>}
              {tabErr && <span style={{ color: "#ff3b30", fontSize: 12 }}>⚠️ {tabErr}</span>}
            </div>

            {/* Quick manual testing bar */}
            <form onSubmit={askManualQuestion} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="⚡ Sawal type karke test karo (e.g. What is polymorphism?)..."
                style={{ flex: 1, padding: "9px 14px", background: "#0a130c", border: "1px solid #1e2a20", borderRadius: 8, color: "#e9f2ea", fontSize: 13 }}
              />
              <button type="submit" style={{ ...btn, padding: "9px 16px", fontSize: 13, whiteSpace: "nowrap" }}>
                ⚡ Test Answer
              </button>
            </form>

            {/* ⚡ Quick Actions (Panic & Prompts) Hotkey Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
              padding: "7px 12px",
              background: "#08100b",
              border: "1px solid #1a2e20",
              borderRadius: 8,
              flexWrap: "wrap",
              fontSize: 12
            }}>
              <span style={{ color: "#6e8773", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                ⚡ Quick Actions:
              </span>

              {/* Alt + S: Simpler Banao */}
              <button
                type="button"
                onClick={() => triggerQuickAction("simpler")}
                style={{
                  ...btn,
                  padding: "5px 12px",
                  fontSize: 12,
                  background: activeModifier === "simpler" ? "#b45309" : "#1a1708",
                  border: `1px solid ${activeModifier === "simpler" ? "#fbbf24" : "#453208"}`,
                  color: "#fbbf24",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                title="Simpler 2-Liner Version (Alt+S)"
              >
                <span>⚡ Simpler (2-Liner)</span>
                <span style={{ fontSize: 9.5, opacity: 0.85, background: "#2e2105", padding: "1px 5px", borderRadius: 4 }}>Alt+S</span>
              </button>

              {/* Alt + D: Deep Dive */}
              <button
                type="button"
                onClick={() => triggerQuickAction("deep_dive")}
                style={{
                  ...btn,
                  padding: "5px 12px",
                  fontSize: 12,
                  background: activeModifier === "deep_dive" ? "#3730a3" : "#0e1124",
                  border: `1px solid ${activeModifier === "deep_dive" ? "#818cf8" : "#242a59"}`,
                  color: "#a5b4fc",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                title="Deep Dive System Design & Internals (Alt+D)"
              >
                <span>🔬 Deep Dive</span>
                <span style={{ fontSize: 9.5, opacity: 0.85, background: "#1c2144", padding: "1px 5px", borderRadius: 4 }}>Alt+D</span>
              </button>

              {/* Alt + C: Only Code */}
              <button
                type="button"
                onClick={() => triggerQuickAction("only_code")}
                style={{
                  ...btn,
                  padding: "5px 12px",
                  fontSize: 12,
                  background: activeModifier === "only_code" ? "#065f46" : "#081c12",
                  border: `1px solid ${activeModifier === "only_code" ? "#34d399" : "#144227"}`,
                  color: "#6ee7b7",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                title="Show Only Code block (Alt+C)"
              >
                <span>💻 Only Code</span>
                <span style={{ fontSize: 9.5, opacity: 0.85, background: "#0e331f", padding: "1px 5px", borderRadius: 4 }}>Alt+C</span>
              </button>

              {/* Alt + Z: Panic Clear */}
              <button
                type="button"
                onClick={() => triggerQuickAction("panic_clear")}
                style={{
                  ...btn,
                  marginLeft: "auto",
                  padding: "5px 12px",
                  fontSize: 12,
                  background: "#2a0c0c",
                  border: "1px solid #7f1d1d",
                  color: "#fca5a5",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 800,
                  cursor: "pointer"
                }}
                title="Instantly clear screen and cancel answers (Alt+Z)"
              >
                <span>🧹 Panic Clear</span>
                <span style={{ fontSize: 9.5, opacity: 0.85, background: "#450a0a", padding: "1px 5px", borderRadius: 4 }}>Alt+Z</span>
              </button>
            </div>

            {/* ── FIXED HEIGHT AUTO-SCROLLING SPLIT VIEW ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 16, height: "calc(100vh - 200px)", minHeight: 460 }}>
              
              {/* Transcript Section */}
              <section style={{ ...pane, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
                  <h3 style={paneTitle}>🎧 Transcript</h3>
                  {(status === "live" || tabLive) && (
                    <span style={{ fontSize: 11, color: "#2ee86b", fontWeight: 700 }}>● Listening</span>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: "auto", paddingRight: 6 }}>
                  {lines.length === 0 && !interim && (
                    <p style={{ color: "#5c7160", fontSize: 13, lineHeight: 1.6 }}>
                      Awaaz ka intezaar hai…<br />
                      • Mic par bolo (e.g. <i>"What is polymorphism?"</i>)<br />
                      • Ya YouTube video play karo<br />
                      • Ya upar box mein sawal type karo!
                    </p>
                  )}
                  {lines.map((l, i) => (
                    <div key={i} style={{ margin: "6px 0", fontSize: 13, lineHeight: 1.5, background: l.who === "INTERVIEWER" ? "#0f2014" : "transparent", padding: l.who === "INTERVIEWER" ? "6px 10px" : "2px 0", borderRadius: 6 }}>
                      <span style={{ color: l.who === "CANDIDATE" ? "#7cc7ff" : "#2ee86b", fontSize: 12, fontWeight: 700 }}>
                        {l.who === "CANDIDATE" ? "🎙️ TUM: " : "🎧 INTERVIEWER: "}
                      </span>
                      <span>{l.text}</span>
                    </div>
                  ))}
                  {interim && (
                    <div style={{ color: "#9db3a0", fontStyle: "italic", margin: "4px 0", fontSize: 13 }}>
                      {interim}…
                    </div>
                  )}
                  {/* Invisible element to auto-scroll to */}
                  <div ref={transcriptEndRef} />
                </div>
              </section>

              {/* Answer Section */}
              <section style={{ ...pane, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={paneTitle}>⚡ Rev Suggests</h3>
                    {activeModifier === "simpler" && (
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: "#f59e0b22", color: "#fbbf24", border: "1px solid #f59e0b66", padding: "2px 8px", borderRadius: 12 }}>
                        ⚡ 2-Liner Short
                      </span>
                    )}
                    {activeModifier === "deep_dive" && (
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: "#6366f122", color: "#a5b4fc", border: "1px solid #6366f166", padding: "2px 8px", borderRadius: 12 }}>
                        🔬 Deep Dive Internals
                      </span>
                    )}
                    {activeModifier === "only_code" && (
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: "#2ee86b22", color: "#2ee86b", border: "1px solid #2ee86b66", padding: "2px 8px", borderRadius: 12 }}>
                        💻 Only Code
                      </span>
                    )}
                  </div>
                  {latency !== null && <span style={{ color: "#2ee86b", fontSize: 12 }}>({(latency / 1000).toFixed(1)}s)</span>}
                </div>

                {/* Pinned Question Header */}
                {question && (
                  <div style={{ background: "#0e1c12", border: "1px solid #1f3b25", borderRadius: 8, padding: "8px 12px", marginBottom: 10, flexShrink: 0 }}>
                    <span style={{ color: "#2ee86b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Question:</span>
                    <p style={{ color: "#e9f2ea", fontSize: 13, margin: "3px 0 0", fontWeight: 600 }}>{question}</p>
                  </div>
                )}

                {/* Auto-scrolling Answer Body */}
                <div style={{ flex: 1, overflowY: "auto", paddingRight: 6 }}>
                  {(() => {
                    const star = parseStarSections(answer);
                    if (star?.isStar) {
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              💼 STAR Framework Answer (Resume Grounded)
                            </span>
                            <span style={{ fontSize: 10.5, background: "#7c3aed22", border: "1px solid #7c3aed88", color: "#c084fc", padding: "2px 8px", borderRadius: 12 }}>
                              HR & Behavioral
                            </span>
                          </div>

                          {/* Situation */}
                          {star.situation && (
                            <div style={{
                              background: "rgba(14, 165, 233, 0.08)",
                              border: "1px solid rgba(14, 165, 233, 0.35)",
                              borderRadius: 8,
                              padding: "10px 14px",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ background: "#0ea5e9", color: "#000", fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 4 }}>S</span>
                                <span style={{ color: "#38bdf8", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Situation (Context & Problem)</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#e0f2fe" }}>
                                {star.situation}
                              </p>
                            </div>
                          )}

                          {/* Task */}
                          {star.task && (
                            <div style={{
                              background: "rgba(245, 158, 11, 0.08)",
                              border: "1px solid rgba(245, 158, 11, 0.35)",
                              borderRadius: 8,
                              padding: "10px 14px",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 4 }}>T</span>
                                <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Task (Goal & Responsibility)</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#fef3c7" }}>
                                {star.task}
                              </p>
                            </div>
                          )}

                          {/* Action */}
                          {star.action && (
                            <div style={{
                              background: "rgba(46, 232, 107, 0.08)",
                              border: "1px solid rgba(46, 232, 107, 0.35)",
                              borderRadius: 8,
                              padding: "10px 14px",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ background: "#2ee86b", color: "#000", fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 4 }}>A</span>
                                <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Action (Steps Taken & Tech)</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#dcfce7" }}>
                                {star.action}
                              </p>
                            </div>
                          )}

                          {/* Result */}
                          {star.result && (
                            <div style={{
                              background: "rgba(192, 132, 252, 0.1)",
                              border: "1px solid rgba(192, 132, 252, 0.4)",
                              borderRadius: 8,
                              padding: "10px 14px",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ background: "#c084fc", color: "#000", fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 4 }}>R</span>
                                <span style={{ color: "#e9d5ff", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Result (Metrics & Business Value)</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#f5f3ff", fontWeight: 600 }}>
                                {star.result}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 13.5, color: "#dbe8dd" }}>
                        {answer || <span style={{ color: "#5c7160" }}>Answer yahan real-time stream hoga…</span>}
                      </div>
                    );
                  })()}
                  {/* Invisible element to auto-scroll to */}
                  <div ref={answerEndRef} />
                </div>
              </section>
            </div>
          </>
        )}

        {/* ── ADVANCED LEETCODE & CODING COPILOT PANEL (Accessible Live & Offline) ── */}
        {showCodePanel && (() => {
              const parsedCode = parseCodeSections(codeAnalysis);
              return (
                <section style={{
                  ...pane,
                  marginTop: 14,
                  borderColor: "#4f46e5",
                  background: "#080816",
                  boxShadow: "0 8px 32px rgba(79, 70, 229, 0.2)",
                  padding: "16px 20px"
                }}>
                  {/* Panel Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>👁️</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, color: "#c7d2fe", fontWeight: 800 }}>
                          LeetCode & Coding Copilot — Gemini 2.5 Flash
                        </h3>
                        <span style={{ fontSize: 11.5, color: "#818cf8" }}>
                          Silent hotkey: <kbd style={{ background: "#1e1b4b", padding: "1px 6px", borderRadius: 4, color: "#e0e7ff", border: "1px solid #4338ca" }}>Ctrl+Alt+S</kbd> | Clipboard paste: <kbd style={{ background: "#1e1b4b", padding: "1px 6px", borderRadius: 4, color: "#e0e7ff", border: "1px solid #4338ca" }}>Ctrl+V</kbd>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {/* Retake Snip Button */}
                      <button
                        onClick={triggerScreenSnip}
                        style={{ ...btn, padding: "6px 12px", fontSize: 12, background: "#4f46e5", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                        title="Silent Auto Screen Snip (Ctrl+Alt+S)"
                      >
                        <span>📸 Retake Snip</span>
                      </button>

                      {/* Close Button */}
                      <button
                        onClick={() => setShowCodePanel(false)}
                        style={{ background: "transparent", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
                        title="Close Coding Panel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Toast notification */}
                  {snipToast && (
                    <div style={{ background: "#1e1b4b", border: "1px solid #6366f1", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#c7d2fe", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ animation: "pulse 1.5s infinite" }}>⚡</span>
                      <span>{snipToast}</span>
                    </div>
                  )}

                  {codeLoading ? (
                    <div style={{ padding: "30px 20px", textAlign: "center", color: "#c7d2fe" }}>
                      <div style={{ fontSize: 34, marginBottom: 10, animation: "pulse 1s infinite" }}>🧠</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>Gemini 2.5 Flash Vision Reading Problem...</div>
                      <p style={{ fontSize: 12.5, color: "#818cf8", margin: "6px 0 0" }}>
                        Problem statement, constraints & optimal {codeLang.toUpperCase()} algorithm synthesize ho rahe hain...
                      </p>
                    </div>
                  ) : parsedCode?.isStructured ? (
                    <div style={{ display: "grid", gap: 14 }}>
                      {/* 1. Speaking Pitch */}
                      {parsedCode.pitch && (
                        <div style={{ background: "#062312", border: "1.5px solid #2ee86b", borderRadius: 10, padding: "12px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#2ee86b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                              💡 Speaking Pitch (Interviewer ko ye bolna shuru karo)
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(parsedCode.pitch);
                                setCopiedPitch(true);
                                setTimeout(() => setCopiedPitch(false), 2000);
                              }}
                              style={{ background: "#0d3b1e", border: "1px solid #2ee86b55", color: "#2ee86b", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                            >
                              {copiedPitch ? "✓ Copied!" : "📋 Copy Pitch"}
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, color: "#e3fcec", lineHeight: 1.6, fontWeight: 500 }}>
                            "{parsedCode.pitch}"
                          </p>
                        </div>
                      )}

                      {/* 2. Optimal Code */}
                      {parsedCode.code && (
                        <div style={{ background: "#04040c", border: "1px solid #2d2b55", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ background: "#0c0b20", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e1d3b" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>
                              💻 Optimal Solution ({parsedCode.extractedLang || codeLang})
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(parsedCode.code);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2000);
                              }}
                              style={{ background: "#4f46e5", border: "none", color: "#fff", borderRadius: 6, padding: "4px 12px", fontSize: 11.5, cursor: "pointer", fontWeight: 700 }}
                            >
                              {copiedCode ? "✓ Copied to Clipboard!" : "📋 Copy Code"}
                            </button>
                          </div>
                          <pre style={{ margin: 0, padding: "14px 16px", overflowX: "auto", fontSize: 13, lineHeight: 1.6, color: "#e0e7ff", fontFamily: "Consolas, 'Fira Code', Monaco, monospace", maxHeight: 360 }}>
                            <code>{parsedCode.code}</code>
                          </pre>
                        </div>
                      )}

                      {/* 3. Complexity & Dry Run */}
                      <div style={{ display: "grid", gridTemplateColumns: parsedCode.dryRun ? "1fr 1fr" : "1fr", gap: 10 }}>
                        {parsedCode.complexity && (
                          <div style={{ background: "#101026", border: "1px solid #2d2b55", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", marginBottom: 6 }}>⏱️ Time & Space Complexity</div>
                            <div style={{ fontSize: 12.5, color: "#c7d2fe", lineHeight: 1.6, whiteSpace: "pre-line" }}>{parsedCode.complexity}</div>
                          </div>
                        )}
                        {parsedCode.dryRun && (
                          <div style={{ background: "#101026", border: "1px solid #2d2b55", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", marginBottom: 6 }}>🔍 Dry Run & Edge Cases</div>
                            <div style={{ fontSize: 12.5, color: "#c7d2fe", lineHeight: 1.6, whiteSpace: "pre-line" }}>{parsedCode.dryRun}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 13.5, color: "#d0d0ff" }}>
                      {codeAnalysis || "Press Ctrl+Alt+S anytime or click '⚡ Auto Snip' to capture coding problem from your screen."}
                    </div>
                  )}
                </section>
              );
            })()}

        {/* Post-call Notes */}
        {notes && (
          <section style={{ ...pane, minHeight: 0, marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ ...paneTitle, margin: 0 }}>📝 Post-call Notes</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={copyNotes}
                  style={{ ...btn, padding: "6px 14px", fontSize: 12, background: "#1b2e1f", color: "#2ee86b", border: "1px solid #2ee86b44" }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Notes"}
                </button>
                <button
                  onClick={downloadNotesAsPDF}
                  style={{ ...btn, padding: "6px 14px", fontSize: 12, background: "#2ee86b", color: "#04140a" }}
                >
                  📥 Download PDF
                </button>
              </div>
            </div>
            <p style={{ lineHeight: 1.6, color: "#dce8dd", fontSize: 14 }}>{notes.summary}</p>
            {notes.questionsAsked?.length > 0 && <><h4 style={noteH}>Sawal jo hue</h4><ul style={noteUl}>{notes.questionsAsked.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul></>}
            {notes.strengths?.length > 0 && <><h4 style={noteH}>💪 Strengths</h4><ul style={noteUl}>{notes.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></>}
            {notes.improvements?.length > 0 && <><h4 style={noteH}>🎯 Improve karo</h4><ul style={noteUl}>{notes.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></>}
          </section>
        )}

        {/* Floating Global Status Pill */}
        {snipToast && (
          <div style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0c1a10",
            border: "1.5px solid #2ee86b",
            color: "#2ee86b",
            padding: "8px 20px",
            borderRadius: 24,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 10px 35px rgba(0,0,0,0.85), 0 0 15px rgba(46,232,107,0.35)",
            zIndex: 99999999,
            pointerEvents: "none"
          }}>
            {snipToast}
          </div>
        )}
      </main>
    </>
  );
}

const card: React.CSSProperties = {
  background: "#0d1710",
  border: "1px solid #1e2a20",
  borderRadius: 12,
  padding: 16,
};

const badge: React.CSSProperties = {
  background: "#163820",
  color: "#2ee86b",
  fontSize: 11,
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 6,
  textTransform: "uppercase",
};

const uploadLabel: React.CSSProperties = {
  display: "block",
  padding: "16px 20px",
  border: "1.5px dashed #2ee86b55",
  borderRadius: 8,
  background: "#08130a",
  color: "#2ee86b",
  textAlign: "center",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
  marginTop: 10,
};

const pane: React.CSSProperties = {
  background: "#0a130c",
  border: "1px solid #1a291e",
  borderRadius: 12,
  padding: 16,
};

const paneTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#e9f2ea",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const sub: React.CSSProperties = {
  fontSize: 13,
  color: "#7a917e",
  margin: "4px 0 0",
};

const btn: React.CSSProperties = {
  background: "#2ee86b",
  color: "#050b06",
  fontWeight: 700,
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: 14,
};

const stealthBtn: React.CSSProperties = {
  background: "#122016",
  border: "1px solid #243a29",
  color: "#a4c4ab",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const ta: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#060d07",
  border: "1px solid #1b2e1f",
  borderRadius: 8,
  color: "#dce8dd",
  padding: 10,
  fontSize: 13,
  fontFamily: "inherit",
  resize: "vertical",
};

const noteH: React.CSSProperties = {
  margin: "14px 0 6px",
  fontSize: 13,
  color: "#2ee86b",
};

const noteUl: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  lineHeight: 1.6,
  fontSize: 13,
};

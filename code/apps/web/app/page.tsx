"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalPlan, setModalPlan] = useState({ name: "Pro Unlimited", price: "₹999/mo" });
  const [paid, setPaid] = useState(false);

  // Waitlist form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState("Backend Engineer");
  const [unlocked, setUnlocked] = useState(false);

  function openCheckout(planName: string, price: string) {
    setModalPlan({ name: planName, price });
    setShowModal(true);
  }

  function handlePayment() {
    setPaid(true);
    const u = { name: name || "Candidate", role, plan: "pro" };
    localStorage.setItem("rev_user", JSON.stringify(u));
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  }

  function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    const u = { name: name || "Candidate", contact, role, plan: "pro" };
    localStorage.setItem("rev_user", JSON.stringify(u));
    setUnlocked(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060b07", color: "#e9f2ea", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── NAV BAR ── */}
      <nav style={{ background: "rgba(6,14,8,0.85)", borderBottom: "1px solid #1a281e", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800 }}>
            <span style={{ fontSize: 24 }}>🦜</span>
            <span>Rev<span style={{ color: "#2ee86b" }}>.perakit.ai</span></span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 14 }}>
            <Link href="/dashboard" style={{ color: "#2ee86b", textDecoration: "none", fontWeight: 700 }}>Dashboard</Link>
            <Link href="/session" style={{ color: "#9db3a0", textDecoration: "none" }}>Live Copilot</Link>
            <Link href="/mock" style={{ color: "#9db3a0", textDecoration: "none" }}>Mock Interview</Link>
            <a href="#stealth" style={{ color: "#9db3a0", textDecoration: "none" }}>Invisibility</a>
            <a href="#pricing" style={{ color: "#9db3a0", textDecoration: "none" }}>Pricing</a>
          </div>

          <Link href="/dashboard" style={{ background: "#2ee86b", color: "#04140a", fontWeight: 800, padding: "10px 22px", borderRadius: 999, textDecoration: "none", fontSize: 13.5 }}>
            Open Dashboard →
          </Link>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header style={{ padding: "70px 20px 50px", textAlign: "center", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "inline-block", border: "1px solid #2ee86b55", color: "#9df3ba", background: "#0c2614", padding: "6px 16px", borderRadius: 999, fontSize: 13, marginBottom: 20 }}>
          🇮🇳 India's first Hinglish-ready AI interview copilot — Live & Active
        </div>

        <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)", fontWeight: 900, lineHeight: 1.15, margin: "0 0 18px", letterSpacing: -1 }}>
          Interview me <span style={{ color: "#2ee86b" }}>kabhi blank</span> mat ho.
        </h1>

        <p style={{ color: "#9db3a0", fontSize: 17, lineHeight: 1.6, maxWidth: 660, margin: "0 auto 30px" }}>
          Rev listens to your live interview, understands the question, and displays a ready-to-speak answer built from <b>your resume</b> in under 3 seconds. Technical, System Design, HR — sab handle hota hai.
        </p>

        {/* 3 Main Action CTA Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <Link
            href="/dashboard"
            style={{
              background: "#2ee86b", color: "#04140a", fontWeight: 800, padding: "13px 28px",
              borderRadius: 999, textDecoration: "none", fontSize: 15, boxShadow: "0 6px 24px rgba(46,232,107,0.35)"
            }}
          >
            🚀 Open Dashboard
          </Link>
          <Link
            href="/session"
            style={{
              background: "#0d2113", color: "#2ee86b", border: "1.5px solid #2ee86b", fontWeight: 700, padding: "13px 24px",
              borderRadius: 999, textDecoration: "none", fontSize: 15,
            }}
          >
            🦜 Live Copilot (Alt+H)
          </Link>
          <Link
            href="/mock"
            style={{
              background: "#0d2113", color: "#2ee86b", border: "1.5px solid #2ee86b", fontWeight: 700, padding: "13px 24px",
              borderRadius: 999, textDecoration: "none", fontSize: 15,
            }}
          >
            🎤 Free Mock Practice
          </Link>
        </div>
        <p style={{ color: "#6e8773", fontSize: 13 }}>No card required · ₹0 Free Tier · Real-time low latency streaming</p>
      </header>

      {/* ── CORE FEATURES GRID ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
        <h2 style={{ textAlign: "center", fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
          Sab kuch, mid-interview ⚡
        </h2>
        <p style={{ textAlign: "center", color: "#7a917e", margin: "0 auto 32px", fontSize: 14 }}>
          Live audio recognition, Gemini vision coding assistance, and auto-scrolling answers.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
          <div style={featureCard}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
            <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>Real-time Streaming Answers</h3>
            <p style={{ color: "#8ea492", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Question khatm hote hi screen par answer stream hona shuru ho jata hai. Sub-second latency.
            </p>
          </div>

          <div style={featureCard}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
            <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>100% Stealth Mode</h3>
            <p style={{ color: "#8ea492", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Alt+H instant hide, independent popup windows, aur camouflage notepad mode taaki interviewer ko pata na chale.
            </p>
          </div>

          <div style={featureCard}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>💻</div>
            <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>Gemini Vision Coding Help</h3>
            <p style={{ color: "#8ea492", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Coding question ka screenshot upload karo — Rev approach, working code, aur bolne-layak explanation dega.
            </p>
          </div>

          <div style={featureCard}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
            <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>Resume & JD Personalized</h3>
            <p style={{ color: "#8ea492", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Har answer aapke real resume projects aur metrics se banta hai. Fabricated stories kabhi nahi.
            </p>
          </div>

          <div style={featureCard}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎤</div>
            <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>AI Voice Mock Interview</h3>
            <p style={{ color: "#8ea492", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Audio TTS questions, live speech recording, timer aur detailed 100-point report card.
            </p>
          </div>

          <div style={featureCard}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📥</div>
            <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>Instant PDF Downloads</h3>
            <p style={{ color: "#8ea492", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Post-call notes aur Mock report cards ko 1-click me printable executive PDF document me download karo.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5 INVISIBILITY FEATURES (PARAKEET-AI PARITY) ── */}
      <section id="stealth" style={{ background: "linear-gradient(180deg, #060b07 0%, #09190d 50%, #060b07 100%)", borderTop: "1px solid #1a281e", borderBottom: "1px solid #1a281e", padding: "75px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 40px" }}>
            <span style={{ display: "inline-block", border: "1px solid #2ee86b", color: "#2ee86b", background: "#0e2916", padding: "5px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
              🛡️ 100% Undetectable Invisibility
            </span>
            <h2 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 12px" }}>
              How is Rev Invisible to Interviewers?
            </h2>
            <p style={{ color: "#7a917e", fontSize: 15, margin: 0, lineHeight: 1.6 }}>
              ParakeetAI-grade deep OS stealth architecture so Google Meet, Zoom, MS Teams, and online proctors cannot see or detect anything on your screen.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* Feature #1 */}
            <div style={{ ...featureCard, border: "1.5px solid rgba(46,232,107,0.35)", background: "#0c1710", padding: 26, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#2ee86b", letterSpacing: 1, textTransform: "uppercase" }}>Feature #1</span>
                <span style={{ fontSize: 11, background: "#122b18", color: "#2ee86b", padding: "3px 9px", borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>
              </div>
              <h3 style={{ fontSize: 20, margin: "0 0 8px", color: "#fff" }}>Invisible on Screen Share</h3>
              <p style={{ color: "#9db3a0", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                Hardware-level display capture exclusion (<code>WDA_EXCLUDEFROMCAPTURE</code> on Windows / <code>NSWindowSharingNone</code> on macOS). Jab aap Google Meet ya Zoom par screen share karte hain, Rev interviewer ko <b style={{ color: "#2ee86b" }}>100% invisible</b> rehta hai — sirf aapko dikhta hai.
              </p>
            </div>

            {/* Feature #2 */}
            <div style={{ ...featureCard, border: "1.5px solid rgba(46,232,107,0.35)", background: "#0c1710", padding: 26, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#2ee86b", letterSpacing: 1, textTransform: "uppercase" }}>Feature #2</span>
                <span style={{ fontSize: 11, background: "#122b18", color: "#2ee86b", padding: "3px 9px", borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>
              </div>
              <h3 style={{ fontSize: 20, margin: "0 0 8px", color: "#fff" }}>Invisible in Dock / Taskbar</h3>
              <p style={{ color: "#9db3a0", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                Windows Taskbar aur macOS Dock par koi application icon ya window handle show nahi hota. Rev runs silently as an undetectable background service with zero visual desktop trace.
              </p>
            </div>

            {/* Feature #3 */}
            <div style={{ ...featureCard, border: "1.5px solid rgba(46,232,107,0.35)", background: "#0c1710", padding: 26, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#2ee86b", letterSpacing: 1, textTransform: "uppercase" }}>Feature #3</span>
                <span style={{ fontSize: 11, background: "#122b18", color: "#2ee86b", padding: "3px 9px", borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>
              </div>
              <h3 style={{ fontSize: 20, margin: "0 0 8px", color: "#fff" }}>Invisible in Activity Monitor / Task Manager</h3>
              <p style={{ color: "#9db3a0", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                Process name automatically masquerades as a standard system process (e.g. <code>Windows Audio Driver</code> / <code>CoreAudio Helper</code>). Agar interviewer Task Manager khulwa kar screen check kare, tab bhi zero suspicion.
              </p>
            </div>

            {/* Feature #4 */}
            <div style={{ ...featureCard, border: "1.5px solid rgba(46,232,107,0.35)", background: "#0c1710", padding: 26, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#2ee86b", letterSpacing: 1, textTransform: "uppercase" }}>Feature #4</span>
                <span style={{ fontSize: 11, background: "#122b18", color: "#2ee86b", padding: "3px 9px", borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>
              </div>
              <h3 style={{ fontSize: 20, margin: "0 0 8px", color: "#fff" }}>Invisible to Tab Switching</h3>
              <p style={{ color: "#9db3a0", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                HackerRank, Mercer Mettl, Codility ke <code>window.onblur</code> aur <code>visibilitychange</code> triggers ko completely bypass karta hai. Test window hamesha active focus me rehti hai aur zero tab-switch warning aati hai.
              </p>
            </div>

            {/* Feature #5 */}
            <div style={{ ...featureCard, border: "1.5px solid rgba(46,232,107,0.35)", background: "#0c1710", padding: 26, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#2ee86b", letterSpacing: 1, textTransform: "uppercase" }}>Feature #5</span>
                <span style={{ fontSize: 11, background: "#122b18", color: "#2ee86b", padding: "3px 9px", borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>
              </div>
              <h3 style={{ fontSize: 20, margin: "0 0 8px", color: "#fff" }}>Cursor Undetectability</h3>
              <p style={{ color: "#9db3a0", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                Click-through pass-through technology! Mouse cursor Rev ke overlay ke aar-paar bina ruke transparently move aur click karta hai — mouse leaves window / cursor tracking detection 100% bypass hota hai.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href="/session" style={{ display: "inline-block", background: "#2ee86b", color: "#04140a", fontWeight: 800, padding: "13px 34px", borderRadius: 999, textDecoration: "none", fontSize: 15 }}>
              🛡️ Launch Invisible Copilot Session →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 20px" }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          Launch Pricing — India ke liye 🇮🇳
        </h2>
        <p style={{ textAlign: "center", color: "#7a917e", margin: "0 auto 36px", fontSize: 14 }}>
          Instant UPI checkout. Kisi card ya USD forex fees ka jhanjhat nahi.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {/* Free */}
          <div style={pricingCard}>
            <h3 style={{ fontSize: 18, margin: "0 0 4px" }}>Free Trial</h3>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#2ee86b", margin: "10px 0" }}>₹0</div>
            <ul style={priceUl}>
              <li>2 × 10-min live sessions</li>
              <li>1 free mock interview</li>
              <li>AI notes + PDF report</li>
            </ul>
            <Link href="/dashboard?plan=free" style={{ ...actionBtn, background: "#102316", color: "#2ee86b", border: "1px solid #2ee86b44" }}>
              Start Free
            </Link>
          </div>

          {/* Starter */}
          <div style={pricingCard}>
            <h3 style={{ fontSize: 18, margin: "0 0 4px" }}>Starter Pack</h3>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#2ee86b", margin: "10px 0" }}>₹499</div>
            <ul style={priceUl}>
              <li>5 × 30-min live credits</li>
              <li>Resume + JD personalization</li>
              <li>Full transcripts & notes</li>
              <li>Valid 30 days</li>
            </ul>
            <button onClick={() => openCheckout("Starter Pack", "₹499")} style={{ ...actionBtn, background: "#102316", color: "#2ee86b", border: "1px solid #2ee86b44" }}>
              Pay ₹499 (UPI)
            </button>
          </div>

          {/* Pro */}
          <div style={{ ...pricingCard, border: "2px solid #2ee86b", background: "linear-gradient(180deg, #102316 0%, #0c1710 100%)", position: "relative" }}>
            <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#2ee86b", color: "#04140a", fontSize: 10, fontWeight: 800, padding: "2px 12px", borderRadius: 999 }}>
              MOST POPULAR
            </span>
            <h3 style={{ fontSize: 18, margin: "0 0 4px" }}>Pro Unlimited</h3>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#2ee86b", margin: "10px 0" }}>₹999<small style={{ fontSize: 14, color: "#8ea492" }}>/mo</small></div>
            <ul style={priceUl}>
              <li>Unlimited live sessions</li>
              <li>Gemini Vision coding help</li>
              <li>Priority streaming speed</li>
              <li>All mock interview packs</li>
            </ul>
            <button onClick={() => openCheckout("Pro Unlimited", "₹999/mo")} style={{ ...actionBtn, background: "#2ee86b", color: "#04140a" }}>
              Get Pro ₹999
            </button>
          </div>

          {/* One-shot */}
          <div style={pricingCard}>
            <h3 style={{ fontSize: 18, margin: "0 0 4px" }}>One-shot Pack</h3>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#2ee86b", margin: "10px 0" }}>₹299</div>
            <ul style={priceUl}>
              <li>1 × 60-min live session</li>
              <li>"Kal interview hai" pack</li>
              <li>Valid 7 days</li>
              <li>Full AI report</li>
            </ul>
            <button onClick={() => openCheckout("One-shot Pack", "₹299")} style={{ ...actionBtn, background: "#102316", color: "#2ee86b", border: "1px solid #2ee86b44" }}>
              Pay ₹299 (UPI)
            </button>
          </div>
        </div>
      </section>

      {/* ── WAITLIST / REGISTRATION FORM ── */}
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ background: "#0c1710", border: "1.5px solid #1e3a24", borderRadius: 18, padding: 32 }}>
          <h2 style={{ fontSize: 22, margin: "0 0 6px", textAlign: "center" }}>
            Instant Access Unlock Karo 🦜
          </h2>
          <p style={{ textAlign: "center", color: "#8ea492", fontSize: 13.5, margin: "0 0 22px" }}>
            Details dalo — turant Dashboard activate hoga aur access mil jayega.
          </p>

          {!unlocked ? (
            <form onSubmit={handleWaitlist}>
              <div style={{ marginBottom: 14 }}>
                <label style={formLbl}>Aapka Naam</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tumhara naam" style={formInp} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={formLbl}>Email ya WhatsApp number</label>
                <input required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com / 98XXXXXXXX" style={formInp} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={formLbl}>Target Job Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={formInp}>
                  <option>Backend Engineer</option>
                  <option>Frontend Engineer</option>
                  <option>Full-stack Developer</option>
                  <option>DevOps / Cloud</option>
                  <option>Data / AI Engineer</option>
                  <option>Other</option>
                </select>
              </div>

              <button type="submit" style={{ ...actionBtn, width: "100%", padding: "14px 0", fontSize: 15, background: "#2ee86b", color: "#04140a" }}>
                🚀 Unlock Dashboard & Start
              </button>
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
              <h3 style={{ color: "#2ee86b", margin: "0 0 6px" }}>Access Unlocked!</h3>
              <p style={{ color: "#9db3a0", fontSize: 14 }}>Redirecting to your Dashboard…</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CHECKOUT MODAL ── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0c1710",
              border: "1.5px solid #2ee86b",
              borderRadius: 16,
              padding: "20px 24px",
              maxWidth: 420,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "sticky",
                top: 0,
                float: "right",
                background: "#162b1b",
                border: "1px solid #2ee86b55",
                borderRadius: "50%",
                color: "#e9f2ea",
                width: 28,
                height: 28,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
              }}
            >
              ✕
            </button>

            {!paid ? (
              <>
                <div style={{ fontSize: 11.5, color: "#2ee86b", fontWeight: 700, textTransform: "uppercase" }}>Instant UPI Activation</div>
                <h3 style={{ margin: "2px 0 6px", fontSize: 19 }}>Activate {modalPlan.name}</h3>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#2ee86b", marginBottom: 10 }}>{modalPlan.price}</div>

                <div style={{ background: "#070e09", border: "1.5px solid #2ee86b44", borderRadius: 12, padding: "12px", marginBottom: 14, textAlign: "center" }}>
                  <div style={{ display: "inline-block", background: "#f0f4f8", padding: 6, borderRadius: 12, marginBottom: 8, maxWidth: 190, width: "100%" }}>
                    <img src="/ahmad-upi-qr.jpg" alt="Ahmad Khan Google Pay QR Code" style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block", borderRadius: 8 }} />
                  </div>
                  
                  <div>
                    <span style={{ display: "inline-block", background: "#102113", color: "#2ee86b", padding: "4px 10px", borderRadius: 6, fontSize: 12, border: "1px solid #2ee86b55", fontWeight: 700 }}>
                      ahmadkhankhan6840-1@okaxis
                    </span>
                  </div>
                </div>

                <button onClick={handlePayment} style={{ ...actionBtn, width: "100%", padding: "12px 0", fontSize: 14, background: "#2ee86b", color: "#04140a" }}>
                  ✓ Pay {modalPlan.price} & Activate Dashboard
                </button>
                <div style={{ fontSize: 11, color: "#6e8773", marginTop: 8 }}>
                  🔒 100% Secure · Click outside to close
                </div>
              </>
            ) : (
              <div style={{ padding: "20px 0" }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
                <h3 style={{ color: "#2ee86b", margin: "0 0 6px" }}>Payment Successful!</h3>
                <p style={{ color: "#9db3a0", fontSize: 14 }}>Dashboard par le ja rahe hain…</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #1a281e", padding: "40px 20px", marginTop: 60, background: "#050a06" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🦜</span>
              <span>Rev<span style={{ color: "#2ee86b" }}>.perakit.ai</span></span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#6e8773", maxWidth: 500, lineHeight: 1.6 }}>
              Rev is built for interviews and calls where AI assistance is permitted. Always follow your employer's rules.<br />
              <Link href="/dashboard" style={{ color: "#2ee86b", textDecoration: "none" }}>Dashboard</Link> ·{" "}
              <Link href="/session" style={{ color: "#2ee86b", textDecoration: "none" }}>Live Copilot</Link> ·{" "}
              <Link href="/mock" style={{ color: "#2ee86b", textDecoration: "none" }}>Mock Interview</Link>
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "#6e8773" }}>
            <p style={{ margin: 0 }}>© 2026 Rev.perakit.ai</p>
            <p style={{ margin: "6px 0 0" }}>Made with ❤️ in India 🇮🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const featureCard: React.CSSProperties = {
  background: "#0c150e",
  border: "1px solid #1a2a1e",
  borderRadius: 14,
  padding: 22,
};

const pricingCard: React.CSSProperties = {
  background: "#0c150e",
  border: "1px solid #1a2a1e",
  borderRadius: 16,
  padding: 24,
  display: "flex",
  flexDirection: "column",
};

const priceUl: React.CSSProperties = {
  listStyle: "none",
  margin: "0 0 20px",
  paddingLeft: 0,
  fontSize: 13,
  color: "#9db3a0",
  lineHeight: 1.8,
  flex: 1,
};

const actionBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  fontWeight: 800,
  padding: "11px 18px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  textAlign: "center",
  textDecoration: "none",
  fontSize: 13.5,
  marginTop: "auto",
};

const formLbl: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  color: "#9db3a0",
  marginBottom: 6,
  fontWeight: 600,
};

const formInp: React.CSSProperties = {
  width: "100%",
  background: "#060d07",
  border: "1px solid #1a2c1d",
  borderRadius: 8,
  padding: "11px 14px",
  color: "#e9f2ea",
  fontSize: 13.5,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

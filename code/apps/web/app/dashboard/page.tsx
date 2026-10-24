"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PlanInfo {
  name: string;
  price: string;
  amount: number;
  credits: number;
  features: string[];
}

const PLANS: Record<string, PlanInfo> = {
  free: {
    name: "Free Trial",
    price: "₹0",
    amount: 0,
    credits: 2,
    features: ["2 × 10-min live sessions", "1 free mock interview", "AI notes included"],
  },
  starter: {
    name: "Starter Pack",
    price: "₹499",
    amount: 499,
    credits: 5,
    features: ["5 × 30-min live credits", "Resume personalization", "Full transcripts & notes"],
  },
  pro: {
    name: "Pro Unlimited",
    price: "₹999/mo",
    amount: 999,
    credits: 999,
    features: ["Unlimited live sessions", "Gemini Vision coding help", "Priority streaming speed", "All mock interview packs"],
  },
  oneshot: {
    name: "One-shot Pack",
    price: "₹299",
    amount: 299,
    credits: 1,
    features: ["1 × 60-min live session", "Valid 7 days", "Full AI report card"],
  },
};

export default function DashboardPage() {
  const [userPlan, setUserPlan] = useState("pro");
  const [userName, setUserName] = useState("Candidate");
  const [userEmail, setUserEmail] = useState("candidate@gmail.com");
  const [userRole, setUserRole] = useState("Software Engineer");
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"profile" | "login">("profile");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [paySuccess, setPaySuccess] = useState(false);
  const [payMethod, setPayMethod] = useState<"razorpay" | "upi_qr">("razorpay");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch authenticated session from /api/auth/me
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          if (data.user.name) setUserName(data.user.name);
          if (data.user.email) setUserEmail(data.user.email);
          if (data.user.role) setUserRole(data.user.role);
          if (data.user.plan) setUserPlan(data.user.plan);
        } else {
          // Read user from localStorage fallback
          try {
            const savedUser = localStorage.getItem("rev_user");
            if (savedUser) {
              const u = JSON.parse(savedUser);
              if (u.name) setUserName(u.name);
              if (u.email) setUserEmail(u.email);
              if (u.role) setUserRole(u.role);
              if (u.plan) setUserPlan(u.plan);
            }
          } catch { }
        }
      })
      .catch(() => { });

    // 2. Fetch recent sessions from database /api/sessions/list
    fetch("/api/sessions/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.sessions && data.sessions.length) {
          setRecentSessions(data.sessions);
        }
      })
      .catch(() => { });
  }, []);

  async function handleGoogleLogin() {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGoogle: true, googleName: "Ahmad Khan", email: "ahmad.khan@gmail.com" }),
      });
      const data = await res.json();
      if (data.success) {
        setUserName(data.user.name);
        setUserEmail(data.user.email);
        setUserPlan(data.user.plan);
        localStorage.setItem("rev_user", JSON.stringify(data.user));
        setShowAuthModal(false);
      }
    } catch { }
    finally { setAuthLoading(false); }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail) return;
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, name: loginName || loginEmail.split("@")[0] }),
      });
      const data = await res.json();
      if (data.success) {
        setUserName(data.user.name);
        setUserEmail(data.user.email);
        setUserPlan(data.user.plan);
        localStorage.setItem("rev_user", JSON.stringify(data.user));
        setShowAuthModal(false);
      }
    } catch { }
    finally { setAuthLoading(false); }
  }

  async function handleGuestLogin() {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGuest: true }),
      });
      const data = await res.json();
      if (data.success) {
        setUserName(data.user.name);
        setUserEmail(data.user.email);
        setUserPlan(data.user.plan);
        localStorage.setItem("rev_user", JSON.stringify(data.user));
        setShowAuthModal(false);
      }
    } catch { }
    finally { setAuthLoading(false); }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("rev_user");
    setUserName("Candidate");
    setUserEmail("candidate@gmail.com");
    setUserPlan("free");
    setShowAuthModal(false);
  }

  function handleUpdateRole(newRole: string) {
    setUserRole(newRole);
    const updated = { name: userName, email: userEmail, role: newRole, plan: userPlan };
    localStorage.setItem("rev_user", JSON.stringify(updated));
  }

  function handlePayment(planKey: string) {
    setSelectedPlan(planKey);
    setPayError("");
    setShowPayModal(true);
  }

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handlePay() {
    setPayError("");
    const plan = PLANS[selectedPlan];
    if (!plan || plan.amount === 0) {
      confirmSuccess();
      return;
    }

    setPayLoading(true);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: selectedPlan, amount: plan.amount }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Order creation failed");
      }

      if (!data.mock && data.keyId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Razorpay SDK load nahi hua.");
        }

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: "Rev.perakit.ai",
          description: `${plan.name} Activation`,
          order_id: data.orderId,
          theme: { color: "#2ee86b" },
          handler: async function (response: any) {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planKey: selectedPlan,
              }),
            });
            const vData = await verifyRes.json();
            if (vData.success) {
              confirmSuccess();
            } else {
              setPayError("Payment verification fail ho gaya.");
            }
          },
          prefill: {
            name: userName,
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          setPayError(`Payment failed: ${resp.error?.description || "Payment cancel ho gaya"}`);
        });
        rzp.open();
      } else {
        setPayMethod("upi_qr");
      }
    } catch (err: any) {
      setPayError(err.message || "Payment process nahi ho saka.");
    } finally {
      setPayLoading(false);
    }
  }

  function confirmSuccess() {
    setUserPlan(selectedPlan);
    setPaySuccess(true);
    const updated = { name: userName, role: userRole, plan: selectedPlan };
    localStorage.setItem("rev_user", JSON.stringify(updated));
    setTimeout(() => {
      setShowPayModal(false);
      setPaySuccess(false);
    }, 2000);
  }

  function copyUPI(vpa: string) {
    navigator.clipboard.writeText(vpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  }

  const cur = PLANS[userPlan] || PLANS.pro;

  return (
    <div style={{ minHeight: "100vh", background: "#060b07", color: "#e9f2ea", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── TOP NAV BAR ── */}
      <nav style={{ background: "rgba(6, 14, 8, 0.9)", borderBottom: "1px solid #1a281e", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800 }}>
              <span style={{ fontSize: 24 }}>🦜</span>
              <span>Rev<span style={{ color: "#2ee86b" }}>.perakit.ai</span></span>
            </Link>
            <div style={{ display: "flex", gap: 14, fontSize: 13.5 }}>
              <Link href="/dashboard" style={{ color: "#2ee86b", textDecoration: "none", fontWeight: 700 }}>Dashboard</Link>
              <Link href="/session" style={{ color: "#9db3a0", textDecoration: "none" }}>Live Copilot</Link>
              <Link href="/mock" style={{ color: "#9db3a0", textDecoration: "none" }}>Mock Interview</Link>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, background: "#112616", color: "#2ee86b", border: "1px solid #2ee86b55", padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
              ● {cur.name} ({cur.credits > 50 ? "Unlimited" : `${cur.credits} credits`})
            </span>
            <button
              onClick={() => setShowAuthModal(true)}
              title="Manage Account / Sign In"
              style={{
                background: "#0d2113",
                border: "1px solid #2ee86b55",
                borderRadius: 999,
                padding: "3px 12px 3px 4px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                color: "#e9f2ea",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1b3322", color: "#2ee86b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, border: "1px solid #2ee86b" }}>
                {userName[0]?.toUpperCase() || "U"}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── DASHBOARD BODY ── */}
      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "36px 24px" }}>

        {/* Welcome Banner */}
        <div style={{ background: "linear-gradient(135deg, #0d2113 0%, #08140b 100%)", border: "1.5px solid #1e3a24", borderRadius: 18, padding: "28px 32px", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: "#2ee86b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Welcome back, {userName}!
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>
              Ready for your next interview?
            </h1>
            <p style={{ margin: 0, color: "#9db3a0", fontSize: 14, maxWidth: 540 }}>
              Rev is active and loaded with your resume context. Launch live stealth assistance or test with a simulated AI interviewer.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href="/session"
              style={{
                background: "#2ee86b", color: "#04140a", fontWeight: 800, padding: "13px 24px",
                borderRadius: 10, textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(46,232,107,0.3)"
              }}
            >
              🦜 Launch Live Copilot
            </Link>
            <Link
              href="/mock"
              style={{
                background: "#102316", color: "#2ee86b", border: "1.5px solid #2ee86b", fontWeight: 700, padding: "13px 22px",
                borderRadius: 10, textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              🎤 Start Mock Interview
            </Link>
          </div>
        </div>

        {/* ── 3 COLUMN ACTION CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 36 }}>

          {/* Card 1: Live Copilot */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ fontSize: 32 }}>⚡</div>
              <span style={{ fontSize: 11, background: "#ff3b3022", color: "#ff5f57", border: "1px solid #ff3b3055", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                STEALTH READY
              </span>
            </div>
            <h3 style={{ fontSize: 18, margin: "0 0 8px" }}>Live Interview Copilot</h3>
            <p style={{ color: "#8ea492", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 18px" }}>
              Meet, Zoom ya Teams call me tab audio jodo. Rev interviewer ka sawal sunta hai aur 3 second me resume-aligned answers stream karta hai.
            </p>
            <div style={{ fontSize: 12, color: "#2ee86b", marginBottom: 16 }}>
              ✓ Alt+H Instant Hide &nbsp;·&nbsp; ✓ Popup Window &nbsp;·&nbsp; ✓ Camouflage
            </div>
            <Link href="/session" style={actionBtnPrimary}>
              Start Live Session →
            </Link>
          </div>

          {/* Card 2: AI Mock Interview */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ fontSize: 32 }}>🎤</div>
              <span style={{ fontSize: 11, background: "#133b1e", color: "#2ee86b", border: "1px solid #2ee86b55", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                VOICE TTS
              </span>
            </div>
            <h3 style={{ fontSize: 18, margin: "0 0 8px" }}>AI Mock Interview</h3>
            <p style={{ color: "#8ea492", fontSize: 13.5, lineHeight: 1.6, margin: "0 0 18px" }}>
              FAANG & top tech style mock interview rounds. AI sawal bolkar puchega, mic par jawab do aur instantaneous 100-point report card pao.
            </p>
            <div style={{ fontSize: 12, color: "#2ee86b", marginBottom: 16 }}>
              ✓ Technical Coding &nbsp;·&nbsp; ✓ System Design &nbsp;·&nbsp; ✓ Behavioral STAR
            </div>
            <Link href="/mock" style={actionBtnSecondary}>
              Practice Mock Interview →
            </Link>
          </div>

          {/* Card 3: Membership & Billing */}
          <div style={{ ...cardStyle, background: "linear-gradient(180deg, #101c13 0%, #0a130c 100%)", borderColor: "#284a30" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ fontSize: 32 }}>💳</div>
              <span style={{ fontSize: 11, background: "#2ee86b", color: "#04140a", padding: "3px 10px", borderRadius: 999, fontWeight: 800 }}>
                {cur.name.toUpperCase()}
              </span>
            </div>
            <h3 style={{ fontSize: 18, margin: "0 0 4px" }}>Plan: {cur.name}</h3>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#2ee86b", margin: "6px 0 12px" }}>
              {cur.price}
            </div>
            <ul style={{ margin: "0 0 18px", paddingLeft: 18, fontSize: 13, color: "#9db3a0", lineHeight: 1.6 }}>
              {cur.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <button onClick={() => handlePayment("pro")} style={actionBtnUpgrade}>
              ⚡ Upgrade / Change Plan
            </button>
          </div>
        </div>

        {/* ── RECENT SESSIONS & PERFORMANCE ── */}
        <div style={{ background: "#0a130c", border: "1px solid #1a281e", borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>📊 Recent Practice & Notes</h2>
            <Link href="/session" style={{ color: "#2ee86b", fontSize: 13, textDecoration: "none" }}>
              + New Session
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1b2e1f", color: "#7a917e", fontSize: 12, textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 14px" }}>Session / Role</th>
                  <th style={{ padding: "10px 14px" }}>Type</th>
                  <th style={{ padding: "10px 14px" }}>Date</th>
                  <th style={{ padding: "10px 14px" }}>Performance</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #132217" }}>
                    <td style={{ padding: "14px", fontWeight: 600 }}>{s.role}</td>
                    <td style={{ padding: "14px", color: "#9db3a0" }}>{s.type}</td>
                    <td style={{ padding: "14px", color: "#7a917e", fontSize: 13 }}>{s.date}</td>
                    <td style={{ padding: "14px" }}>
                      <span style={{ color: s.score >= 80 ? "#2ee86b" : "#ffb02e", fontWeight: 700 }}>
                        {s.score}/100
                      </span>
                    </td>
                    <td style={{ padding: "14px", textAlign: "right" }}>
                      <Link href="/mock" style={{ color: "#2ee86b", textDecoration: "none", fontSize: 13, marginRight: 12 }}>
                        Review
                      </Link>
                      <Link href="/session" style={{ color: "#9db3a0", textDecoration: "none", fontSize: 13 }}>
                        Retake
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── PAYMENT / CHECKOUT MODAL ── */}
      {showPayModal && (
        <div
          onClick={() => setShowPayModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0c1710",
              border: "1.5px solid #2ee86b",
              borderRadius: 16,
              padding: "20px 24px",
              maxWidth: 440,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            }}
          >
            {/* Sticky Close Button */}
            <button
              onClick={() => setShowPayModal(false)}
              title="Close (Esc)"
              style={{
                position: "sticky",
                top: 0,
                float: "right",
                background: "#162b1b",
                border: "1px solid #2ee86b55",
                borderRadius: "50%",
                color: "#e9f2ea",
                width: 30,
                height: 30,
                fontSize: 16,
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

            {!paySuccess ? (
              <>
                <div style={{ fontSize: 11.5, color: "#2ee86b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Instant UPI / Card Activation
                </div>
                <h2 style={{ margin: "2px 0 4px", fontSize: 19 }}>
                  Upgrade to {PLANS[selectedPlan]?.name}
                </h2>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#2ee86b", marginBottom: 10 }}>
                  {PLANS[selectedPlan]?.price}
                </div>

                {/* Plan picker pills - Clean 2x2 grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 12 }}>
                  {Object.entries(PLANS).map(([k, p]) => (
                    <button
                      key={k}
                      onClick={() => { setSelectedPlan(k); setPayError(""); }}
                      style={{
                        background: selectedPlan === k ? "#163a20" : "#09120b",
                        border: `1.5px solid ${selectedPlan === k ? "#2ee86b" : "#1a2c1d"}`,
                        color: selectedPlan === k ? "#2ee86b" : "#9db3a0",
                        padding: "7px 8px",
                        borderRadius: 8,
                        fontSize: 11.5,
                        cursor: "pointer",
                        fontWeight: 700,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{p.name}</span>
                      <span style={{ color: selectedPlan === k ? "#fff" : "#2ee86b" }}>{p.price}</span>
                    </button>
                  ))}
                </div>

                {/* Method selector tabs */}
                <div style={{ display: "flex", background: "#060d07", borderRadius: 8, padding: 3, marginBottom: 12, border: "1px solid #1a2c1d" }}>
                  <button
                    onClick={() => setPayMethod("razorpay")}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      fontSize: 11,
                      fontWeight: 700,
                      background: payMethod === "razorpay" ? "#163a20" : "transparent",
                      color: payMethod === "razorpay" ? "#2ee86b" : "#7a917e",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Razorpay Gateway
                  </button>
                  <button
                    onClick={() => setPayMethod("upi_qr")}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      fontSize: 11,
                      fontWeight: 700,
                      background: payMethod === "upi_qr" ? "#163a20" : "transparent",
                      color: payMethod === "upi_qr" ? "#2ee86b" : "#7a917e",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    📱 Direct UPI QR Scan
                  </button>
                </div>

                {payError && (
                  <div style={{ background: "#330a0a", border: "1px solid #ff3b30", color: "#ff8080", padding: "6px 10px", borderRadius: 6, fontSize: 11.5, marginBottom: 10 }}>
                    ⚠️ {payError}
                  </div>
                )}

                {payMethod === "razorpay" ? (
                  <>
                    <div style={{ background: "#070e09", border: "1px solid #1c3523", borderRadius: 10, padding: "14px", textAlign: "center", marginBottom: 14 }}>
                      <div style={{ fontSize: 26, marginBottom: 4 }}>💳</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e9f2ea" }}>Instant Online Checkout</div>
                      <div style={{ fontSize: 11.5, color: "#7a917e", marginTop: 4 }}>
                        UPI (GPay / PhonePe / Paytm) · Cards · NetBanking
                      </div>
                    </div>

                    <button
                      onClick={handlePay}
                      disabled={payLoading}
                      style={{ ...actionBtnPrimary, width: "100%", padding: "12px 0", fontSize: 14, cursor: payLoading ? "wait" : "pointer", opacity: payLoading ? 0.7 : 1 }}
                    >
                      {payLoading ? "Connecting Gateway…" : `✓ Pay ${PLANS[selectedPlan]?.price} via Razorpay`}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Direct UPI QR Code (Compact and clean) */}
                    <div style={{ background: "#070e09", border: "1.5px solid #2ee86b44", borderRadius: 12, padding: "12px", textAlign: "center", marginBottom: 12 }}>
                      <div style={{ display: "inline-block", background: "#f0f4f8", padding: 6, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.6)", marginBottom: 8, maxWidth: 200, width: "100%" }}>
                        <img
                          src="/ahmad-upi-qr.jpg"
                          alt="Ahmad Khan Google Pay QR Code"
                          style={{ width: "100%", maxHeight: 210, objectFit: "contain", display: "block", borderRadius: 8 }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                        <code style={{ background: "#102113", color: "#2ee86b", padding: "4px 8px", borderRadius: 5, fontSize: 11.5, border: "1px solid #2ee86b55", fontWeight: 700 }}>
                          ahmadkhankhan6840-1@okaxis
                        </code>
                        <button
                          onClick={() => copyUPI("ahmadkhankhan6840-1@okaxis")}
                          style={{ background: "#1a3a22", border: "1px solid #2ee86b", color: "#2ee86b", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                        >
                          {copiedUpi ? "✓ Copied!" : "📋 Copy"}
                        </button>
                      </div>

                      <a
                        href={`upi://pay?pa=ahmadkhankhan6840-1@okaxis&pn=Ahmad%20Khan&am=${PLANS[selectedPlan]?.amount || 0}&cu=INR`}
                        style={{ display: "inline-block", fontSize: 11.5, color: "#2ee86b", textDecoration: "underline", fontWeight: 600 }}
                      >
                        📱 Mobile pe direct UPI App me kholne ke liye click karein
                      </a>
                    </div>

                    <button
                      onClick={confirmSuccess}
                      style={{ ...actionBtnPrimary, width: "100%", padding: "12px 0", fontSize: 14 }}
                    >
                      ✓ Maine Pay Kar Diya (Instant Activate)
                    </button>
                  </>
                )}

                <div style={{ textAlign: "center", fontSize: 11, color: "#6e8773", marginTop: 8 }}>
                  🔒 100% Secure · Click outside to close
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <h2 style={{ fontSize: 22, color: "#2ee86b", margin: "0 0 8px" }}>Payment Successful!</h2>
                <p style={{ color: "#9db3a0", fontSize: 14 }}>
                  Tumhara <b>{PLANS[selectedPlan]?.name}</b> plan activate ho gaya hai. Ab aapke pass unlimited access hai!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── ACCOUNT / AUTH MODAL ── */}
      {showAuthModal && (
        <div
          onClick={() => setShowAuthModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0c1710",
              border: "1.5px solid #2ee86b",
              borderRadius: 16,
              padding: "24px 28px",
              maxWidth: 420,
              width: "100%",
              position: "relative",
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            }}
          >
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                position: "absolute",
                top: 14,
                right: 16,
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
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#163a20", color: "#2ee86b", border: "2px solid #2ee86b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, margin: "0 auto 10px" }}>
                {userName[0]?.toUpperCase() || "U"}
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 20 }}>{userName}</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#8ea492" }}>{userEmail || "Connected Candidate Account"}</p>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 11.5, background: "#102616", color: "#2ee86b", border: "1px solid #2ee86b55", padding: "3px 10px", borderRadius: 999, fontWeight: 700 }}>
                  ● Plan: {cur.name} ({cur.credits > 50 ? "Unlimited Access" : `${cur.credits} Credits Remaining`})
                </span>
              </div>
            </div>

            {/* Target Role Selector */}
            <div style={{ marginBottom: 18, background: "#060d07", border: "1px solid #1a2c1d", borderRadius: 10, padding: "12px 14px" }}>
              <label style={{ display: "block", fontSize: 12, color: "#8ea492", fontWeight: 700, marginBottom: 6 }}>
                🎯 Target Interview Role:
              </label>
              <select
                value={userRole}
                onChange={(e) => handleUpdateRole(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0c1710",
                  border: "1px solid #2ee86b55",
                  borderRadius: 6,
                  color: "#e9f2ea",
                  padding: "8px 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option>Software Engineer</option>
                <option>Senior Backend Engineer</option>
                <option>Frontend Specialist</option>
                <option>Full-Stack Developer</option>
                <option>System Design Lead</option>
                <option>DevOps & Cloud Engineer</option>
                <option>Data Engineer / AI</option>
                <option>Engineering Manager</option>
              </select>
            </div>

            {/* 1-Click Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              style={{
                width: "100%",
                background: "#ffffff",
                color: "#1f1f1f",
                fontWeight: 700,
                padding: "11px 16px",
                borderRadius: 8,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontSize: 13.5,
                cursor: authLoading ? "wait" : "pointer",
                marginBottom: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{authLoading ? "Signing In…" : "Continue with Google (Free)"}</span>
            </button>

            {/* Instant Demo Candidate Login */}
            <button
              onClick={handleGuestLogin}
              disabled={authLoading}
              style={{
                width: "100%",
                background: "#122b17",
                color: "#2ee86b",
                border: "1px solid #2ee86b55",
                fontWeight: 700,
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 14,
              }}
            >
              ⚡ Instant 1-Click Guest Access
            </button>

            {/* Logout / Switch Account */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1a2c1d", paddingTop: 12 }}>
              <span style={{ fontSize: 11.5, color: "#6e8773" }}>🔒 Secure Session Active</span>
              <button
                onClick={handleLogout}
                style={{ background: "transparent", border: "none", color: "#ff8080", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#0c150e",
  border: "1px solid #1a2a1e",
  borderRadius: 16,
  padding: 24,
  display: "flex",
  flexDirection: "column",
};

const actionBtnPrimary: React.CSSProperties = {
  background: "#2ee86b",
  color: "#04140a",
  fontWeight: 800,
  padding: "12px 20px",
  borderRadius: 8,
  textDecoration: "none",
  textAlign: "center",
  cursor: "pointer",
  fontSize: 14,
  border: "none",
};

const actionBtnSecondary: React.CSSProperties = {
  background: "#102316",
  color: "#2ee86b",
  border: "1.5px solid #2ee86b",
  fontWeight: 700,
  padding: "12px 20px",
  borderRadius: 8,
  textDecoration: "none",
  textAlign: "center",
  cursor: "pointer",
  fontSize: 14,
};

const actionBtnUpgrade: React.CSSProperties = {
  background: "#193c23",
  color: "#2ee86b",
  border: "1px solid #2ee86b",
  fontWeight: 700,
  padding: "11px 20px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13.5,
  width: "100%",
  marginTop: "auto",
};

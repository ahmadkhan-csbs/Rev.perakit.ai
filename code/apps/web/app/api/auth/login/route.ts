import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password, isGoogle, googleName, isGuest } = await req.json();

    let user;
    if (isGuest) {
      user = {
        id: "usr_guest_" + Math.random().toString(36).slice(2, 7),
        name: "Guest Candidate",
        email: "guest@rev.perakit.ai",
        role: "Software Engineer",
        plan: "pro",
        credits: 999,
        createdAt: new Date().toISOString(),
      };
    } else if (isGoogle) {
      user = {
        id: "usr_g_" + Math.random().toString(36).slice(2, 9),
        name: googleName || (email ? email.split("@")[0] : "Google Candidate"),
        email: email || "candidate@gmail.com",
        role: "Full-Stack Developer",
        plan: "pro",
        credits: 999,
        createdAt: new Date().toISOString(),
      };
    } else {
      if (!email) {
        return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
      }
      user = {
        id: "usr_" + Math.random().toString(36).slice(2, 9),
        name: email.split("@")[0],
        email,
        role: "Backend Engineer",
        plan: "pro",
        credits: 999,
        createdAt: new Date().toISOString(),
      };
    }

    const cookieStore = await cookies();
    cookieStore.set("rev_session", JSON.stringify(user), {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

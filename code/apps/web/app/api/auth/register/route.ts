import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const user = {
      id: "usr_" + Math.random().toString(36).slice(2, 10),
      name: name || email.split("@")[0],
      email,
      role: role || "Software Engineer",
      plan: "free",
      credits: 2,
      createdAt: new Date().toISOString(),
    };

    const cookieStore = await cookies();
    cookieStore.set("rev_session", JSON.stringify(user), {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const session = cookieStore.get("rev_session")?.value;
    const user = session ? JSON.parse(session) : null;

    const newSession = {
      id: "sess_" + Date.now(),
      userId: user?.id || "guest",
      role: body.role || "Technical Interview",
      type: body.type || "Live Session",
      duration: body.duration || "15 mins",
      score: body.score ?? 85,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "Completed",
      notes: body.notes || null,
      qaCount: body.qaCount || 0,
    };

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

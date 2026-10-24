import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("rev_session")?.value;
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user: JSON.parse(session) });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

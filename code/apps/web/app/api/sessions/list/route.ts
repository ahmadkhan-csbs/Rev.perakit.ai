import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    sessions: [
      {
        id: "s1",
        role: "Senior Backend Engineer (System Design)",
        date: "Today, 12:10 PM",
        score: 85,
        duration: "18 mins",
        type: "Mock Interview",
        status: "Completed",
      },
      {
        id: "s2",
        role: "Fullstack Lead (React & Node.js)",
        date: "Yesterday",
        score: 78,
        duration: "32 mins",
        type: "Live Session",
        status: "Completed",
      },
      {
        id: "s3",
        role: "Data Structures & Algorithms (TCS/Wipro)",
        date: "3 days ago",
        score: 92,
        duration: "24 mins",
        type: "Mock Interview",
        status: "Completed",
      },
    ],
  });
}

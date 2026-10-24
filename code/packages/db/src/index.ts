// @rev/db — optional DB save (silently skips if DATABASE_URL not set)
export interface SessionData {
  role?: string;
  jobDescription?: string;
  instructions?: string;
  startedAt: Date;
  endedAt: Date;
  billedSeconds: number;
  transcript: { speaker: string; text: string }[];
  notes?: unknown;
}

export async function saveSessionToDb(data: SessionData): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    // Prisma import only when DB is configured
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await (prisma as any).session.create({ data: { ...data, transcript: JSON.stringify(data.transcript), notes: JSON.stringify(data.notes) } });
    await prisma.$disconnect();
    return true;
  } catch {
    return false;
  }
}

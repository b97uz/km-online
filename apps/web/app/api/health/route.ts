import { prisma } from "@km/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("HEALTH_DB_ERROR", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

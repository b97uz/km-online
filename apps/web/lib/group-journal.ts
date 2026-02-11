import { prisma } from "@km/db";
import { JournalAttendance } from "@prisma/client";
import { SessionPayload } from "@/lib/auth";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getCurrentMonthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isValidMonthKey(value: string): boolean {
  return MONTH_RE.test(value.trim());
}

export function parseDateOnlyUtc(value: string): Date | null {
  const raw = value.trim();
  const match = raw.match(DATE_RE);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function monthKeyFromDate(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function startOfTodayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function formatUzDateOnly(value: Date): string {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${d}.${m}.${y}`;
}

export function parseJournalAttendance(value: string): JournalAttendance | null {
  const raw = value.trim().toUpperCase();
  if (raw === "PRESENT") return JournalAttendance.PRESENT;
  if (raw === "ABSENT") return JournalAttendance.ABSENT;
  if (raw === "EXCUSED") return JournalAttendance.EXCUSED;
  return null;
}

export function formatJournalAttendance(value: JournalAttendance): string {
  if (value === JournalAttendance.PRESENT) return "KELDI";
  if (value === JournalAttendance.ABSENT) return "KELMADI";
  return "SABABLI";
}

export async function canAccessGroupForJournal(session: SessionPayload, groupId: string): Promise<boolean> {
  if (session.role === "ADMIN") {
    const group = await prisma.groupCatalog.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    return Boolean(group);
  }

  const group = await prisma.groupCatalog.findFirst({
    where: {
      id: groupId,
      curatorId: session.userId,
    },
    select: { id: true },
  });
  return Boolean(group);
}

export function parseOptionalScore(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;

  const score = Number(raw);
  if (!Number.isInteger(score) || score < 0 || score > 100) return null;
  return score;
}

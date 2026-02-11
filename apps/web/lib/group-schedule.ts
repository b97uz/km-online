import { prisma } from "@km/db";

type DaysValue = "DU_CHOR_JU" | "SE_PAY_SHAN";
type CuratorWorkDaysValue = DaysValue | "HAR_KUNI";

export function normalizeDays(value: string): DaysValue | null {
  const raw = value.trim().toUpperCase();
  if (!raw) return null;

  const compact = raw.replace(/[\s\-]/g, "_");
  if (compact === "DU_CHOR_JU" || compact === "DU_CHO_JU") return "DU_CHOR_JU";
  if (compact === "SE_PAY_SHAN") return "SE_PAY_SHAN";

  if (raw.includes("DU") && (raw.includes("CHOR") || raw.includes("CHO")) && raw.includes("JU")) return "DU_CHOR_JU";
  if (raw.includes("SE") && raw.includes("PAY") && raw.includes("SHAN")) return "SE_PAY_SHAN";

  return null;
}

export function formatDays(days: DaysValue): string {
  return days === "DU_CHOR_JU" ? "Du-Chor-Ju" : "Se-Pay-Shan";
}

export function parseCuratorWorkDays(value: string): CuratorWorkDaysValue | null {
  const raw = value.trim().toUpperCase();
  if (!raw) return null;
  if (raw === "HAR_KUNI") return "HAR_KUNI";
  if (raw === "DU_CHOR_JU" || raw === "DU_CHO_JU") return "DU_CHOR_JU";
  if (raw === "SE_PAY_SHAN") return "SE_PAY_SHAN";
  return null;
}

export function formatCuratorWorkDays(value: string | null): string {
  const parsed = parseCuratorWorkDays(value ?? "");
  if (parsed === "DU_CHOR_JU") return "Du-Chor-Ju";
  if (parsed === "SE_PAY_SHAN") return "Se-Pay-Shan";
  if (parsed === "HAR_KUNI") return "Har kuni";
  return "-";
}

export function normalizeClock(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function extractRange(raw: string): { start: string | null; end: string | null } {
  const range = raw.match(/(\d{1,2}:[0-5]\d)\s*-\s*(\d{1,2}:[0-5]\d)/);
  if (!range) return { start: null, end: null };

  const start = normalizeClock(range[1]);
  const end = normalizeClock(range[2]);
  return { start, end };
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}

export async function validateCuratorTimeConstraints(input: {
  curatorId: string | null;
  days: DaysValue;
  startTime: string;
  endTime: string;
  excludeGroupId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { curatorId, days, startTime, endTime, excludeGroupId } = input;

  if (!curatorId) return { ok: true };

  const curator = await prisma.user.findFirst({
    where: { id: curatorId, role: "CURATOR", isActive: true },
    include: {
      curatorProfile: true,
      catalogGroups: {
        where: {
          ...(excludeGroupId ? { id: { not: excludeGroupId } } : {}),
          status: { not: "YOPIQ" },
        },
        select: {
          id: true,
          code: true,
          days: true,
          time: true,
          scheduleText: true,
        },
      },
    },
  });

  if (!curator || !curator.curatorProfile) {
    return { ok: false, error: "Kurator topilmadi yoki faol emas" };
  }

  const workStart = normalizeClock(curator.curatorProfile.workStart ?? "");
  const workEnd = normalizeClock(curator.curatorProfile.workEnd ?? "");
  if (!workStart || !workEnd || toMinutes(workStart) >= toMinutes(workEnd)) {
    return { ok: false, error: "Kurator ish vaqti to'g'ri sozlanmagan" };
  }

  const workDays = parseCuratorWorkDays(curator.curatorProfile.workDays ?? "HAR_KUNI") ?? "HAR_KUNI";
  if (workDays !== "HAR_KUNI" && workDays !== days) {
    return {
      ok: false,
      error: `Kuratorning ish kuni emas (${formatDays(days)}). Kurator ish kunlari: ${formatCuratorWorkDays(workDays)}`,
    };
  }

  if (toMinutes(startTime) < toMinutes(workStart) || toMinutes(endTime) > toMinutes(workEnd)) {
    return {
      ok: false,
      error: `Dars vaqti kurator ish vaqtidan tashqarida (${workStart}-${workEnd})`,
    };
  }

  const conflict = curator.catalogGroups.find((group) => {
    const groupDays = normalizeDays(group.days ?? group.scheduleText);
    if (!groupDays || groupDays !== days) return false;

    const range = extractRange(group.time ?? group.scheduleText);
    if (!range.start || !range.end) return false;

    return rangesOverlap(startTime, endTime, range.start, range.end);
  });

  if (conflict) {
    return {
      ok: false,
      error: `Bu vaqtda kuratorning boshqa guruhi bor (${conflict.code})`,
    };
  }

  return { ok: true };
}

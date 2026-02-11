import { GroupCatalogStatus } from "@prisma/client";
import { getDebt } from "@/lib/payments";

function addMonthsKeepingDay(date: Date, months: number): Date {
  const source = new Date(date);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
}

export function formatUzDate(value: Date): string {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${d}.${m}.${y}`;
}

export function calculateOpenGroupExtraDebt(input: {
  periodEnd: Date | null;
  groupStatus: GroupCatalogStatus | null;
  groupPriceMonthly: number | null;
  now?: Date;
}): {
  extraDebt: number;
  extraPeriods: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  const { periodEnd, groupStatus, groupPriceMonthly } = input;
  const now = input.now ?? new Date();

  if (!periodEnd || groupStatus !== GroupCatalogStatus.OCHIQ || !groupPriceMonthly || groupPriceMonthly <= 0) {
    return {
      extraDebt: 0,
      extraPeriods: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }

  const periodEndUtc = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), periodEnd.getUTCDate()));
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (todayUtc <= periodEndUtc) {
    return {
      extraDebt: 0,
      extraPeriods: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }

  let extraPeriods = 0;
  let cursor = new Date(periodEndUtc);

  while (cursor <= todayUtc) {
    extraPeriods += 1;
    cursor = addMonthsKeepingDay(periodEndUtc, extraPeriods);
  }

  const currentPeriodStart = addMonthsKeepingDay(periodEndUtc, Math.max(extraPeriods - 1, 0));
  const currentPeriodEnd = addMonthsKeepingDay(periodEndUtc, extraPeriods);

  return {
    extraDebt: extraPeriods * groupPriceMonthly,
    extraPeriods,
    currentPeriodStart,
    currentPeriodEnd,
  };
}

export function calculatePaymentDebtWithToday(input: {
  amountRequired: number;
  discount: number;
  amountPaid: number;
  periodEnd: Date | null;
  groupStatus: GroupCatalogStatus | null;
  groupPriceMonthly: number | null;
  now?: Date;
}) {
  const baseDebt = getDebt(input.amountRequired, input.discount, input.amountPaid);
  const extra = calculateOpenGroupExtraDebt({
    periodEnd: input.periodEnd,
    groupStatus: input.groupStatus,
    groupPriceMonthly: input.groupPriceMonthly,
    now: input.now,
  });

  return {
    baseDebt,
    extraDebt: extra.extraDebt,
    totalDebt: baseDebt + extra.extraDebt,
    extraPeriods: extra.extraPeriods,
    currentPeriodStart: extra.currentPeriodStart,
    currentPeriodEnd: extra.currentPeriodEnd,
  };
}

export type TodayAwarePaymentRow = {
  id: string;
  studentId: string;
  groupId: string | null;
  amountRequired: number;
  amountPaid: number;
  discount: number;
  periodEnd: Date | null;
  group: {
    status: GroupCatalogStatus;
    priceMonthly: number;
  } | null;
};

export type TodayAwareDebtInfo = {
  baseDebt: number;
  extraDebt: number;
  totalDebt: number;
  extraPeriods: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
};

export function calculateTodayAwareDebtMap(
  rows: TodayAwarePaymentRow[],
  now: Date = new Date(),
): {
  byPaymentId: Map<string, TodayAwareDebtInfo>;
  totalBaseDebt: number;
  totalExtraDebt: number;
  totalDebt: number;
} {
  const byPaymentId = new Map<string, TodayAwareDebtInfo>();
  const latestByStudentGroup = new Map<string, TodayAwarePaymentRow>();

  for (const row of rows) {
    const baseDebt = getDebt(row.amountRequired, row.discount, row.amountPaid);
    byPaymentId.set(row.id, {
      baseDebt,
      extraDebt: 0,
      totalDebt: baseDebt,
      extraPeriods: 0,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });

    if (!row.groupId || !row.periodEnd) continue;

    const key = `${row.studentId}:${row.groupId}`;
    const prev = latestByStudentGroup.get(key);
    if (!prev || (prev.periodEnd && prev.periodEnd.getTime() < row.periodEnd.getTime())) {
      latestByStudentGroup.set(key, row);
    }
  }

  let totalBaseDebt = 0;
  let totalExtraDebt = 0;

  for (const debtInfo of byPaymentId.values()) {
    totalBaseDebt += debtInfo.baseDebt;
  }

  for (const latestRow of latestByStudentGroup.values()) {
    const existing = byPaymentId.get(latestRow.id);
    if (!existing) continue;

    const extra = calculateOpenGroupExtraDebt({
      periodEnd: latestRow.periodEnd,
      groupStatus: latestRow.group?.status ?? null,
      groupPriceMonthly: latestRow.group?.priceMonthly ?? null,
      now,
    });

    if (!extra.extraDebt) continue;

    existing.extraDebt = extra.extraDebt;
    existing.totalDebt = existing.baseDebt + extra.extraDebt;
    existing.extraPeriods = extra.extraPeriods;
    existing.currentPeriodStart = extra.currentPeriodStart;
    existing.currentPeriodEnd = extra.currentPeriodEnd;
    totalExtraDebt += extra.extraDebt;
  }

  return {
    byPaymentId,
    totalBaseDebt,
    totalExtraDebt,
    totalDebt: totalBaseDebt + totalExtraDebt,
  };
}

export function buildPeriodNote(start: Date, end: Date): string {
  return `${formatUzDate(start)}-${formatUzDate(end)}`;
}

export function parseDateInput(value: string): Date | null {
  const raw = value.trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function addOneMonthFromDateInput(start: Date): Date {
  return addMonthsKeepingDay(start, 1);
}

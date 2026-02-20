import { PaymentCheckoutStatus, PaymentMethod, PaymentProvider, Prisma, Subjects } from "@prisma/client";
import { calculateOpenGroupExtraDebt } from "@/lib/payment-debt";
import { getPaymentStatus } from "@/lib/payments";

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

function monthFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function appendNote(base: string | null, extra: string): string {
  const trimmed = (base ?? "").trim();
  if (!trimmed) return extra;
  if (trimmed.includes(extra)) return trimmed;
  return `${trimmed}\n${extra}`;
}

function parseSubjectFromGroupFan(value: string): Subjects {
  const raw = value.trim().toLowerCase();
  const hasChemistry = raw.includes("kimyo") || raw.includes("chemistry");
  const hasBiology = raw.includes("biologiya") || raw.includes("biology");
  if (hasChemistry && hasBiology) return Subjects.BOTH;
  if (hasChemistry) return Subjects.CHEMISTRY;
  if (hasBiology) return Subjects.BIOLOGY;
  return Subjects.BOTH;
}

export function providerToPaymentMethod(provider: PaymentProvider): PaymentMethod {
  if (provider === PaymentProvider.PAYME) return PaymentMethod.PAYME;
  if (provider === PaymentProvider.CLICK) return PaymentMethod.CLICK;
  if (provider === PaymentProvider.UZUM) return PaymentMethod.UZUM;
  if (provider === PaymentProvider.PAYNET) return PaymentMethod.PAYNET;
  return PaymentMethod.BANK;
}

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

export type ApplyCheckoutPaymentResult = {
  checkoutId: string;
  status: PaymentCheckoutStatus;
  requestedAmount: number;
  appliedAmount: number;
  remainingAmount: number;
};

export async function applyCheckoutPayment(input: {
  tx: Prisma.TransactionClient;
  checkoutId: string;
  callbackToken?: string;
  provider?: PaymentProvider;
  amountPaid?: number;
  externalTxnId?: string | null;
  externalStatus?: string | null;
  payload?: Prisma.InputJsonValue;
  paidAt?: Date;
}) : Promise<ApplyCheckoutPaymentResult> {
  const {
    tx,
    checkoutId,
    callbackToken,
    provider,
    externalTxnId,
    externalStatus,
    payload,
  } = input;

  const checkout = await tx.paymentCheckout.findUnique({
    where: { id: checkoutId },
    include: {
      group: {
        select: {
          id: true,
          code: true,
          fan: true,
          priceMonthly: true,
          status: true,
        },
      },
    },
  });

  if (!checkout) {
    throw new Error("CHECKOUT_NOT_FOUND");
  }

  if (callbackToken && checkout.callbackToken !== callbackToken) {
    throw new Error("CHECKOUT_TOKEN_INVALID");
  }

  if (checkout.status === PaymentCheckoutStatus.PAID) {
    return {
      checkoutId: checkout.id,
      status: checkout.status,
      requestedAmount: checkout.amount,
      appliedAmount: 0,
      remainingAmount: 0,
    };
  }

  const selectedProvider = provider ?? checkout.provider;
  const method = providerToPaymentMethod(selectedProvider);
  const requestedAmount = normalizeAmount(input.amountPaid ?? checkout.amount);
  const noteTag = `Bot checkout #${checkout.id}`;
  const settledAt = input.paidAt ?? new Date();

  if (requestedAmount <= 0) {
    await tx.paymentCheckout.update({
      where: { id: checkout.id },
      data: {
        status: PaymentCheckoutStatus.FAILED,
        externalTxnId: externalTxnId ?? checkout.externalTxnId,
        externalStatus: externalStatus ?? checkout.externalStatus,
        ...(payload !== undefined ? { responsePayload: payload } : {}),
      },
    });

    throw new Error("CHECKOUT_AMOUNT_INVALID");
  }

  let remaining = requestedAmount;

  const targetGroupId = checkout.groupId;

  const existingPayments = await tx.payment.findMany({
    where: {
      studentId: checkout.studentId,
      isDeleted: false,
      ...(targetGroupId ? { groupId: targetGroupId } : {}),
    },
    include: {
      group: {
        select: {
          id: true,
          fan: true,
          status: true,
          priceMonthly: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
    take: 2000,
  });

  const paymentRows = existingPayments
    .slice()
    .sort((a, b) => {
      const aTime = (a.periodStart ?? a.createdAt).getTime();
      const bTime = (b.periodStart ?? b.createdAt).getTime();
      return aTime - bTime;
    });

  // 1) Base debts from existing rows.
  for (const row of paymentRows) {
    if (remaining <= 0) break;

    const requiredNet = Math.max(0, row.amountRequired - row.discount);
    const debt = Math.max(0, requiredNet - row.amountPaid);
    if (debt <= 0) continue;

    const alloc = Math.min(debt, remaining);
    const newPaid = row.amountPaid + alloc;

    await tx.payment.update({
      where: { id: row.id },
      data: {
        amountPaid: newPaid,
        paymentMethod: method,
        status: getPaymentStatus(row.amountRequired, row.discount, newPaid),
        paidAt: settledAt,
        note: appendNote(row.note, noteTag),
      },
    });

    remaining -= alloc;
  }

  // 2) Overdue periods for open groups (extra debt).
  if (remaining > 0) {
    const latestByGroup = new Map<string, (typeof paymentRows)[number]>();

    for (const row of paymentRows) {
      if (!row.groupId || !row.periodEnd || !row.group) continue;
      const prev = latestByGroup.get(row.groupId);
      if (!prev || (prev.periodEnd && prev.periodEnd.getTime() < row.periodEnd.getTime())) {
        latestByGroup.set(row.groupId, row);
      }
    }

    const latestRows = Array.from(latestByGroup.values()).sort((a, b) => {
      const aCode = a.group?.id ?? "";
      const bCode = b.group?.id ?? "";
      return aCode.localeCompare(bCode);
    });

    for (const latest of latestRows) {
      if (remaining <= 0) break;
      if (!latest.group || !latest.periodEnd || latest.group.status !== "OCHIQ") continue;

      const extra = calculateOpenGroupExtraDebt({
        periodEnd: latest.periodEnd,
        groupStatus: latest.group.status,
        groupPriceMonthly: latest.group.priceMonthly,
      });

      if (extra.extraPeriods <= 0 || latest.group.priceMonthly <= 0) continue;

      for (let i = 1; i <= extra.extraPeriods && remaining > 0; i += 1) {
        const periodStart = addMonthsKeepingDay(latest.periodEnd, i - 1);
        const periodEnd = addMonthsKeepingDay(latest.periodEnd, i);
        const required = latest.group.priceMonthly;
        const pay = Math.min(required, remaining);

        await tx.payment.create({
          data: {
            studentId: checkout.studentId,
            groupId: latest.groupId,
            subject: parseSubjectFromGroupFan(latest.group.fan),
            month: monthFromDate(periodStart),
            periodStart,
            periodEnd,
            amountRequired: required,
            amountPaid: pay,
            discount: 0,
            paymentMethod: method,
            status: getPaymentStatus(required, 0, pay),
            paidAt: settledAt,
            note: `${noteTag} | Auto davr to'lovi`,
          },
        });

        remaining -= pay;
      }
    }
  }

  const appliedAmount = requestedAmount - remaining;

  await tx.paymentCheckout.update({
    where: { id: checkout.id },
    data: {
      provider: selectedProvider,
      status: PaymentCheckoutStatus.PAID,
      paidAt: settledAt,
      externalTxnId: externalTxnId ?? checkout.externalTxnId,
      externalStatus: externalStatus ?? checkout.externalStatus,
      ...(payload !== undefined ? { responsePayload: payload } : {}),
    },
  });

  await tx.auditLog.create({
    data: {
      action: "CREATE",
      entity: "PaymentCheckout",
      entityId: checkout.id,
      payload: {
        studentId: checkout.studentId,
        groupId: checkout.groupId,
        provider: selectedProvider,
        requestedAmount,
        appliedAmount,
        remainingAmount: remaining,
      },
    },
  });

  return {
    checkoutId: checkout.id,
    status: PaymentCheckoutStatus.PAID,
    requestedAmount,
    appliedAmount,
    remainingAmount: remaining,
  };
}

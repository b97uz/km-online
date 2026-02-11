import { PaymentMethod, PaymentStatus, Subjects } from "@prisma/client";

export function parseSubject(value: string): Subjects | null {
  if (value === "CHEMISTRY") return Subjects.CHEMISTRY;
  if (value === "BIOLOGY") return Subjects.BIOLOGY;
  if (value === "BOTH") return Subjects.BOTH;
  return null;
}

export function parsePaymentMethod(value: string): PaymentMethod | null {
  if (value === "CASH") return PaymentMethod.CASH;
  if (value === "PAYME") return PaymentMethod.PAYME;
  if (value === "CLICK") return PaymentMethod.CLICK;
  if (value === "BANK") return PaymentMethod.BANK;
  return null;
}

export function parsePaymentStatus(value: string): PaymentStatus | null {
  if (value === "PAID") return PaymentStatus.PAID;
  if (value === "PARTIAL") return PaymentStatus.PARTIAL;
  if (value === "DEBT") return PaymentStatus.DEBT;
  return null;
}

export function parseNonNegativeInt(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function getRequiredNet(amountRequired: number, discount: number): number {
  return Math.max(0, amountRequired - discount);
}

export function getPaymentStatus(
  amountRequired: number,
  discount: number,
  amountPaid: number,
): PaymentStatus {
  const requiredNet = getRequiredNet(amountRequired, discount);
  if (amountPaid === 0) return PaymentStatus.DEBT;
  if (amountPaid >= requiredNet) return PaymentStatus.PAID;
  return PaymentStatus.PARTIAL;
}

export function getDebt(amountRequired: number, discount: number, amountPaid: number): number {
  const requiredNet = getRequiredNet(amountRequired, discount);
  return Math.max(0, requiredNet - amountPaid);
}

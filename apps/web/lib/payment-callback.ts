import { PaymentProvider } from "@prisma/client";

const SUCCESS_VALUES = new Set(["1", "true", "paid", "success", "ok", "completed", "done"]);
const FAIL_VALUES = new Set(["0", "false", "failed", "error", "canceled", "cancelled", "declined"]);

export function parseProvider(value: string): PaymentProvider | null {
  const raw = value.trim().toUpperCase();
  if (raw === "PAYME") return PaymentProvider.PAYME;
  if (raw === "CLICK") return PaymentProvider.CLICK;
  if (raw === "UZUM") return PaymentProvider.UZUM;
  if (raw === "PAYNET") return PaymentProvider.PAYNET;
  return null;
}

function pickString(map: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = map[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/[^\d.\-]/g, "").trim();
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;

  // Some providers send tiyin-like values. If huge, interpret as cents.
  if (n >= 10_000_000) {
    return Math.floor(n / 100);
  }
  return Math.floor(n);
}

export async function readCallbackPayload(req: Request): Promise<Record<string, unknown>> {
  const url = new URL(req.url);
  const payload: Record<string, unknown> = {};

  url.searchParams.forEach((value, key) => {
    payload[key] = value;
  });

  const method = req.method.toUpperCase();
  if (method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        const body = (await req.json()) as Record<string, unknown>;
        for (const [key, value] of Object.entries(body)) payload[key] = value;
      } catch {
        // ignore broken provider body
      }
    } else {
      try {
        const form = await req.formData();
        for (const [key, value] of form.entries()) {
          payload[key] = typeof value === "string" ? value : value.name;
        }
      } catch {
        // ignore
      }
    }
  }

  return payload;
}

export function extractCallbackFields(payload: Record<string, unknown>): {
  checkoutId: string;
  callbackToken: string;
  externalTxnId: string | null;
  externalStatus: string | null;
  amountPaid: number | null;
  success: boolean | null;
} {
  const checkoutId = pickString(payload, [
    "checkoutId",
    "checkout_id",
    "merchant_trans_id",
    "account.checkout_id",
    "account[checkout_id]",
    "orderId",
    "order_id",
  ]);

  const callbackToken = pickString(payload, ["token", "callbackToken", "callback_token"]);
  const externalTxnId = pickString(payload, ["transactionId", "transaction_id", "payment_id", "provider_txn_id"]) || null;
  const externalStatus = pickString(payload, ["status", "state", "payment_status"]) || null;

  const amountPaid = parseAmount(
    pickString(payload, ["amount", "amount_paid", "sum", "summa", "amount_tiyin"]),
  );

  const successRaw = pickString(payload, ["success", "paid", "status", "state"]);
  let success: boolean | null = null;
  if (successRaw) {
    const lower = successRaw.toLowerCase();
    if (SUCCESS_VALUES.has(lower)) success = true;
    if (FAIL_VALUES.has(lower)) success = false;
  }

  return {
    checkoutId,
    callbackToken,
    externalTxnId,
    externalStatus,
    amountPaid,
    success,
  };
}

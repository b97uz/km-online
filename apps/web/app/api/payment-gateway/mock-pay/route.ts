import { NextResponse } from "next/server";
import { prisma } from "@km/db";
import { applyCheckoutPayment } from "@/lib/payment-checkout";
import { parseProvider } from "@/lib/payment-callback";

function html(message: string, ok = true) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"/><title>To'lov</title></head><body style="font-family: sans-serif; padding: 24px;">${
      ok ? "✅" : "❌"
    } ${message}</body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      status: ok ? 200 : 400,
    },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkoutId = (url.searchParams.get("checkoutId") ?? "").trim();
  const callbackToken = (url.searchParams.get("token") ?? "").trim();
  const providerRaw = (url.searchParams.get("provider") ?? "PAYME").trim();
  const amountRaw = (url.searchParams.get("amount") ?? "").trim();

  if (!checkoutId) {
    return html("checkoutId topilmadi", false);
  }

  const provider = parseProvider(providerRaw);
  if (!provider) {
    return html("Provider noto'g'ri", false);
  }

  const amountPaid = amountRaw ? Number(amountRaw) : undefined;

  try {
    const result = await prisma.$transaction(async (tx) =>
      applyCheckoutPayment({
        tx,
        checkoutId,
        callbackToken: callbackToken || undefined,
        provider,
        amountPaid: Number.isFinite(amountPaid ?? NaN) ? amountPaid : undefined,
        externalStatus: "MOCK_PAID",
        payload: {
          mock: true,
          checkoutId,
          provider,
          amountPaid: amountPaid ?? null,
        },
      }),
    );

    return html(
      `To'lov muvaffaqiyatli qabul qilindi. Summasi: ${result.appliedAmount.toLocaleString("uz-UZ")} so'm`,
      true,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "CHECKOUT_NOT_FOUND") return html("Checkout topilmadi", false);
    if (message === "CHECKOUT_TOKEN_INVALID") return html("Token noto'g'ri", false);
    if (message === "CHECKOUT_AMOUNT_INVALID") return html("To'lov summasi noto'g'ri", false);

    console.error("MOCK_PAY_ERROR", error);
    return html("To'lovni qayd qilishda xatolik", false);
  }
}

import { PaymentCheckoutStatus, Prisma } from "@prisma/client";
import { prisma } from "@km/db";
import { NextResponse } from "next/server";
import { applyCheckoutPayment } from "@/lib/payment-checkout";
import { extractCallbackFields, parseProvider, readCallbackPayload } from "@/lib/payment-callback";

async function handle(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerRaw } = await params;
  const provider = parseProvider(providerRaw);
  if (!provider) {
    return NextResponse.json({ ok: false, error: "Provider noto'g'ri" }, { status: 400 });
  }

  const payload = await readCallbackPayload(req);
  const parsed = extractCallbackFields(payload);

  if (!parsed.checkoutId) {
    return NextResponse.json({ ok: false, error: "checkoutId topilmadi" }, { status: 400 });
  }

  if (parsed.success === false) {
    await prisma.paymentCheckout.updateMany({
      where: { id: parsed.checkoutId },
      data: {
        status: PaymentCheckoutStatus.FAILED,
        externalTxnId: parsed.externalTxnId ?? undefined,
        externalStatus: parsed.externalStatus ?? "FAILED",
        responsePayload: payload as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true, status: "FAILED" });
  }

  try {
    const result = await prisma.$transaction(async (tx) =>
      applyCheckoutPayment({
        tx,
        checkoutId: parsed.checkoutId,
        callbackToken: parsed.callbackToken || undefined,
        provider,
        amountPaid: parsed.amountPaid ?? undefined,
        externalTxnId: parsed.externalTxnId,
        externalStatus: parsed.externalStatus,
        payload: payload as Prisma.InputJsonValue,
      }),
    );

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";

    if (message === "CHECKOUT_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Checkout topilmadi" }, { status: 404 });
    }

    if (message === "CHECKOUT_TOKEN_INVALID") {
      return NextResponse.json({ ok: false, error: "Token noto'g'ri" }, { status: 403 });
    }

    if (message === "CHECKOUT_AMOUNT_INVALID") {
      return NextResponse.json({ ok: false, error: "To'lov summasi noto'g'ri" }, { status: 400 });
    }

    console.error("PAYMENT_PROVIDER_CALLBACK_ERROR", error);
    return NextResponse.json({ ok: false, error: "Callback xatoligi" }, { status: 500 });
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  return handle(req, ctx);
}

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  return handle(req, ctx);
}

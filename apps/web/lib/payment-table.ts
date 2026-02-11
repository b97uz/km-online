import { Prisma } from "@prisma/client";

function hasPaymentWord(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.toLowerCase().includes("payment");
}

export function isPaymentTableMissingError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      const meta = (error.meta ?? {}) as { table?: unknown; cause?: unknown };
      if (hasPaymentWord(meta.table) || hasPaymentWord(meta.cause)) {
        return true;
      }
      return hasPaymentWord(error.message);
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("public.payment") ||
      message.includes("table") && message.includes("payment") && message.includes("does not exist")
    );
  }

  return false;
}

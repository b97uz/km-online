import { Prisma } from "@prisma/client";

function containsLocationWord(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase();
  return lower.includes("province") || lower.includes("district") || lower.includes("institution");
}

export function isLocationTableMissingError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const meta = (error.meta ?? {}) as { table?: unknown; cause?: unknown };
    if (containsLocationWord(meta.table) || containsLocationWord(meta.cause)) {
      return true;
    }
    return containsLocationWord(error.message);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("public.province") ||
      message.includes("public.district") ||
      message.includes("public.institution") ||
      (message.includes("table") &&
        (message.includes("province") || message.includes("district") || message.includes("institution")) &&
        message.includes("does not exist"))
    );
  }

  return false;
}


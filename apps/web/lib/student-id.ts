import { Prisma } from "@prisma/client";

export async function generateNextStudentId(tx: Prisma.TransactionClient): Promise<string> {
  const row = await tx.$queryRaw<Array<{ value: string }>>`
    SELECT nextval('student_code_seq')::text AS value
  `;

  const raw = Number(row[0]?.value ?? "0");
  if (!Number.isInteger(raw) || raw < 1) {
    throw new Error("STUDENT_ID_SEQUENCE_ERROR");
  }

  if (raw > 999999) {
    throw new Error("STUDENT_ID_LIMIT_REACHED");
  }

  return String(raw).padStart(6, "0");
}


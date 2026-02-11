import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import { normalizeUzPhone, phoneVariants } from "@/lib/phone";
import { calculateTodayAwareDebtMap } from "@/lib/payment-debt";
import { parsePaymentStatus, parseSubject } from "@/lib/payments";
import { isPaymentTableMissingError } from "@/lib/payment-table";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "CURATOR") return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const month = (url.searchParams.get("month") ?? "").trim();
  const subject = parseSubject((url.searchParams.get("subject") ?? "").trim());
  const status = parsePaymentStatus((url.searchParams.get("status") ?? "").trim());
  const studentPhone = normalizeUzPhone(url.searchParams.get("studentPhone") ?? "");

  const loadPayments = () =>
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        ...(month ? { month } : {}),
        ...(subject ? { subject } : {}),
        ...(status ? { status } : {}),
        ...(studentPhone
          ? {
              student: {
                OR: phoneVariants(studentPhone).map((phone) => ({ phone })),
              },
            }
          : {}),
        student: {
          ...(studentPhone
            ? {
                OR: phoneVariants(studentPhone).map((phone) => ({ phone })),
              }
            : {}),
          enrollments: {
            some: {
              group: {
                curatorId: session.userId,
              },
            },
          },
        },
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: {
                group: { curatorId: session.userId },
              },
              include: {
                group: {
                  select: {
                    id: true,
                    code: true,
                    fan: true,
                  },
                },
              },
            },
          },
        },
        group: {
          select: {
            id: true,
            status: true,
            priceMonthly: true,
          },
        },
      },
      orderBy: [{ month: "desc" }, { paidAt: "desc" }],
      take: 1000,
    });

  let payments = [] as Awaited<ReturnType<typeof loadPayments>>;
  try {
    payments = await loadPayments();
  } catch (error) {
    if (isPaymentTableMissingError(error)) {
      return NextResponse.json({ ok: false, error: "Payments jadvali yo'q. Migratsiyani ishga tushiring." }, { status: 503 });
    }
    throw error;
  }

  const debtMap = calculateTodayAwareDebtMap(
    payments.map((payment) => ({
      id: payment.id,
      studentId: payment.studentId,
      groupId: payment.groupId,
      amountRequired: payment.amountRequired,
      amountPaid: payment.amountPaid,
      discount: payment.discount,
      periodEnd: payment.periodEnd,
      group: payment.group
        ? {
            status: payment.group.status,
            priceMonthly: payment.group.priceMonthly,
          }
        : null,
    })),
  );

  const rows = payments.map((payment) => {
    const requiredNet = Math.max(0, payment.amountRequired - payment.discount);
    const debtInfo = debtMap.byPaymentId.get(payment.id);
    return {
      ...payment,
      requiredNet,
      debt: debtInfo?.totalDebt ?? 0,
      student: {
        id: payment.student.id,
        fullName: payment.student.fullName,
        phone: payment.student.phone,
        groups: payment.student.enrollments.map((e) => ({
          id: e.group.id,
          code: e.group.code,
          fan: e.group.fan,
          status: e.status,
        })),
      },
    };
  });

  return NextResponse.json({
    ok: true,
    payments: rows,
    summary: {
      total: rows.length,
      totalDebt: rows.reduce((acc, row) => acc + row.debt, 0),
    },
  });
}

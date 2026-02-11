import { prisma } from "@km/db";
import { getSession } from "@/lib/auth";
import { calculateTodayAwareDebtMap } from "@/lib/payment-debt";
import { parseSubject } from "@/lib/payments";
import { isPaymentTableMissingError } from "@/lib/payment-table";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const groupId = (url.searchParams.get("groupId") ?? "").trim();
  const subject = parseSubject((url.searchParams.get("subject") ?? "").trim());
  const curatorId = (url.searchParams.get("curatorId") ?? "").trim();
  const month = (url.searchParams.get("month") ?? "").trim();

  const loadDebtorRows = () =>
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        ...(subject ? { subject } : {}),
        ...(month ? { month } : {}),
        student: {
          enrollments: {
            some: {
              ...(groupId ? { groupId } : {}),
              ...(curatorId ? { group: { curatorId } } : {}),
            },
          },
        },
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: {
                ...(groupId ? { groupId } : {}),
                ...(curatorId ? { group: { curatorId } } : {}),
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
      take: 2000,
    });

  let debtorRows = [] as Awaited<ReturnType<typeof loadDebtorRows>>;
  try {
    debtorRows = await loadDebtorRows();
  } catch (error) {
    if (isPaymentTableMissingError(error)) {
      return NextResponse.json({ ok: false, error: "Payments jadvali yo'q. Migratsiyani ishga tushiring." }, { status: 503 });
    }
    throw error;
  }

  const debtMap = calculateTodayAwareDebtMap(
    debtorRows.map((payment) => ({
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

  const rows = debtorRows
    .map((payment) => {
      const debtInfo = debtMap.byPaymentId.get(payment.id);
      const debt = debtInfo?.totalDebt ?? 0;
      return {
        paymentId: payment.id,
        studentId: payment.studentId,
        studentName: payment.student.fullName,
        studentPhone: payment.student.phone,
        subject: payment.subject,
        month: payment.month,
        status: payment.status,
        amountRequired: payment.amountRequired,
        discount: payment.discount,
        amountPaid: payment.amountPaid,
        debt,
        groups: payment.student.enrollments.map((e) => ({
          id: e.group.id,
          code: e.group.code,
          fan: e.group.fan,
          status: e.status,
        })),
      };
    })
    .filter((row) => row.debt > 0);

  const byStudent = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      studentPhone: string;
      totalDebt: number;
      records: number;
    }
  >();

  for (const row of rows) {
    const prev = byStudent.get(row.studentId) ?? {
      studentId: row.studentId,
      studentName: row.studentName,
      studentPhone: row.studentPhone,
      totalDebt: 0,
      records: 0,
    };
    prev.totalDebt += row.debt;
    prev.records += 1;
    byStudent.set(row.studentId, prev);
  }

  return NextResponse.json({
    ok: true,
    totalDebt: rows.reduce((acc, x) => acc + x.debt, 0),
    totalRecords: rows.length,
    students: Array.from(byStudent.values()).sort((a, b) => b.totalDebt - a.totalDebt),
    rows,
  });
}

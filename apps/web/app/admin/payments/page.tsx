import { PaymentStatus, Subjects } from "@prisma/client";
import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";
import { phoneVariants } from "@/lib/phone";
import { calculateTodayAwareDebtMap, formatUzDate } from "@/lib/payment-debt";
import { isPaymentTableMissingError } from "@/lib/payment-table";
import { PaymentCreateForm } from "./payment-create-form";

type PaymentsPageParams = {
  msg?: string;
  error?: string;
  tab?: string;
  month?: string;
  subject?: string;
  status?: string;
  studentPhone?: string;
  debtMonth?: string;
  debtSubject?: string;
  debtGroupId?: string;
  debtCuratorId?: string;
};

const SUBJECT_OPTIONS = ["CHEMISTRY", "BIOLOGY", "BOTH"] as const;
const STATUS_OPTIONS = ["PAID", "PARTIAL", "DEBT"] as const;

type SubjectValue = (typeof SUBJECT_OPTIONS)[number];
type StatusValue = (typeof STATUS_OPTIONS)[number];

type TabValue = "payments" | "debtors";

function isSubject(value: string): value is SubjectValue {
  return SUBJECT_OPTIONS.includes(value as SubjectValue);
}

function isStatus(value: string): value is StatusValue {
  return STATUS_OPTIONS.includes(value as StatusValue);
}

function formatSubject(value: Subjects) {
  if (value === "CHEMISTRY") return "Kimyo";
  if (value === "BIOLOGY") return "Biologiya";
  return "Kimyo/Biologiya";
}

function formatStatus(value: PaymentStatus) {
  if (value === "PAID") return "PAID";
  if (value === "PARTIAL") return "PARTIAL";
  return "DEBT";
}

function formatMoney(value: number) {
  return value.toLocaleString("uz-UZ");
}

function requiredNet(amountRequired: number, discount: number) {
  return Math.max(0, amountRequired - discount);
}

function readTab(value: string): TabValue {
  return value === "debtors" ? "debtors" : "payments";
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<PaymentsPageParams>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const tab = readTab((params?.tab ?? "").trim());
  const month = (params?.month ?? "").trim();
  const studentPhone = (params?.studentPhone ?? "").trim();
  const rawSubject = (params?.subject ?? "").trim();
  const rawStatus = (params?.status ?? "").trim();
  const subject = isSubject(rawSubject) ? rawSubject : "";
  const status = isStatus(rawStatus) ? rawStatus : "";

  const debtMonth = (params?.debtMonth ?? "").trim();
  const rawDebtSubject = (params?.debtSubject ?? "").trim();
  const debtSubject = isSubject(rawDebtSubject) ? rawDebtSubject : "";
  const debtGroupId = (params?.debtGroupId ?? "").trim();
  const debtCuratorId = (params?.debtCuratorId ?? "").trim();

  const [students, curators, groups] = await Promise.all([
    prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        enrollments: {
          where: {
            status: {
              in: ["TRIAL", "ACTIVE", "PAUSED"],
            },
          },
          select: {
            id: true,
            status: true,
            group: {
              select: {
                id: true,
                code: true,
                fan: true,
                priceMonthly: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.user.findMany({
      where: { role: "CURATOR" },
      include: { curatorProfile: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.groupCatalog.findMany({
      select: {
        id: true,
        code: true,
        fan: true,
        curatorId: true,
      },
      orderBy: [{ code: "asc" }],
      take: 500,
    }),
  ]);

  const loadPayments = () =>
    prisma.payment.findMany({
      where: {
        ...(month ? { month } : {}),
        ...(subject ? { subject: subject as Subjects } : {}),
        ...(status ? { status: status as PaymentStatus } : {}),
        ...(studentPhone
          ? {
              student: {
                OR: phoneVariants(studentPhone).map((phone) => ({ phone })),
              },
            }
          : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        group: {
          select: {
            id: true,
            code: true,
            status: true,
            priceMonthly: true,
          },
        },
      },
      orderBy: [{ month: "desc" }, { paidAt: "desc" }],
      take: 1000,
    });

  const loadDebtorRows = () =>
    prisma.payment.findMany({
      where: {
        isDeleted: false,
        ...(debtMonth ? { month: debtMonth } : {}),
        ...(debtSubject ? { subject: debtSubject as Subjects } : {}),
        student: {
          enrollments: {
            some: {
              ...(debtGroupId ? { groupId: debtGroupId } : {}),
              ...(debtCuratorId ? { group: { curatorId: debtCuratorId } } : {}),
            },
          },
        },
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: {
                ...(debtGroupId ? { groupId: debtGroupId } : {}),
                ...(debtCuratorId ? { group: { curatorId: debtCuratorId } } : {}),
              },
              include: {
                group: {
                  select: {
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
            code: true,
            status: true,
            priceMonthly: true,
          },
        },
      },
      orderBy: [{ month: "desc" }, { paidAt: "desc" }],
      take: 2000,
    });

  let paymentTableMissing = false;
  let payments = [] as Awaited<ReturnType<typeof loadPayments>>;
  let debtorRows = [] as Awaited<ReturnType<typeof loadDebtorRows>>;

  try {
    [payments, debtorRows] = await Promise.all([loadPayments(), loadDebtorRows()]);
  } catch (error) {
    if (isPaymentTableMissingError(error)) {
      paymentTableMissing = true;
    } else {
      throw error;
    }
  }

  const activePayments = payments.filter((row) => !row.isDeleted);

  const paymentsDebt = calculateTodayAwareDebtMap(
    activePayments.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      groupId: row.groupId,
      amountRequired: row.amountRequired,
      amountPaid: row.amountPaid,
      discount: row.discount,
      periodEnd: row.periodEnd,
      group: row.group
        ? {
            status: row.group.status,
            priceMonthly: row.group.priceMonthly,
          }
        : null,
    })),
  );

  const debtorDebtMap = calculateTodayAwareDebtMap(
    debtorRows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      groupId: row.groupId,
      amountRequired: row.amountRequired,
      amountPaid: row.amountPaid,
      discount: row.discount,
      periodEnd: row.periodEnd,
      group: row.group
        ? {
            status: row.group.status,
            priceMonthly: row.group.priceMonthly,
          }
        : null,
    })),
  );

  const paymentSummary = {
    total: activePayments.length,
    paid: activePayments.filter((x) => x.status === "PAID").length,
    partial: activePayments.filter((x) => x.status === "PARTIAL").length,
    debt: Array.from(paymentsDebt.byPaymentId.values()).filter((x) => x.totalDebt > 0).length,
    totalDebt: paymentsDebt.totalDebt,
  };

  const debtorRowsWithDebt = debtorRows
    .map((row) => ({
      row,
      debtInfo: debtorDebtMap.byPaymentId.get(row.id),
    }))
    .filter((item) => (item.debtInfo?.totalDebt ?? 0) > 0);

  const debtByStudent = new Map<
    string,
    {
      studentId: string;
      fullName: string;
      phone: string;
      totalDebt: number;
      records: number;
    }
  >();

  for (const item of debtorRowsWithDebt) {
    const rowDebt = item.debtInfo?.totalDebt ?? 0;
    const prev = debtByStudent.get(item.row.studentId) ?? {
      studentId: item.row.studentId,
      fullName: item.row.student.fullName,
      phone: item.row.student.phone,
      totalDebt: 0,
      records: 0,
    };
    prev.totalDebt += rowDebt;
    prev.records += 1;
    debtByStudent.set(item.row.studentId, prev);
  }

  const totalDebtorDebt = debtorRowsWithDebt.reduce((acc, item) => acc + (item.debtInfo?.totalDebt ?? 0), 0);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Payments</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}
      {paymentTableMissing ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Payments jadvali DBda topilmadi. `packages/db` ichida `prisma migrate deploy` ni ishga tushiring.
        </p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <div className="mb-3 flex gap-2">
          <a
            href="/admin/payments?tab=payments"
            className={`rounded px-3 py-2 text-sm ${
              tab === "payments" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
            }`}
          >
            To'lovlar
          </a>
          <a
            href="/admin/payments?tab=debtors"
            className={`rounded px-3 py-2 text-sm ${
              tab === "debtors" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
            }`}
          >
            Qarzdorlar
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded border p-3 text-sm">Jami: {paymentSummary.total}</div>
          <div className="rounded border p-3 text-sm">PAID: {paymentSummary.paid}</div>
          <div className="rounded border p-3 text-sm">PARTIAL: {paymentSummary.partial}</div>
          <div className="rounded border p-3 text-sm">DEBT: {paymentSummary.debt}</div>
          <div className="rounded border p-3 text-sm">Qarz: {formatMoney(paymentSummary.totalDebt)}</div>
        </div>
      </section>

      {tab === "payments" ? (
        <>
          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-semibold">To'lov qo'shish</h2>
            <PaymentCreateForm students={students} />
          </section>

          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-semibold">To'lovlar ro'yxati</h2>

            <form action="/admin/payments" method="get" className="mb-3 grid gap-2 md:grid-cols-5">
              <input type="hidden" name="tab" value="payments" />
              <input name="month" className="rounded border p-2" placeholder="YYYY-MM" defaultValue={month} />
              <select name="subject" className="rounded border p-2" defaultValue={subject}>
                <option value="">Barcha fanlar</option>
                <option value="CHEMISTRY">Kimyo</option>
                <option value="BIOLOGY">Biologiya</option>
                <option value="BOTH">Kimyo/Biologiya</option>
              </select>
              <select name="status" className="rounded border p-2" defaultValue={status}>
                <option value="">Barcha status</option>
                <option value="PAID">PAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="DEBT">DEBT</option>
              </select>
              <input
                name="studentPhone"
                className="rounded border p-2"
                placeholder="Student phone"
                defaultValue={studentPhone}
              />
              <button className="rounded bg-slate-800 p-2 text-white">Filter</button>
            </form>

            <div className="overflow-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">Student</th>
                    <th className="border p-2 text-left">Guruh / Fan</th>
                    <th className="border p-2 text-left">Davr</th>
                    <th className="border p-2 text-left">To'lov tafsiloti</th>
                    <th className="border p-2 text-left">Qarz</th>
                    <th className="border p-2 text-left">Status</th>
                    <th className="border p-2 text-left">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((row) => {
                    const reqNet = requiredNet(row.amountRequired, row.discount);
                    const debtInfo = paymentsDebt.byPaymentId.get(row.id);
                    const rowDebt = row.isDeleted ? 0 : debtInfo?.totalDebt ?? 0;
                    const extraDebt = debtInfo?.extraDebt ?? 0;
                    const hasExtraDebt = !row.isDeleted && extraDebt > 0;

                    return (
                      <tr key={row.id} className={row.isDeleted ? "bg-slate-50 text-slate-500" : ""}>
                        <td className="border p-2">
                          <p>{row.student.fullName}</p>
                          <p className="text-xs text-slate-600">{row.student.phone}</p>
                        </td>
                        <td className="border p-2">
                          <p>{row.group?.code ?? "-"}</p>
                          <p className="text-xs text-slate-600">{formatSubject(row.subject)}</p>
                        </td>
                        <td className="border p-2">
                          <p>{row.periodStart ? formatUzDate(row.periodStart) : row.month}</p>
                          <p className="text-xs text-slate-600">
                            {row.periodEnd ? formatUzDate(row.periodEnd) : "-"}
                          </p>
                        </td>
                        <td className="border p-2">
                          <p>Talab: {formatMoney(row.amountRequired)}</p>
                          <p>Chegirma: {formatMoney(row.discount)}</p>
                          <p>To'lashi kerak: {formatMoney(reqNet)}</p>
                          <p>To'langan: {formatMoney(row.amountPaid)}</p>
                          <p className="text-xs text-slate-600">Usul: {row.paymentMethod}</p>
                          <p className="text-xs text-slate-600">
                            Vaqt: {row.paidAt.toLocaleString("uz-UZ", { hour12: false })}
                          </p>
                          {row.note ? <p className="text-xs text-slate-600">Izoh: {row.note}</p> : null}
                        </td>
                        <td className="border p-2">
                          <p>{formatMoney(rowDebt)}</p>
                          {hasExtraDebt && debtInfo?.currentPeriodStart && debtInfo.currentPeriodEnd ? (
                            <p className="text-xs text-amber-700">
                              + keyingi davr: {formatMoney(extraDebt)} ({formatUzDate(debtInfo.currentPeriodStart)}-
                              {formatUzDate(debtInfo.currentPeriodEnd)})
                            </p>
                          ) : null}
                        </td>
                        <td className="border p-2">{row.isDeleted ? "O'CHIRILGAN" : formatStatus(row.status)}</td>
                        <td className="border p-2">
                          {row.isDeleted ? (
                            <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">Arxivda</span>
                          ) : (
                            <form action={`/api/admin/payments/${row.id}`} method="post">
                              <input type="hidden" name="_method" value="DELETE" />
                              <button className="rounded bg-red-600 px-3 py-2 text-white">To'lovni o'chirish</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded bg-white p-4 shadow">
          <h2 className="mb-2 text-lg font-semibold">Qarzdorlar</h2>

          <form action="/admin/payments" method="get" className="mb-3 grid gap-2 md:grid-cols-5">
            <input type="hidden" name="tab" value="debtors" />
            <input name="debtMonth" className="rounded border p-2" placeholder="YYYY-MM" defaultValue={debtMonth} />
            <select name="debtSubject" className="rounded border p-2" defaultValue={debtSubject}>
              <option value="">Barcha fanlar</option>
              <option value="CHEMISTRY">Kimyo</option>
              <option value="BIOLOGY">Biologiya</option>
              <option value="BOTH">Kimyo/Biologiya</option>
            </select>
            <select name="debtCuratorId" className="rounded border p-2" defaultValue={debtCuratorId}>
              <option value="">Barcha kuratorlar</option>
              {curators.map((curator) => (
                <option key={curator.id} value={curator.id}>
                  {curator.curatorProfile?.fullName ?? curator.phone ?? curator.id}
                </option>
              ))}
            </select>
            <select name="debtGroupId" className="rounded border p-2" defaultValue={debtGroupId}>
              <option value="">Barcha guruhlar</option>
              {groups
                .filter((group) => !debtCuratorId || group.curatorId === debtCuratorId)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.code} ({group.fan})
                  </option>
                ))}
            </select>
            <button className="rounded bg-slate-800 p-2 text-white">Filter</button>
          </form>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded border p-3 text-sm">Yozuvlar: {debtorRowsWithDebt.length}</div>
            <div className="rounded border p-3 text-sm">Umumiy qarz: {formatMoney(totalDebtorDebt)}</div>
          </div>

          <h3 className="mb-2 font-semibold">Studentlar kesimida</h3>
          <div className="overflow-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Student</th>
                  <th className="border p-2 text-left">Telefon</th>
                  <th className="border p-2 text-left">Yozuvlar</th>
                  <th className="border p-2 text-left">Jami qarz</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(debtByStudent.values())
                  .sort((a, b) => b.totalDebt - a.totalDebt)
                  .map((student) => (
                    <tr key={student.studentId}>
                      <td className="border p-2">{student.fullName}</td>
                      <td className="border p-2">{student.phone}</td>
                      <td className="border p-2">{student.records}</td>
                      <td className="border p-2">{formatMoney(student.totalDebt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 font-semibold">To'liq ro'yxat</h3>
          <div className="overflow-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Student</th>
                  <th className="border p-2 text-left">Fan/Oy</th>
                  <th className="border p-2 text-left">Guruh</th>
                  <th className="border p-2 text-left">Net</th>
                  <th className="border p-2 text-left">To'langan</th>
                  <th className="border p-2 text-left">Qarz</th>
                  <th className="border p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {debtorRowsWithDebt.map((item) => {
                  const row = item.row;
                  const reqNet = requiredNet(row.amountRequired, row.discount);
                  const debtInfo = item.debtInfo;
                  const rowDebt = debtInfo?.totalDebt ?? 0;
                  const groupsText = row.student.enrollments
                    .map((enrollment) => `${enrollment.group.code} (${enrollment.group.fan})`)
                    .join(", ");

                  return (
                    <tr key={row.id}>
                      <td className="border p-2">
                        <p>{row.student.fullName}</p>
                        <p className="text-xs text-slate-600">{row.student.phone}</p>
                      </td>
                      <td className="border p-2">
                        <p>{formatSubject(row.subject)}</p>
                        <p className="text-xs text-slate-600">{row.month}</p>
                      </td>
                      <td className="border p-2">{groupsText || "-"}</td>
                      <td className="border p-2">{formatMoney(reqNet)}</td>
                      <td className="border p-2">{formatMoney(row.amountPaid)}</td>
                      <td className="border p-2">
                        <p>{formatMoney(rowDebt)}</p>
                        {(debtInfo?.extraDebt ?? 0) > 0 && debtInfo?.currentPeriodStart && debtInfo.currentPeriodEnd ? (
                          <p className="text-xs text-amber-700">
                            + keyingi davr: {formatMoney(debtInfo.extraDebt)} ({formatUzDate(debtInfo.currentPeriodStart)}-
                            {formatUzDate(debtInfo.currentPeriodEnd)})
                          </p>
                        ) : null}
                      </td>
                      <td className="border p-2">{formatStatus(row.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

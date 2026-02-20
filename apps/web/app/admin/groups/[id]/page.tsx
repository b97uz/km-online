import Link from "next/link";
import { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@km/db";
import { notFound } from "next/navigation";
import { calculateTodayAwareDebtMap, formatUzDate } from "@/lib/payment-debt";
import { getCurrentMonthKey, isValidMonthKey } from "@/lib/group-journal";
import { GroupJournalSection } from "@/components/group-journal-section";

type GroupDetailSearchParams = {
  msg?: string;
  error?: string;
  journalMonth?: string;
};

function formatDays(value: string | null, scheduleText: string): string {
  const raw = (value ?? "").trim().toUpperCase();
  if (raw === "DU_CHOR_JU" || raw === "DU_CHO_JU") return "Du-Chor-Ju";
  if (raw === "SE_PAY_SHAN") return "Se-Pay-Shan";

  const text = scheduleText.toUpperCase();
  if (text.includes("DU") && (text.includes("CHOR") || text.includes("CHO")) && text.includes("JU")) {
    return "Du-Chor-Ju";
  }
  if (text.includes("SE") && text.includes("PAY") && text.includes("SHAN")) {
    return "Se-Pay-Shan";
  }
  return "-";
}

function formatTimeRange(value: string | null, scheduleText: string): string {
  const fromTime = (value ?? "").match(/(\d{1,2}:[0-5]\d)\s*-\s*(\d{1,2}:[0-5]\d)/);
  if (fromTime) return `${fromTime[1]}-${fromTime[2]}`;

  const fromSchedule = scheduleText.match(/(\d{1,2}:[0-5]\d)\s*-\s*(\d{1,2}:[0-5]\d)/);
  if (fromSchedule) return `${fromSchedule[1]}-${fromSchedule[2]}`;

  return "-";
}

function formatEnrollmentStatus(status: EnrollmentStatus): string {
  if (status === EnrollmentStatus.TRIAL) return "SINOV";
  if (status === EnrollmentStatus.ACTIVE) return "AKTIV";
  if (status === EnrollmentStatus.PAUSED) return "TO'XTATGAN";
  return "TUGATGAN";
}

function todayInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function AdminGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<GroupDetailSearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const monthParam = (query?.journalMonth ?? "").trim();
  const journalMonth = isValidMonthKey(monthParam) ? monthParam : getCurrentMonthKey();

  const group = await prisma.groupCatalog.findUnique({
    where: { id },
    include: {
      curator: {
        select: {
          phone: true,
          curatorProfile: {
            select: {
              fullName: true,
            },
          },
        },
      },
      enrollments: {
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              parentPhone: true,
              status: true,
            },
          },
        },
        orderBy: [
          { status: "asc" },
          { createdAt: "desc" },
        ],
      },
      _count: {
        select: {
          enrollments: {
            where: {
              status: EnrollmentStatus.ACTIVE,
            },
          },
        },
      },
    },
  });

  if (!group) notFound();

  const studentIds = group.enrollments.map((item) => item.student.id);

  let paymentRows: Array<{
    id: string;
    studentId: string;
    groupId: string | null;
    amountRequired: number;
    amountPaid: number;
    discount: number;
    periodEnd: Date | null;
    group: {
      status: "REJADA" | "OCHIQ" | "BOSHLANGAN" | "YOPIQ";
      priceMonthly: number;
    } | null;
  }> = [];

  if (studentIds.length) {
    try {
      paymentRows = await prisma.payment.findMany({
        where: {
          groupId: group.id,
          isDeleted: false,
          studentId: {
            in: studentIds,
          },
        },
        include: {
          group: {
            select: {
              status: true,
              priceMonthly: true,
            },
          },
        },
      });
    } catch {
      paymentRows = [];
    }
  }

  const debtMap = calculateTodayAwareDebtMap(paymentRows);
  const debtByStudent = new Map<string, number>();
  for (const payment of paymentRows) {
    const rowDebt = debtMap.byPaymentId.get(payment.id)?.totalDebt ?? 0;
    debtByStudent.set(payment.studentId, (debtByStudent.get(payment.studentId) ?? 0) + rowDebt);
  }
  const curatorName = group.curator?.curatorProfile?.fullName ?? group.curator?.phone ?? "-";

  const [lessonRows, journalDates] = await Promise.all([
    prisma.lesson.findMany({
      include: {
        book: {
          select: {
            title: true,
          },
        },
      },
      take: 1000,
    }),
    prisma.groupJournalDate.findMany({
      where: {
        groupId: group.id,
        monthKey: journalMonth,
      },
      include: {
        entries: {
          select: {
            journalDateId: true,
            studentId: true,
            attendance: true,
            lessonId: true,
            theoryScore: true,
            practicalScore: true,
          },
        },
      },
      orderBy: {
        journalDate: "asc",
      },
    }),
  ]);

  const lessonOptions = lessonRows
    .slice()
    .sort((a, b) => {
      const byBook = a.book.title.localeCompare(b.book.title);
      if (byBook !== 0) return byBook;
      return a.lessonNumber - b.lessonNumber;
    })
    .map((lesson) => ({
      id: lesson.id,
      label: `${lesson.book.title} | ${lesson.lessonNumber}-dars | ${lesson.title}`,
    }));

  const journalStudents = group.enrollments
    .filter((item) => item.status === EnrollmentStatus.TRIAL || item.status === EnrollmentStatus.ACTIVE)
    .map((item) => ({
      id: item.student.id,
      fullName: item.student.fullName,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const journalEntries = journalDates.flatMap((day) => day.entries);

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/groups" className="rounded border px-3 py-2 text-sm text-slate-700">
          ← Guruxlar ro'yxatiga qaytish
        </Link>
        <h1 className="text-2xl font-bold">Guruxni ko'rish</h1>
      </div>

      {query?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{query.msg}</p>
      ) : null}
      {query?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
          <p><span className="font-semibold">Gurux:</span> {group.code}</p>
          <p><span className="font-semibold">Fan:</span> {group.fan}</p>
          <p><span className="font-semibold">Kunlar:</span> {formatDays(group.days, group.scheduleText)}</p>
          <p><span className="font-semibold">Vaqt:</span> {formatTimeRange(group.time, group.scheduleText)}</p>
          <p><span className="font-semibold">Format:</span> {group.format}</p>
          <p><span className="font-semibold">Sig'im:</span> {group.capacity}</p>
          <p><span className="font-semibold">Narx:</span> {group.priceMonthly.toLocaleString("uz-UZ")}</p>
          <p><span className="font-semibold">Status:</span> {group.status}</p>
          <p><span className="font-semibold">Aktiv o'quvchi:</span> {group._count.enrollments}</p>
          <p className="xl:col-span-3"><span className="font-semibold">Kuratori:</span> {curatorName}</p>
        </div>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Studentni guruhga qo'shish</h2>
        <form action="/api/admin/enrollments" method="post" className="grid gap-2 md:max-w-xl">
          <input type="hidden" name="groupId" value={group.id} />
          <input type="hidden" name="redirectTo" value={`/admin/groups/${group.id}`} />
          <input name="phone" className="rounded border p-2" placeholder="Student phone +998..." required />
          <label className="grid gap-1 text-sm text-slate-700">
            <span>Darsni boshlash sanasi</span>
            <input
              name="studyStartDate"
              type="date"
              className="rounded border p-2"
              defaultValue={todayInputValue()}
              required
            />
          </label>
          <select name="status" className="rounded border p-2" defaultValue="TRIAL">
            <option value="TRIAL">SINOV</option>
            <option value="ACTIVE">AKTIV</option>
            <option value="PAUSED">TO'XTATGAN</option>
            <option value="LEFT">TUGATGAN</option>
          </select>
          <button className="rounded bg-blue-600 p-2 text-white">Biriktirish</button>
        </form>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">Guruxdagi o'quvchilar</h2>

        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2 text-left">Ism</th>
                <th className="border p-2 text-left">Telefon raqami</th>
                <th className="border p-2 text-left">Ota-ona raqami</th>
                <th className="border p-2 text-left">Qarzdorligi</th>
                <th className="border p-2 text-left">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {group.enrollments.map((enrollment) => {
                const debt = debtByStudent.get(enrollment.student.id) ?? 0;

                return (
                  <tr key={enrollment.id}>
                    <td className="border p-2">{enrollment.student.fullName}</td>
                    <td className="border p-2">{enrollment.student.phone}</td>
                    <td className="border p-2">{enrollment.student.parentPhone ?? "-"}</td>
                    <td className="border p-2">{debt.toLocaleString("uz-UZ")}</td>
                    <td className="border p-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <Link
                          href={`/admin/results?studentId=${enrollment.student.id}`}
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
                        >
                          Testlar results
                        </Link>
                        <form action={`/api/admin/enrollments/${enrollment.id}`} method="post" className="flex items-center gap-1">
                          <input type="hidden" name="_method" value="PATCH" />
                          <input type="hidden" name="redirectTo" value={`/admin/groups/${group.id}`} />
                          <select name="status" defaultValue={enrollment.status} className="rounded border px-1 py-1 text-xs">
                            <option value="TRIAL">SINOV</option>
                            <option value="ACTIVE">AKTIV</option>
                            <option value="PAUSED">TO'XTATGAN</option>
                            <option value="LEFT">TUGATGAN</option>
                          </select>
                          <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Status</button>
                        </form>
                        <form action={`/api/admin/enrollments/${enrollment.id}`} method="post">
                          <input type="hidden" name="_method" value="DELETE" />
                          <input type="hidden" name="redirectTo" value={`/admin/groups/${group.id}`} />
                          <button className="rounded bg-red-600 px-2 py-1 text-xs text-white">Chiqarish</button>
                        </form>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Holati: {formatEnrollmentStatus(enrollment.status)} | Boshlagan sana:{" "}
                        {enrollment.studyStartDate ? formatUzDate(enrollment.studyStartDate) : "-"}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {group.enrollments.length === 0 ? <p className="mt-2 text-sm text-slate-500">Guruxda o'quvchi yo'q.</p> : null}
      </section>

      <GroupJournalSection
        groupId={group.id}
        basePath={`/admin/groups/${group.id}`}
        journalMonth={journalMonth}
        canAddDate={false}
        canEditEntries={false}
        students={journalStudents}
        dates={journalDates.map((day) => ({
          id: day.id,
          journalDate: day.journalDate,
        }))}
        entries={journalEntries}
        lessons={lessonOptions}
      />
    </main>
  );
}

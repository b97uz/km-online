import Link from "next/link";
import { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@km/db";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { getCurrentMonthKey, isValidMonthKey } from "@/lib/group-journal";
import { GroupJournalSection } from "@/components/group-journal-section";

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

export default async function CuratorGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ journalMonth?: string; msg?: string; error?: string }>;
}) {
  const session = await requireRole("CURATOR");
  const { id } = await params;
  const query = await searchParams;
  const monthParam = (query?.journalMonth ?? "").trim();
  const journalMonth = isValidMonthKey(monthParam) ? monthParam : getCurrentMonthKey();

  const group = await prisma.groupCatalog.findFirst({
    where: {
      id,
      curatorId: session.userId,
    },
    include: {
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
        orderBy: { createdAt: "desc" },
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
        <Link href="/curator/students" className="rounded border px-3 py-2 text-sm text-slate-700">
          ← Students bo'limiga qaytish
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
          <p><span className="font-semibold">Vaqti:</span> {formatTimeRange(group.time, group.scheduleText)}</p>
          <p><span className="font-semibold">Format:</span> {group.format}</p>
          <p><span className="font-semibold">Sig'im:</span> {group.capacity}</p>
          <p><span className="font-semibold">Narx:</span> {group.priceMonthly.toLocaleString("uz-UZ")}</p>
          <p><span className="font-semibold">Status:</span> {group.status}</p>
          <p><span className="font-semibold">Aktiv o'quvchi:</span> {group._count.enrollments}</p>
        </div>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Guruxdagi o'quvchilar</h2>

        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2 text-left">Ism-familya</th>
                <th className="border p-2 text-left">Telefon raqami</th>
                <th className="border p-2 text-left">Ota-ona raqami</th>
                <th className="border p-2 text-left">Testlar results</th>
              </tr>
            </thead>
            <tbody>
              {group.enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td className="border p-2">{enrollment.student.fullName}</td>
                  <td className="border p-2">{enrollment.student.phone}</td>
                  <td className="border p-2">{enrollment.student.parentPhone ?? "-"}</td>
                  <td className="border p-2">
                    <Link
                      href={`/curator/results?studentId=${enrollment.student.id}`}
                      className="rounded bg-slate-800 px-3 py-1 text-white"
                    >
                      Testlar results
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {group.enrollments.length === 0 ? <p className="mt-2 text-sm text-slate-500">Bu guruhda student yo'q.</p> : null}
      </section>

      <GroupJournalSection
        groupId={group.id}
        basePath={`/curator/groups/${group.id}`}
        journalMonth={journalMonth}
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

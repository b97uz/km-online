import Link from "next/link";
import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

type Search = {
  lessonId?: string;
};

export default async function CuratorResultsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireRole("CURATOR");
  const params = await searchParams;
  const selectedLessonId = (params?.lessonId ?? "").trim();

  const [tests, submissions] = await Promise.all([
    prisma.test.findMany({
      where: { isActive: true },
      include: {
        lesson: {
          include: {
            book: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.submission.findMany({
      where: {
        ...(selectedLessonId
          ? {
              test: {
                lessonId: selectedLessonId,
              },
            }
          : {}),
        OR: [
          {
            student: {
              studentGroups: {
                some: {
                  group: { curatorId: session.userId },
                },
              },
            },
          },
          {
            student: {
              studentProfile: {
                enrollments: {
                  some: {
                    group: {
                      curatorId: session.userId,
                    },
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            phone: true,
            studentGroups: {
              where: {
                group: { curatorId: session.userId },
              },
              include: {
                group: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            studentProfile: {
              select: {
                enrollments: {
                  where: {
                    group: { curatorId: session.userId },
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
          },
        },
        test: {
          include: {
            lesson: {
              include: {
                book: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const lessonOptions = Array.from(
    new Map(
      tests.map((test) => [
        test.lesson.id,
        {
          id: test.lesson.id,
          label: `${test.lesson.book.title} | ${test.lesson.lessonNumber}-dars`,
        },
      ]),
    ).values(),
  );

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Kurator: Test natijalari</h1>

      <section className="mt-4 rounded bg-white p-4 shadow">
        <form action="/curator/results" method="get" className="grid gap-2">
          <select name="lessonId" className="rounded border p-2" defaultValue={selectedLessonId}>
            <option value="">Kitob + dars raqamini tanlang</option>
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-4 py-2 text-white">Filtrlash</button>
            <Link href="/curator/results" className="rounded bg-slate-700 px-4 py-2 text-white">
              Tozalash
            </Link>
            <Link href="/curator" className="rounded bg-slate-200 px-4 py-2">
              Kurator panelga qaytish
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-4 rounded bg-white p-4 shadow">
        <p className="mb-3 text-sm text-slate-700">Topildi: {submissions.length} ta topshirish</p>
        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2 text-left">Vaqt</th>
                <th className="border p-2 text-left">Student</th>
                <th className="border p-2 text-left">Guruh</th>
                <th className="border p-2 text-left">Dars/Test</th>
                <th className="border p-2 text-left">Ball</th>
                <th className="border p-2 text-left">Raw javob</th>
                <th className="border p-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => {
                const oldGroupNames = submission.student.studentGroups.map((x) => x.group.name);
                const newGroupNames = (submission.student.studentProfile?.enrollments ?? []).map(
                  (x) => `${x.group.code} (${x.group.fan})`,
                );
                const groupNames = Array.from(new Set([...oldGroupNames, ...newGroupNames])).join(", ");

                return (
                  <tr key={submission.id}>
                    <td className="border p-2">{formatDate(submission.createdAt)}</td>
                    <td className="border p-2">{submission.student.phone ?? "-"}</td>
                    <td className="border p-2">{groupNames || "-"}</td>
                    <td className="border p-2">
                      {submission.test.lesson.book.title} | {submission.test.lesson.lessonNumber}-dars
                    </td>
                    <td className="border p-2">
                      {submission.score}/{submission.test.totalQuestions}
                    </td>
                    <td className="border p-2 break-all">{submission.rawAnswerText}</td>
                    <td className="border p-2">
                      <Link href={`/curator/results/${submission.id}`} className="rounded bg-slate-800 px-3 py-1 text-white">
                        Ochish
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

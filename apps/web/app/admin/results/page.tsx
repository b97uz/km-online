import Link from "next/link";
import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";
import { phoneVariants } from "@/lib/phone";

type Search = {
  lessonId?: string;
  studentPhone?: string;
  groupId?: string;
  studentId?: string;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const selectedLessonId = (params?.lessonId ?? "").trim();
  const studentPhone = (params?.studentPhone ?? "").trim();
  const groupId = (params?.groupId ?? "").trim();
  const studentId = (params?.studentId ?? "").trim();
  const whereClauses: Record<string, unknown>[] = [];

  if (selectedLessonId) {
    whereClauses.push({
      test: {
        lessonId: selectedLessonId,
      },
    });
  }

  if (studentPhone) {
    whereClauses.push({
      student: {
        OR: [
          ...phoneVariants(studentPhone).map((phone) => ({ phone })),
          { phone: { contains: studentPhone } },
        ],
      },
    });
  }

  if (studentId) {
    whereClauses.push({
      student: {
        studentProfile: {
          id: studentId,
        },
      },
    });
  }

  if (groupId) {
    whereClauses.push({
      OR: [
        {
          student: {
            studentProfile: {
              enrollments: {
                some: {
                  groupId,
                },
              },
            },
          },
        },
        {
          student: {
            studentGroups: {
              some: {
                groupId,
              },
            },
          },
        },
      ],
    });
  }

  const [tests, groups, selectedStudent, submissions] = await Promise.all([
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
      take: 200,
    }),
    prisma.groupCatalog.findMany({
      select: {
        id: true,
        code: true,
        fan: true,
      },
      orderBy: [{ code: "asc" }],
      take: 500,
    }),
    studentId
      ? prisma.student.findUnique({
          where: { id: studentId },
          select: { id: true, fullName: true, phone: true },
        })
      : null,
    prisma.submission.findMany({
      where: whereClauses.length > 0 ? { AND: whereClauses } : undefined,
      include: {
        student: {
          select: {
            id: true,
            phone: true,
            studentProfile: {
              select: {
                enrollments: {
                  include: {
                    group: {
                      include: {
                        curator: {
                          include: {
                            curatorProfile: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            studentGroups: {
              include: {
                group: {
                  include: {
                    curator: {
                      include: {
                        curatorProfile: true,
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
      take: 700,
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
      <h1 className="text-2xl font-bold">Admin: Test natijalari</h1>

      <section className="mt-4 rounded bg-white p-4 shadow">
        <form action="/admin/results" method="get" className="grid gap-2 md:grid-cols-4">
          {studentId ? <input type="hidden" name="studentId" value={studentId} /> : null}
          <select name="lessonId" className="rounded border p-2" defaultValue={selectedLessonId}>
            <option value="">Kitob + dars raqamini tanlang</option>
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.label}
              </option>
            ))}
          </select>

          <input
            name="studentPhone"
            className="rounded border p-2"
            placeholder="Student telefon"
            defaultValue={studentPhone}
          />

          <select name="groupId" className="rounded border p-2" defaultValue={groupId}>
            <option value="">Barcha guruhlar</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.code} ({group.fan})
              </option>
            ))}
          </select>

          <button className="rounded bg-blue-600 px-4 py-2 text-white">Filtrlash</button>
        </form>

        {selectedStudent ? (
          <p className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-700">
            Student filter yoqilgan: {selectedStudent.fullName} ({selectedStudent.phone})
          </p>
        ) : null}

        <div className="mt-2 flex gap-2">
          <Link href="/admin/results" className="rounded bg-slate-700 px-4 py-2 text-white">
            Tozalash
          </Link>
          <Link href="/admin" className="rounded bg-slate-200 px-4 py-2">
            Adminga qaytish
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded bg-white p-4 shadow">
        <p className="mb-3 text-sm text-slate-700">Topildi: {submissions.length} ta topshirish</p>
        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2 text-left">Vaqt</th>
                <th className="border p-2 text-left">Student</th>
                <th className="border p-2 text-left">Kitob</th>
                <th className="border p-2 text-left">Dars</th>
                <th className="border p-2 text-left">Ball</th>
                <th className="border p-2 text-left">Kuratori</th>
                <th className="border p-2 text-left">Guruhi</th>
                <th className="border p-2 text-left">Ochish</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => {
                const catalogEnrollments = submission.student.studentProfile?.enrollments ?? [];
                const catalogGroups = catalogEnrollments.map((e) => `${e.group.code} (${e.group.fan})`);
                const catalogCurators = catalogEnrollments.map(
                  (e) => e.group.curator?.curatorProfile?.fullName ?? e.group.curator?.phone,
                );

                const legacyGroups = submission.student.studentGroups.map((e) => e.group.name);
                const legacyCurators = submission.student.studentGroups.map(
                  (e) => e.group.curator?.curatorProfile?.fullName ?? e.group.curator?.phone,
                );

                const groupText = Array.from(new Set([...catalogGroups, ...legacyGroups].filter(Boolean))).join(", ") || "-";
                const curatorText =
                  Array.from(new Set([...catalogCurators, ...legacyCurators].filter(Boolean))).join(", ") || "-";

                return (
                  <tr key={submission.id}>
                    <td className="border p-2">{formatDate(submission.createdAt)}</td>
                    <td className="border p-2">{submission.student.phone ?? "-"}</td>
                    <td className="border p-2">{submission.test.lesson.book.title}</td>
                    <td className="border p-2">{submission.test.lesson.lessonNumber}-dars</td>
                    <td className="border p-2">
                      {submission.score}/{submission.test.totalQuestions}
                    </td>
                    <td className="border p-2">{curatorText}</td>
                    <td className="border p-2">{groupText}</td>
                    <td className="border p-2">
                      <Link href={`/admin/results/${submission.id}`} className="rounded bg-slate-800 px-3 py-1 text-white">
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

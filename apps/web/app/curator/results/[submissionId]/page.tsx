import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function CuratorSubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const session = await requireRole("CURATOR");
  const { submissionId } = await params;

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      OR: [
        {
          student: {
            studentGroups: {
              some: {
                group: {
                  curatorId: session.userId,
                },
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
          telegramUserId: true,
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
      details: {
        orderBy: { questionNumber: "asc" },
      },
    },
  });

  if (!submission) notFound();

  const oldGroupNames = submission.student.studentGroups.map((x) => x.group.name);
  const newGroupNames = (submission.student.studentProfile?.enrollments ?? []).map(
    (x) => `${x.group.code} (${x.group.fan})`,
  );
  const groupNames = Array.from(new Set([...oldGroupNames, ...newGroupNames])).join(", ");

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Kurator: Submission detail</h1>
      <div className="mt-3 flex gap-2">
        <Link href={`/curator/results?lessonId=${submission.test.lessonId}`} className="rounded bg-slate-800 px-4 py-2 text-white">
          Natijalarga qaytish
        </Link>
        <Link href="/curator" className="rounded bg-slate-200 px-4 py-2">
          Kurator panelga qaytish
        </Link>
      </div>

      <section className="mt-4 rounded bg-white p-4 shadow">
        <p>
          <b>Student:</b> {submission.student.phone ?? "-"}
        </p>
        <p>
          <b>Guruh:</b> {groupNames || "-"}
        </p>
        <p>
          <b>Telegram ID:</b> {submission.student.telegramUserId ?? "-"}
        </p>
        <p>
          <b>Test:</b> {submission.test.lesson.book.title} | {submission.test.lesson.lessonNumber}-dars
        </p>
        <p>
          <b>Score:</b> {submission.score}/{submission.test.totalQuestions}
        </p>
        <p>
          <b>Vaqt:</b> {formatDate(submission.createdAt)}
        </p>
        <p className="mt-2 break-all">
          <b>Raw javob:</b> {submission.rawAnswerText}
        </p>
      </section>

      <section className="mt-4 rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-xl">Savolma-savol natija</h2>
        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2 text-left">#</th>
                <th className="border p-2 text-left">Berilgan</th>
                <th className="border p-2 text-left">To'g'ri</th>
                <th className="border p-2 text-left">Holat</th>
              </tr>
            </thead>
            <tbody>
              {submission.details.map((detail) => (
                <tr key={detail.id}>
                  <td className="border p-2">{detail.questionNumber}</td>
                  <td className="border p-2">{detail.givenAnswer ?? "-"}</td>
                  <td className="border p-2">{detail.correctAnswer}</td>
                  <td className="border p-2">{detail.isCorrect ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

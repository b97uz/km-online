import Link from "next/link";
import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";

type CuratorDashboardParams = {
  msg?: string;
  error?: string;
};

export default async function CuratorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<CuratorDashboardParams>;
}) {
  const session = await requireRole("CURATOR");
  const params = await searchParams;

  const [groupCount, activeEnrollmentCount, accessWindowCount, submissionCount] = await Promise.all([
    prisma.groupCatalog.count({ where: { curatorId: session.userId } }),
    prisma.enrollment.count({
      where: {
        status: "ACTIVE",
        group: { curatorId: session.userId },
      },
    }),
    prisma.accessWindow.count({
      where: {
        createdBy: session.userId,
        isActive: true,
        openTo: { gte: new Date() },
      },
    }),
    prisma.submission.count({
      where: {
        OR: [
          {
            student: {
              studentProfile: {
                enrollments: {
                  some: {
                    group: { curatorId: session.userId },
                  },
                },
              },
            },
          },
          {
            student: {
              studentGroups: {
                some: {
                  group: { curatorId: session.userId },
                },
              },
            },
          },
        ],
      },
    }),
  ]);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Curator Dashboard</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded bg-white p-4 shadow">Mening guruhlarim: {groupCount}</div>
        <div className="rounded bg-white p-4 shadow">Aktiv enrollment: {activeEnrollmentCount}</div>
        <div className="rounded bg-white p-4 shadow">Aktiv access window: {accessWindowCount}</div>
        <div className="rounded bg-white p-4 shadow">Submissionlar: {submissionCount}</div>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Tezkor havolalar</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/curator/groups" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            My Groups
          </Link>
          <Link href="/curator/students" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Students
          </Link>
          <Link href="/curator/access-windows" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Access Window
          </Link>
          <Link href="/curator/results" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Results
          </Link>
        </div>
      </section>
    </main>
  );
}

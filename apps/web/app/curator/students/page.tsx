import Link from "next/link";
import { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";

type CuratorStudentsParams = {
  msg?: string;
  error?: string;
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

export default async function CuratorStudentsPage({
  searchParams,
}: {
  searchParams: Promise<CuratorStudentsParams>;
}) {
  const session = await requireRole("CURATOR");
  const params = await searchParams;

  const assignedGroups = await prisma.groupCatalog.findMany({
    where: { curatorId: session.userId },
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
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Students</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <p className="text-sm text-slate-600">
          O'quvchini guruhga qo'shish, status o'zgartirish va guruhdan chiqarish faqat Admin panel orqali bajariladi.
        </p>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Guruxlar ro'yxati</h2>

        <div className="space-y-3">
          {assignedGroups.map((group) => {
            const curatorName = group.curator?.curatorProfile?.fullName ?? group.curator?.phone ?? "-";
            const daysText = formatDays(group.days, group.scheduleText);
            const timeText = formatTimeRange(group.time, group.scheduleText);

            return (
              <div key={group.id} className="rounded border p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
                    <p><span className="font-semibold">Gurux:</span> {group.code}</p>
                    <p><span className="font-semibold">Fan:</span> {group.fan}</p>
                    <p><span className="font-semibold">Kunlar:</span> {daysText}</p>
                    <p><span className="font-semibold">Vaqti:</span> {timeText}</p>
                    <p><span className="font-semibold">Format:</span> {group.format}</p>
                    <p><span className="font-semibold">Sig'im:</span> {group.capacity}</p>
                    <p><span className="font-semibold">Narx:</span> {group.priceMonthly.toLocaleString("uz-UZ")}</p>
                    <p><span className="font-semibold">Status:</span> {group.status}</p>
                    <p><span className="font-semibold">Aktiv o'quvchi:</span> {group._count.enrollments}</p>
                    <p className="xl:col-span-3"><span className="font-semibold">Kuratori:</span> {curatorName}</p>
                  </div>

                  <div className="flex items-start justify-start md:justify-end">
                    <Link href={`/curator/groups/${group.id}`} className="inline-flex rounded bg-slate-800 px-3 py-2 text-sm text-white">
                      Guruxni ko'rish
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {assignedGroups.length === 0 ? <p className="text-sm text-slate-500">Sizga guruh biriktirilmagan.</p> : null}
        </div>
      </section>
    </main>
  );
}

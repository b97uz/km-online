import Link from "next/link";
import { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@km/db";

type GroupsPageParams = {
  msg?: string;
  error?: string;
  groupCuratorId?: string;
};

const GROUP_FAN_OPTIONS = ["Kimyo", "Biologiya"] as const;

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

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<GroupsPageParams>;
}) {
  const params = await searchParams;
  const groupCuratorFilter = (params?.groupCuratorId ?? "").trim();

  const [curators, groups] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CURATOR" },
      include: { curatorProfile: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.groupCatalog.findMany({
      where: groupCuratorFilter ? { curatorId: groupCuratorFilter } : undefined,
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
              where: { status: EnrollmentStatus.ACTIVE },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    }),
  ]);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Groups</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Group catalog yaratish</h2>
        <form action="/api/admin/groups" method="post" className="grid gap-2">
          <input name="code" className="rounded border p-2" placeholder="G0001" required />
          <select name="fan" className="rounded border p-2" defaultValue="" required>
            <option value="">Fanni tanlang</option>
            {GROUP_FAN_OPTIONS.map((fan) => (
              <option key={fan} value={fan}>
                {fan}
              </option>
            ))}
          </select>
          <select name="days" className="rounded border p-2" defaultValue="" required>
            <option value="">Kunlarni tanlang</option>
            <option value="DU_CHOR_JU">Du-Chor-Ju</option>
            <option value="SE_PAY_SHAN">Se-Pay-Shan</option>
          </select>
          <input name="startTime" type="time" className="rounded border p-2" required />
          <input name="endTime" type="time" className="rounded border p-2" required />
          <select name="format" className="rounded border p-2" defaultValue="ONLINE">
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
          <input name="capacity" type="number" min={1} className="rounded border p-2" placeholder="Sig'im" required />
          <input name="priceMonthly" type="number" min={0} className="rounded border p-2" placeholder="Narx (oylik)" required />
          <select name="status" className="rounded border p-2" defaultValue="REJADA">
            <option value="REJADA">REJADA</option>
            <option value="OCHIQ">OCHIQ</option>
            <option value="BOSHLANGAN">BOSHLANGAN</option>
            <option value="YOPIQ">YOPIQ</option>
          </select>
          <select name="curatorId" className="rounded border p-2" defaultValue="">
            <option value="">Kurator tanlanmagan</option>
            {curators.map((curator) => (
              <option key={curator.id} value={curator.id}>
                {curator.curatorProfile?.fullName ?? curator.phone ?? curator.id}
              </option>
            ))}
          </select>
          <button className="rounded bg-blue-600 p-2 text-white">Group yaratish</button>
        </form>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Guruxlar ro'yxati</h2>
        <form action="/admin/groups" method="get" className="mb-4 grid gap-2 md:max-w-sm">
          <select name="groupCuratorId" className="rounded border p-2" defaultValue={groupCuratorFilter}>
            <option value="">Barcha kuratorlar</option>
            {curators.map((curator) => (
              <option key={curator.id} value={curator.id}>
                {curator.curatorProfile?.fullName ?? curator.phone ?? curator.id}
              </option>
            ))}
          </select>
          <button className="rounded bg-slate-800 p-2 text-white">Filter</button>
        </form>

        <div className="space-y-3">
          {groups.map((group) => {
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
                    <div className="flex flex-col gap-2">
                    <Link href={`/admin/groups/${group.id}`} className="inline-flex rounded bg-slate-800 px-3 py-2 text-sm text-white">
                      Guruxni ko'rish
                    </Link>
                    <Link href={`/admin/groups/${group.id}/edit`} className="inline-flex rounded bg-blue-600 px-3 py-2 text-sm text-white">
                      Guruxni tahrirlash
                    </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {groups.length === 0 ? <p className="text-sm text-slate-500">Guruh topilmadi.</p> : null}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { prisma } from "@km/db";
import { notFound } from "next/navigation";

type GroupEditPageParams = {
  msg?: string;
  error?: string;
};

const GROUP_FAN_OPTIONS = ["Kimyo", "Biologiya"] as const;

type DaysValue = "DU_CHOR_JU" | "SE_PAY_SHAN";

function normalizeDaysValue(value: string | null): DaysValue {
  if (value === "SE_PAY_SHAN") return "SE_PAY_SHAN";
  return "DU_CHOR_JU";
}

function getStartTime(value: string | null): string {
  const raw = (value ?? "").match(/(\d{1,2}:[0-5]\d)\s*-\s*(\d{1,2}:[0-5]\d)/);
  if (raw?.[1]) return raw[1].padStart(5, "0");
  return "09:00";
}

function getEndTime(value: string | null): string {
  const raw = (value ?? "").match(/(\d{1,2}:[0-5]\d)\s*-\s*(\d{1,2}:[0-5]\d)/);
  if (raw?.[2]) return raw[2].padStart(5, "0");
  return "11:00";
}

export default async function AdminGroupEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<GroupEditPageParams>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const [group, curators] = await Promise.all([
    prisma.groupCatalog.findUnique({
      where: { id },
    }),
    prisma.user.findMany({
      where: { role: "CURATOR" },
      include: { curatorProfile: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  if (!group) notFound();

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/groups" className="rounded border px-3 py-2 text-sm text-slate-700">
          ← Guruxlar ro'yxatiga qaytish
        </Link>
        <h1 className="text-2xl font-bold">Guruxni tahrirlash</h1>
      </div>

      {query?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{query.msg}</p>
      ) : null}
      {query?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{query.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <form action={`/api/admin/groups/${group.id}`} method="post" className="grid gap-2">
          <input type="hidden" name="_method" value="PATCH" />

          <input name="code" className="rounded border p-2" defaultValue={group.code} required />

          <select name="fan" className="rounded border p-2" defaultValue={group.fan} required>
            {GROUP_FAN_OPTIONS.map((fan) => (
              <option key={fan} value={fan}>
                {fan}
              </option>
            ))}
          </select>

          <select name="days" className="rounded border p-2" defaultValue={normalizeDaysValue(group.days)} required>
            <option value="DU_CHOR_JU">Du-Chor-Ju</option>
            <option value="SE_PAY_SHAN">Se-Pay-Shan</option>
          </select>

          <input name="startTime" type="time" className="rounded border p-2" defaultValue={getStartTime(group.time)} required />
          <input name="endTime" type="time" className="rounded border p-2" defaultValue={getEndTime(group.time)} required />

          <select name="format" className="rounded border p-2" defaultValue={group.format}>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>

          <input
            name="capacity"
            type="number"
            min={1}
            className="rounded border p-2"
            defaultValue={group.capacity}
            required
          />

          <input
            name="priceMonthly"
            type="number"
            min={0}
            className="rounded border p-2"
            defaultValue={group.priceMonthly}
            required
          />

          <select name="status" className="rounded border p-2" defaultValue={group.status}>
            <option value="REJADA">REJADA</option>
            <option value="OCHIQ">OCHIQ</option>
            <option value="BOSHLANGAN">BOSHLANGAN</option>
            <option value="YOPIQ">YOPIQ</option>
          </select>

          <select name="curatorId" className="rounded border p-2" defaultValue={group.curatorId ?? ""}>
            <option value="">Kurator tanlanmagan</option>
            {curators.map((curator) => (
              <option key={curator.id} value={curator.id}>
                {curator.curatorProfile?.fullName ?? curator.phone ?? curator.id}
              </option>
            ))}
          </select>

          <button className="rounded bg-blue-600 p-2 text-white">Saqlash</button>
        </form>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Xavfli amal</h2>
        <form action={`/api/admin/groups/${group.id}`} method="post">
          <input type="hidden" name="_method" value="DELETE" />
          <button className="rounded bg-red-600 px-3 py-2 text-sm text-white">Guruxni o'chirish</button>
        </form>
      </section>
    </main>
  );
}

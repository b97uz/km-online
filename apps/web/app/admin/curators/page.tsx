import { prisma } from "@km/db";
import { formatCuratorWorkDays } from "@/lib/group-schedule";

type CuratorsPageParams = {
  msg?: string;
  error?: string;
};

function toTimeInput(value: string | null): string {
  if (!value) return "";
  const m = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return "";
  const h = Number(m[1]);
  if (h < 0 || h > 23) return "";
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export default async function AdminCuratorsPage({
  searchParams,
}: {
  searchParams: Promise<CuratorsPageParams>;
}) {
  const params = await searchParams;

  const curators = await prisma.user.findMany({
    where: { role: "CURATOR" },
    include: {
      curatorProfile: true,
      _count: {
        select: {
          catalogGroups: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Curators</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Kurator yaratish</h2>
        <form action="/api/admin/curators" method="post" className="grid gap-2 md:max-w-xl">
          <input name="fullName" className="rounded border p-2" placeholder="F.I.Sh" required />
          <input name="phone" className="rounded border p-2" placeholder="+998901234567" required />
          <input name="password" className="rounded border p-2" placeholder="Vaqtinchalik parol" required />
          <div className="grid gap-2 md:grid-cols-2">
            <select name="workDays" className="rounded border p-2" defaultValue="HAR_KUNI" required>
              <option value="DU_CHOR_JU">Du-Chor-Ju</option>
              <option value="SE_PAY_SHAN">Se-Pay-Shan</option>
              <option value="HAR_KUNI">Har kuni</option>
            </select>
            <input name="workStart" type="time" className="rounded border p-2" required />
            <input name="workEnd" type="time" className="rounded border p-2" required />
          </div>
          <button className="rounded bg-blue-600 p-2 text-white">Saqlash</button>
        </form>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Kuratorlar ro'yxati</h2>
        <div className="space-y-3">
          {curators.map((curator) => (
            <form key={curator.id} action={`/api/admin/curators/${curator.id}`} method="post" className="rounded border p-3">
              <input type="hidden" name="_method" value="PATCH" />
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  name="fullName"
                  className="rounded border p-2"
                  defaultValue={curator.curatorProfile?.fullName ?? ""}
                  placeholder="F.I.Sh"
                  required
                />
                <input
                  name="phone"
                  className="rounded border p-2"
                  defaultValue={curator.phone ?? ""}
                  placeholder="+998..."
                  required
                />
                <input
                  name="password"
                  className="rounded border p-2"
                  placeholder="Yangi parol (ixtiyoriy)"
                />
                <select
                  name="workDays"
                  className="rounded border p-2"
                  defaultValue={curator.curatorProfile?.workDays ?? "HAR_KUNI"}
                  required
                >
                  <option value="DU_CHOR_JU">Du-Chor-Ju</option>
                  <option value="SE_PAY_SHAN">Se-Pay-Shan</option>
                  <option value="HAR_KUNI">Har kuni</option>
                </select>
                <input
                  name="workStart"
                  type="time"
                  className="rounded border p-2"
                  defaultValue={toTimeInput(curator.curatorProfile?.workStart ?? null)}
                  required
                />
                <input
                  name="workEnd"
                  type="time"
                  className="rounded border p-2"
                  defaultValue={toTimeInput(curator.curatorProfile?.workEnd ?? null)}
                  required
                />
                <select
                  name="isActive"
                  className="rounded border p-2"
                  defaultValue={curator.isActive ? "true" : "false"}
                >
                  <option value="true">ACTIVE</option>
                  <option value="false">DISABLED</option>
                </select>
              </div>

              <div className="mt-2 grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                <p>Guruhlar soni: {curator._count.catalogGroups}</p>
                <p>
                  Ish kun/vaqti: {formatCuratorWorkDays(curator.curatorProfile?.workDays ?? null)} |{" "}
                  {curator.curatorProfile?.workStart ?? "-"} - {curator.curatorProfile?.workEnd ?? "-"}
                </p>
              </div>

              <button className="mt-2 rounded bg-slate-800 px-3 py-2 text-white">Kuratorni yangilash</button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}

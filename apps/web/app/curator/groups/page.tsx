import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";

type CuratorGroupsParams = {
  msg?: string;
  error?: string;
};

export default async function CuratorGroupsPage({
  searchParams,
}: {
  searchParams: Promise<CuratorGroupsParams>;
}) {
  const session = await requireRole("CURATOR");
  const params = await searchParams;

  const groups = await prisma.groupCatalog.findMany({
    where: { curatorId: session.userId },
    include: {
      enrollments: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">My Groups</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <p className="text-sm text-slate-600">Guruhlar admin tomonidan yaratiladi va sizga biriktiriladi.</p>
      </section>

      <section className="space-y-3">
        {groups.map((group) => {
          const trial = group.enrollments.filter((x) => x.status === "TRIAL").length;
          const active = group.enrollments.filter((x) => x.status === "ACTIVE").length;
          const paused = group.enrollments.filter((x) => x.status === "PAUSED").length;
          const left = group.enrollments.filter((x) => x.status === "LEFT").length;

          return (
            <div key={group.id} className="rounded bg-white p-4 shadow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {group.code} - {group.fan}
                </h2>
                <span className="rounded bg-slate-100 px-2 py-1 text-sm">{group.status}</span>
              </div>

              <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                <p>Jadval: {group.scheduleText}</p>
                <p>Format: {group.format}</p>
                <p>Narx: {group.priceMonthly.toLocaleString("uz-UZ")}</p>
                <p>Sig'im: {group.capacity}</p>
                <p>Sinov: {trial}</p>
                <p>Aktiv: {active}</p>
                <p>To'xtatgan/Tugatgan: {paused}/{left}</p>
              </div>
            </div>
          );
        })}

        {groups.length === 0 ? <p className="rounded bg-white p-4 shadow text-sm">Sizga hali guruh biriktirilmagan.</p> : null}
      </section>
    </main>
  );
}

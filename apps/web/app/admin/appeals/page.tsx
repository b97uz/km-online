import { prisma } from "@km/db";
import { requireRole } from "@/lib/require-role";

type AppealsPageSearch = {
  msg?: string;
  error?: string;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function senderLabel(value: "STUDENT" | "PARENT") {
  return value === "STUDENT" ? "O'quvchi" : "Ota-ona";
}

export default async function AdminAppealsPage({
  searchParams,
}: {
  searchParams: Promise<AppealsPageSearch>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const appeals = await prisma.appeal.findMany({
    include: {
      student: {
        select: {
          fullName: true,
          phone: true,
          parentPhone: true,
        },
      },
      resolvedBy: {
        select: {
          username: true,
          phone: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 1000,
  });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">E'tirozlar</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <p className="text-sm text-slate-600">Yangi e'tirozlar bot orqali keladi. Hal qilinganda student/ota-onaga xabar yuboriladi.</p>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <div className="overflow-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2 text-left">Vaqt</th>
                <th className="border p-2 text-left">Kimdan</th>
                <th className="border p-2 text-left">O'quvchi</th>
                <th className="border p-2 text-left">Telefonlar</th>
                <th className="border p-2 text-left">E'tiroz matni</th>
                <th className="border p-2 text-left">Holat</th>
                <th className="border p-2 text-left">Amal</th>
              </tr>
            </thead>
            <tbody>
              {appeals.map((appeal) => (
                <tr key={appeal.id} className={appeal.status === "RESOLVED" ? "bg-slate-50 text-slate-600" : ""}>
                  <td className="border p-2 whitespace-nowrap">{formatDate(appeal.createdAt)}</td>
                  <td className="border p-2">{senderLabel(appeal.senderType)}</td>
                  <td className="border p-2">{appeal.student.fullName}</td>
                  <td className="border p-2">
                    <p>O'quvchi: {appeal.student.phone}</p>
                    <p>Ota-ona: {appeal.student.parentPhone ?? "-"}</p>
                  </td>
                  <td className="border p-2 whitespace-pre-wrap">{appeal.text}</td>
                  <td className="border p-2">
                    {appeal.status === "OPEN" ? (
                      <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Yangi</span>
                    ) : (
                      <div className="space-y-1">
                        <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">Hal qilingan</span>
                        <p className="text-xs">
                          {appeal.resolvedAt ? formatDate(appeal.resolvedAt) : "-"}
                        </p>
                        <p className="text-xs">
                          {appeal.resolvedBy?.username ?? appeal.resolvedBy?.phone ?? "-"}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="border p-2">
                    {appeal.status === "OPEN" ? (
                      <form action={`/api/admin/appeals/${appeal.id}/resolve`} method="post">
                        <button className="rounded bg-green-600 px-3 py-2 text-white">Hal qilindi ✅</button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-500">Yopilgan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {appeals.length === 0 ? <p className="mt-2 text-sm text-slate-500">E'tirozlar hozircha yo'q.</p> : null}
      </section>
    </main>
  );
}

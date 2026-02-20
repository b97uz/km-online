import Link from "next/link";

type ExcelImportPageParams = {
  msg?: string;
  error?: string;
};

export default async function AdminLocationsExcelImportPage({
  searchParams,
}: {
  searchParams: Promise<ExcelImportPageParams>;
}) {
  const params = await searchParams;

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Locations → Excel Import</h1>
        <Link
          href="/admin/locations"
          className="rounded border px-3 py-2 text-sm text-slate-700"
        >
          ← Locations ga qaytish
        </Link>
      </div>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">1) maktablar.xlsx import</h2>
        <p className="mb-3 text-sm text-slate-600">Kerakli ustunlar: `Viloyat | Tuman | Maktab`</p>
        <form action="/api/admin/locations/excel-import" method="post" encType="multipart/form-data" className="grid gap-2">
          <input type="hidden" name="importType" value="SCHOOL" />
          <input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="rounded border p-2" required />
          <button className="rounded bg-blue-600 px-4 py-2 text-white">Maktablarni import qilish</button>
        </form>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">2) litsey_kollej.xlsx import</h2>
        <p className="mb-3 text-sm text-slate-600">Kerakli ustunlar: `Viloyat | Tuman | LitseyKollej`</p>
        <form action="/api/admin/locations/excel-import" method="post" encType="multipart/form-data" className="grid gap-2">
          <input type="hidden" name="importType" value="LYCEUM_COLLEGE" />
          <input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="rounded border p-2" required />
          <button className="rounded bg-blue-600 px-4 py-2 text-white">Litsey/Kollejlarni import qilish</button>
        </form>
      </section>
    </main>
  );
}


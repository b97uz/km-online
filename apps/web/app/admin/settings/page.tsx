import { requireRole } from "@/lib/require-role";

type SettingsPageParams = {
  msg?: string;
  error?: string;
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SettingsPageParams>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow md:max-w-xl">
        <h2 className="mb-2 text-lg font-semibold">Admin parolini yangilash</h2>
        <form action="/api/admin/password" method="post" className="grid gap-2">
          <input
            name="currentPassword"
            type="password"
            className="rounded border p-2"
            placeholder="Hozirgi parol"
            required
          />
          <input
            name="newPassword"
            type="password"
            className="rounded border p-2"
            placeholder="Yangi parol (kamida 8 belgi)"
            required
          />
          <input
            name="confirmPassword"
            type="password"
            className="rounded border p-2"
            placeholder="Yangi parolni tasdiqlang"
            required
          />
          <button className="rounded bg-blue-600 p-2 text-white">Parolni saqlash</button>
        </form>
      </section>
    </main>
  );
}

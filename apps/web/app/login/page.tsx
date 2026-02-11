export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params?.error === "1";

  return (
    <main className="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 shadow">
      <h1 className="mb-4 text-2xl font-semibold">Tizimga kirish</h1>
      {hasError ? (
        <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          Login yoki parol noto'g'ri.
        </p>
      ) : null}
      <form className="space-y-3" action="/api/auth/login" method="post">
        <select name="loginType" className="w-full rounded border p-2" required>
          <option value="admin">Admin</option>
          <option value="curator">Kurator</option>
        </select>
        <input name="username" placeholder="Admin username (admin)" defaultValue="admin" className="w-full rounded border p-2" />
        <input name="phone" placeholder="Kurator telefon +998..." className="w-full rounded border p-2" />
        <input name="password" type="password" placeholder="Parol" className="w-full rounded border p-2" required />
        <button className="w-full rounded bg-blue-600 p-2 font-medium text-white">Kirish</button>
      </form>
      <p className="mt-3 text-sm text-slate-600">Admin uchun username+password, kurator uchun phone+password.</p>
      <p className="mt-1 text-xs text-slate-500">Boshlang'ich admin: username `admin`.</p>
    </main>
  );
}

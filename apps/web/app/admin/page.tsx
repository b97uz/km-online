import Link from "next/link";
import { prisma } from "@km/db";
import { isPaymentTableMissingError } from "@/lib/payment-table";

type AdminDashboardParams = {
  msg?: string;
  error?: string;
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<AdminDashboardParams>;
}) {
  const params = await searchParams;

  const [curators, students, groups, tests, submissions, openAppeals] = await Promise.all([
    prisma.user.count({ where: { role: "CURATOR" } }),
    prisma.student.count(),
    prisma.groupCatalog.count(),
    prisma.test.count({ where: { isActive: true } }),
    prisma.submission.count(),
    prisma.appeal.count({ where: { status: "OPEN" } }),
  ]);

  let payments = 0;
  let debtCount = 0;
  let paymentTableMissing = false;

  try {
    [payments, debtCount] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: { in: ["PARTIAL", "DEBT"] } } }),
    ]);
  } catch (error) {
    if (isPaymentTableMissingError(error)) {
      paymentTableMissing = true;
    } else {
      throw error;
    }
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}
      {paymentTableMissing ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Payments jadvali hali DBga qo'llanmagan. `packages/db` ichida `prisma migrate deploy` ni ishga tushiring.
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded bg-white p-4 shadow">Kuratorlar: {curators}</div>
        <div className="rounded bg-white p-4 shadow">Studentlar: {students}</div>
        <div className="rounded bg-white p-4 shadow">Guruhlar: {groups}</div>
        <div className="rounded bg-white p-4 shadow">Aktiv testlar: {tests}</div>
        <div className="rounded bg-white p-4 shadow">Submissionlar: {submissions}</div>
        <div className="rounded bg-white p-4 shadow">Yangi e'tirozlar: {openAppeals}</div>
        <div className="rounded bg-white p-4 shadow">To'lov yozuvlari: {payments}</div>
        <div className="rounded bg-white p-4 shadow">Qarzdor yozuvlar: {debtCount}</div>
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Tezkor havolalar</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/students" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Students
          </Link>
          <Link href="/admin/groups" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Groups
          </Link>
          <Link href="/admin/tests" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Tests
          </Link>
          <Link href="/admin/results" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Results
          </Link>
          <Link href="/admin/payments" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            Payments
          </Link>
          <Link href="/admin/appeals" className="rounded bg-slate-800 px-3 py-2 text-sm text-white">
            E'tirozlar
          </Link>
        </div>
      </section>
    </main>
  );
}

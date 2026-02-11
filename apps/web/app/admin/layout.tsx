import Link from "next/link";
import { requireRole } from "@/lib/require-role";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/curators", label: "Curators" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/tests", label: "Tests" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/appeals", label: "E'tirozlar" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded bg-white p-3 shadow">
          <h2 className="mb-3 text-lg font-semibold">Admin bo'limlari</h2>
          <nav className="space-y-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}

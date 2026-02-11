import Link from "next/link";
import { requireRole } from "@/lib/require-role";

const curatorNav = [
  { href: "/curator", label: "Dashboard" },
  { href: "/curator/groups", label: "My Groups" },
  { href: "/curator/students", label: "Students" },
  { href: "/curator/access-windows", label: "Access Window" },
  { href: "/curator/results", label: "Results" },
];

export default async function CuratorLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CURATOR");

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded bg-white p-3 shadow">
          <h2 className="mb-3 text-lg font-semibold">Kurator bo'limlari</h2>
          <nav className="space-y-1">
            {curatorNav.map((item) => (
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

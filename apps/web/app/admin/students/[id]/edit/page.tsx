import Link from "next/link";
import { prisma } from "@km/db";
import { notFound } from "next/navigation";
import { StudentEditForm } from "../../student-edit-form";

function formatSubjects(value: "CHEMISTRY" | "BIOLOGY" | "BOTH" | null) {
  if (value === "CHEMISTRY") return "Kimyo";
  if (value === "BIOLOGY") return "Biologiya";
  if (value === "BOTH") return "Kimyo/Biologiya";
  return "-";
}

export default async function AdminStudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          group: {
            select: {
              code: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) {
    notFound();
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/students" className="rounded border px-3 py-2 text-sm text-slate-700">
          ← Studentlar ro'yxatiga qaytish
        </Link>
        <h1 className="text-2xl font-bold">Studentni tahrirlash</h1>
      </div>

      <section className="rounded bg-white p-4 shadow">
        <div className="mb-4 grid gap-1 text-sm text-slate-600 md:grid-cols-3">
          <p>
            <span className="font-semibold">Joriy fan:</span> {formatSubjects(student.subjects)}
          </p>
          <p>
            <span className="font-semibold">Telefon:</span> {student.phone}
          </p>
          <p>
            <span className="font-semibold">Guruhlar:</span>{" "}
            {student.enrollments.length > 0
              ? student.enrollments.map((e) => e.group.code).join(", ")
              : "-"}
          </p>
        </div>

        <StudentEditForm student={student} />
      </section>
    </main>
  );
}

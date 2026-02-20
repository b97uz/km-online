import Link from "next/link";
import { prisma } from "@km/db";
import { isLocationTableMissingError } from "@/lib/location-table";
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
  const getStudent = () =>
    prisma.student.findUnique({
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

  let student: Awaited<ReturnType<typeof getStudent>>;
  let provinces: { id: string; name: string }[] = [];
  let districts: { id: string; name: string; provinceId: string }[] = [];
  let institutions: { id: string; name: string; districtId: string; type: "SCHOOL" | "LYCEUM_COLLEGE" }[] = [];
  let locationTableMissing = false;

  try {
    [student, provinces, districts, institutions] = await Promise.all([
      getStudent(),
      prisma.province.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 300,
      }),
      prisma.district.findMany({
        select: { id: true, name: true, provinceId: true },
        orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
        take: 3000,
      }),
      prisma.institution.findMany({
        select: { id: true, name: true, districtId: true, type: true },
        orderBy: [{ district: { province: { name: "asc" } } }, { district: { name: "asc" } }, { name: "asc" }],
        take: 10000,
      }),
    ]);
  } catch (error) {
    if (isLocationTableMissingError(error)) {
      locationTableMissing = true;
      student = await getStudent();
    } else {
      throw error;
    }
  }

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
        {locationTableMissing ? (
          <p className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Location jadvallari DBga tushmagan. Avval migratsiya qiling:
            <br />
            <code>pnpm --filter @km/db exec prisma migrate dev --name add_locations_catalog</code>
          </p>
        ) : null}

        <div className="mb-4 grid gap-1 text-sm text-slate-600 md:grid-cols-3">
          <p>
            <span className="font-semibold">Joriy fan:</span> {formatSubjects(student.subjects)}
          </p>
          <p>
            <span className="font-semibold">Student_ID:</span> {student.studentCode}
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

        {locationTableMissing ? null : (
          <StudentEditForm
            student={student}
            provinces={provinces}
            districts={districts}
            institutions={institutions}
          />
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import { StudentStatus, Subjects } from "@prisma/client";
import { prisma } from "@km/db";
import { StudentCreateForm } from "../student-create-form";

type StudentsPageParams = {
  msg?: string;
  error?: string;
  phone?: string;
  status?: string;
  subject?: string;
};

function formatSubjects(value: "CHEMISTRY" | "BIOLOGY" | "BOTH" | null) {
  if (value === "CHEMISTRY") return "Kimyo";
  if (value === "BIOLOGY") return "Biologiya";
  if (value === "BOTH") return "Kimyo/Biologiya";
  return "-";
}

function formatPersonType(
  value:
    | "GRADE_6"
    | "GRADE_7"
    | "GRADE_8"
    | "GRADE_9"
    | "GRADE_10"
    | "GRADE_11"
    | "COURSE_1"
    | "COURSE_2"
    | "ABITURIYENT"
    | "TALABA"
    | "OQITUVCHI"
    | null,
) {
  if (value === "GRADE_6") return "6-sinf";
  if (value === "GRADE_7") return "7-sinf";
  if (value === "GRADE_8") return "8-sinf";
  if (value === "GRADE_9") return "9-sinf";
  if (value === "GRADE_10") return "10-sinf";
  if (value === "GRADE_11") return "11-sinf";
  if (value === "COURSE_1") return "1-kurs";
  if (value === "COURSE_2") return "2-kurs";
  if (value === "ABITURIYENT") return "Abituriyent";
  if (value === "TALABA") return "Talaba";
  if (value === "OQITUVCHI") return "O'qituvchi";
  return "-";
}

function formatAvailabilityDays(value: "DU_CHOR_JU" | "SE_PAY_SHAN" | "FARQI_YOQ" | null) {
  if (value === "DU_CHOR_JU") return "Du-Chor-Ju";
  if (value === "SE_PAY_SHAN") return "Se-Pay-Shan";
  if (value === "FARQI_YOQ") return "Farqi yo'q";
  return "-";
}

function parseStatusFilter(value: string): StudentStatus | null {
  if (value === "ACTIVE") return StudentStatus.ACTIVE;
  if (value === "PASSIVE") return StudentStatus.PAUSED;
  if (value === "PAUSED") return StudentStatus.PAUSED;
  if (value === "BLOCKED") return StudentStatus.BLOCKED;
  return null;
}

function parseSubjectFilter(value: string): "CHEMISTRY" | "BIOLOGY" | null {
  if (value === "CHEMISTRY") return "CHEMISTRY";
  if (value === "BIOLOGY") return "BIOLOGY";
  return null;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<StudentsPageParams>;
}) {
  const params = await searchParams;
  const phoneFilter = (params?.phone ?? "").trim();
  const statusFilter = (params?.status ?? "").trim();
  const subjectFilter = (params?.subject ?? "").trim();
  const phoneDigits = phoneFilter.replace(/\D/g, "");

  const status = parseStatusFilter(statusFilter);
  const subject = parseSubjectFilter(subjectFilter);

  const students = await prisma.student.findMany({
    where: {
      ...(phoneFilter
        ? {
            OR: [{ phone: { contains: phoneFilter } }, ...(phoneDigits ? [{ phone: { contains: phoneDigits } }] : [])],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(subject
        ? {
            subjects: {
              in: subject === "CHEMISTRY" ? [Subjects.CHEMISTRY, Subjects.BOTH] : [Subjects.BIOLOGY, Subjects.BOTH],
            },
          }
        : {}),
    },
    include: {
      enrollments: {
        include: {
          group: {
            select: {
              id: true,
              code: true,
              fan: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Students</h1>

      {params?.msg ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{params.msg}</p>
      ) : null}
      {params?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      ) : null}

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Student yaratish</h2>
        <StudentCreateForm />
      </section>

      <section className="rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Student ro'yxati</h2>
        <form action="/admin/students" method="get" className="mb-3 grid gap-2 md:grid-cols-4">
          <input
            name="phone"
            defaultValue={phoneFilter}
            className="rounded border p-2"
            placeholder="Telefon bo'yicha qidirish"
          />
          <select name="status" defaultValue={statusFilter} className="rounded border p-2">
            <option value="">Barcha holatlar</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PASSIVE</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
          <select name="subject" defaultValue={subjectFilter} className="rounded border p-2">
            <option value="">Barcha fanlar</option>
            <option value="CHEMISTRY">Kimyo (Kimyo/Bio ham)</option>
            <option value="BIOLOGY">Biologiya (Kimyo/Bio ham)</option>
          </select>
          <button className="rounded bg-slate-800 p-2 text-white">Qidirish</button>
        </form>

        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="rounded border p-3">
              <div className="mb-3 grid gap-1 text-sm text-slate-700 md:grid-cols-2">
                <p>
                  <span className="font-semibold">Ism:</span> {student.fullName}
                </p>
                <p>
                  <span className="font-semibold">Telefon:</span> {student.phone}
                </p>
                <p>
                  <span className="font-semibold">Ota-ona:</span> {student.parentPhone ?? "-"}
                </p>
                <p>
                  <span className="font-semibold">Holat:</span>{" "}
                  {student.status === "PAUSED" ? "PASSIVE" : student.status}
                </p>
                <p>
                  <span className="font-semibold">Fan:</span> {formatSubjects(student.subjects)}
                </p>
                <p>
                  <span className="font-semibold">Darajalar:</span>{" "}
                  {student.subjects === "CHEMISTRY"
                    ? `Kimyo ${student.chemistryLevel ?? "-"}`
                    : student.subjects === "BIOLOGY"
                      ? `Biologiya ${student.biologyLevel ?? "-"}`
                      : student.subjects === "BOTH"
                        ? `Kimyo ${student.chemistryLevel ?? "-"} | Biologiya ${student.biologyLevel ?? "-"}`
                        : "-"}
                </p>
                <p>
                  <span className="font-semibold">Kimligi:</span> {formatPersonType(student.personType)}
                </p>
                <p>
                  <span className="font-semibold">Bo'sh vaqt:</span>{" "}
                  {formatAvailabilityDays(student.availabilityDays)} | {student.availabilityTime ?? "-"}
                </p>
                <p className="md:col-span-2">
                  <span className="font-semibold">Guruhlar:</span>{" "}
                  {student.enrollments.length > 0
                    ? student.enrollments
                        .map((e) => `${e.group.code} (${e.status})`)
                        .join(", ")
                    : "-"}
                </p>
              </div>

              <form
                action={`/api/admin/students/${student.id}`}
                method="post"
                className="grid gap-2 rounded bg-slate-50 p-2 md:grid-cols-[220px_1fr_auto]"
              >
                <input type="hidden" name="_method" value="PATCH" />
                <select name="status" className="rounded border p-2" defaultValue={student.status}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PASSIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
                <textarea
                  name="note"
                  className="rounded border p-2"
                  rows={2}
                  defaultValue={student.note ?? ""}
                  placeholder="Izoh"
                />
                <button className="rounded bg-slate-800 px-3 py-2 text-white">Saqlash</button>
              </form>

              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={`/admin/students/${student.id}/edit`}
                  className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
                >
                  Tahrirlash
                </Link>

                <form action={`/api/admin/students/${student.id}`} method="post">
                  <input type="hidden" name="_method" value="DELETE" />
                  <button className="rounded bg-red-600 px-3 py-2 text-sm text-white">Studentni o'chirish</button>
                </form>
              </div>
            </div>
          ))}

          {students.length === 0 ? <p className="text-sm text-slate-500">Student topilmadi.</p> : null}
        </div>
      </section>
    </main>
  );
}

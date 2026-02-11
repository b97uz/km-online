"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SubjectsValue = "" | "CHEMISTRY" | "BIOLOGY" | "BOTH";

type PersonTypeValue =
  | ""
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
  | "OQITUVCHI";

type AvailabilityDaysValue = "" | "DU_CHOR_JU" | "SE_PAY_SHAN" | "FARQI_YOQ";

type StudentStatusValue = "ACTIVE" | "PAUSED" | "BLOCKED";

type StudentEditFormProps = {
  student: {
    id: string;
    fullName: string;
    phone: string;
    parentPhone: string | null;
    status: StudentStatusValue;
    subjects: "CHEMISTRY" | "BIOLOGY" | "BOTH" | null;
    chemistryLevel: number | null;
    biologyLevel: number | null;
    personType:
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
      | null;
    availabilityDays: "DU_CHOR_JU" | "SE_PAY_SHAN" | "FARQI_YOQ" | null;
    availabilityTime: string | null;
    note: string | null;
  };
};

export function StudentEditForm({ student }: StudentEditFormProps) {
  const [subjects, setSubjects] = useState<SubjectsValue>(student.subjects ?? "");

  const showChemistryLevel = useMemo(
    () => subjects === "CHEMISTRY" || subjects === "BOTH",
    [subjects],
  );
  const showBiologyLevel = useMemo(
    () => subjects === "BIOLOGY" || subjects === "BOTH",
    [subjects],
  );

  return (
    <form action={`/api/admin/students/${student.id}`} method="post" className="grid gap-3">
      <input type="hidden" name="_method" value="PATCH" />

      <div className="grid gap-2 md:grid-cols-2">
        <input
          name="fullName"
          className="rounded border p-2"
          defaultValue={student.fullName}
          placeholder="F.I.Sh"
          required
        />
        <input
          name="phone"
          className="rounded border p-2"
          defaultValue={student.phone}
          placeholder="+998901234567"
          required
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <input
          name="parentPhone"
          className="rounded border p-2"
          defaultValue={student.parentPhone ?? ""}
          placeholder="Ota-ona raqami (ixtiyoriy)"
        />
        <select name="status" className="rounded border p-2" defaultValue={student.status as StudentStatusValue}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PASSIVE</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
      </div>

      <select
        name="subjects"
        className="rounded border p-2"
        value={subjects}
        onChange={(e) => setSubjects(e.target.value as SubjectsValue)}
        required
      >
        <option value="">Fan tanlang</option>
        <option value="CHEMISTRY">Kimyo</option>
        <option value="BIOLOGY">Biologiya</option>
        <option value="BOTH">Kimyo/Biologiya</option>
      </select>

      <div className="grid gap-2 md:grid-cols-2">
        {showChemistryLevel ? (
          <select
            name="chemistryLevel"
            className="rounded border p-2"
            defaultValue={student.chemistryLevel ?? ""}
            required={showChemistryLevel}
          >
            <option value="">Kimyo darajasi (1..4)</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        ) : null}

        {showBiologyLevel ? (
          <select
            name="biologyLevel"
            className="rounded border p-2"
            defaultValue={student.biologyLevel ?? ""}
            required={showBiologyLevel}
          >
            <option value="">Biologiya darajasi (1..4)</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        ) : null}
      </div>

      <select
        name="personType"
        className="rounded border p-2"
        defaultValue={(student.personType ?? "") as PersonTypeValue}
        required
      >
        <option value="">Kimligi tanlang</option>
        <option value="GRADE_6">6-sinf</option>
        <option value="GRADE_7">7-sinf</option>
        <option value="GRADE_8">8-sinf</option>
        <option value="GRADE_9">9-sinf</option>
        <option value="GRADE_10">10-sinf</option>
        <option value="GRADE_11">11-sinf</option>
        <option value="COURSE_1">1-kurs</option>
        <option value="COURSE_2">2-kurs</option>
        <option value="ABITURIYENT">Abituriyent</option>
        <option value="TALABA">Talaba</option>
        <option value="OQITUVCHI">O'qituvchi</option>
      </select>

      <div className="grid gap-2 md:grid-cols-2">
        <select
          name="availabilityDays"
          className="rounded border p-2"
          defaultValue={(student.availabilityDays ?? "") as AvailabilityDaysValue}
          required
        >
          <option value="">Bo'sh kunlar</option>
          <option value="DU_CHOR_JU">Du-Chor-Ju</option>
          <option value="SE_PAY_SHAN">Se-Pay-Shan</option>
          <option value="FARQI_YOQ">Farqi yo'q</option>
        </select>

        <input
          name="availabilityTime"
          className="rounded border p-2"
          defaultValue={student.availabilityTime ?? ""}
          placeholder="Masalan: 18:00-20:00"
          required
        />
      </div>

      <textarea name="note" className="rounded border p-2" rows={4} defaultValue={student.note ?? ""} placeholder="Izoh" />

      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Saqlash</button>
        <Link href="/admin/students" className="rounded border px-4 py-2 text-slate-700">
          Bekor qilish
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";

type SubjectsValue = "" | "CHEMISTRY" | "BIOLOGY" | "BOTH";

export function StudentCreateForm() {
  const [subjects, setSubjects] = useState<SubjectsValue>("");

  const showChemistryLevel = useMemo(
    () => subjects === "CHEMISTRY" || subjects === "BOTH",
    [subjects],
  );
  const showBiologyLevel = useMemo(
    () => subjects === "BIOLOGY" || subjects === "BOTH",
    [subjects],
  );

  return (
    <form action="/api/admin/students" method="post" className="grid gap-2">
      <input name="fullName" className="rounded border p-2" placeholder="F.I.Sh" required />
      <input name="phone" className="rounded border p-2" placeholder="+998901234567" required />
      <input name="parentPhone" className="rounded border p-2" placeholder="Ota-ona raqami (ixtiyoriy)" />

      <select name="status" className="rounded border p-2" defaultValue="ACTIVE">
        <option value="ACTIVE">ACTIVE</option>
        <option value="PAUSED">PASSIVE</option>
        <option value="BLOCKED">BLOCKED</option>
      </select>

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

      {showChemistryLevel ? (
        <select name="chemistryLevel" className="rounded border p-2" required={showChemistryLevel} defaultValue="">
          <option value="">Kimyo darajasi (1..4)</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      ) : null}

      {showBiologyLevel ? (
        <select name="biologyLevel" className="rounded border p-2" required={showBiologyLevel} defaultValue="">
          <option value="">Biologiya darajasi (1..4)</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      ) : null}

      <select name="personType" className="rounded border p-2" defaultValue="" required>
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

      <select name="availabilityDays" className="rounded border p-2" defaultValue="" required>
        <option value="">Bo'sh kunlar</option>
        <option value="DU_CHOR_JU">Du-Chor-Ju</option>
        <option value="SE_PAY_SHAN">Se-Pay-Shan</option>
        <option value="FARQI_YOQ">Farqi yo'q</option>
      </select>

      <input
        name="availabilityTime"
        className="rounded border p-2"
        placeholder="Masalan: 18:00-20:00 yoki kechqurun 19:00 dan keyin"
        required
      />

      <textarea
        name="note"
        className="rounded border p-2"
        placeholder="Izoh (ixtiyoriy)"
        rows={3}
      />

      <button className="rounded bg-blue-600 p-2 text-white">Student qo'shish</button>
    </form>
  );
}

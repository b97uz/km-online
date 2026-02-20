"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SubjectsValue = "" | "CHEMISTRY" | "BIOLOGY" | "BOTH";
type InstitutionTypeValue = "" | "SCHOOL" | "LYCEUM_COLLEGE" | "OTHER";

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

type ProvinceOption = {
  id: string;
  name: string;
};

type DistrictOption = {
  id: string;
  name: string;
  provinceId: string;
};

type InstitutionOption = {
  id: string;
  name: string;
  districtId: string;
  type: "SCHOOL" | "LYCEUM_COLLEGE";
};

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
    provinceId: string | null;
    districtId: string | null;
    institutionType: "SCHOOL" | "LYCEUM_COLLEGE" | "OTHER" | null;
    institutionId: string | null;
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
  provinces: ProvinceOption[];
  districts: DistrictOption[];
  institutions: InstitutionOption[];
};

export function StudentEditForm({ student, provinces, districts, institutions }: StudentEditFormProps) {
  const [subjects, setSubjects] = useState<SubjectsValue>(student.subjects ?? "");
  const [provinceId, setProvinceId] = useState(student.provinceId ?? "");
  const [districtId, setDistrictId] = useState(student.districtId ?? "");
  const [institutionType, setInstitutionType] = useState<InstitutionTypeValue>(student.institutionType ?? "");
  const [institutionId, setInstitutionId] = useState(
    student.institutionType === "SCHOOL" || student.institutionType === "LYCEUM_COLLEGE" ? (student.institutionId ?? "") : "",
  );

  const showChemistryLevel = useMemo(() => subjects === "CHEMISTRY" || subjects === "BOTH", [subjects]);
  const showBiologyLevel = useMemo(() => subjects === "BIOLOGY" || subjects === "BOTH", [subjects]);

  const filteredDistricts = useMemo(
    () => districts.filter((district) => district.provinceId === provinceId),
    [districts, provinceId],
  );

  const filteredInstitutions = useMemo(() => {
    if (!districtId || !institutionType || institutionType === "OTHER") return [];
    const type = institutionType === "SCHOOL" ? "SCHOOL" : "LYCEUM_COLLEGE";
    return institutions.filter((institution) => institution.districtId === districtId && institution.type === type);
  }, [districtId, institutionType, institutions]);

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

      <div className="rounded border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Hudud va ta'lim muassasasi</p>

        <div className="grid gap-2 md:grid-cols-2">
          <select
            name="provinceId"
            className="rounded border p-2"
            value={provinceId}
            onChange={(e) => {
              const next = e.target.value;
              setProvinceId(next);
              setDistrictId("");
              setInstitutionType("");
              setInstitutionId("");
            }}
            required
          >
            <option value="">Viloyat tanlang</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>

          <select
            name="districtId"
            className="rounded border p-2"
            value={districtId}
            onChange={(e) => {
              setDistrictId(e.target.value);
              setInstitutionType("");
              setInstitutionId("");
            }}
            disabled={!provinceId}
            required
          >
            <option value="">Tuman tanlang</option>
            {filteredDistricts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <select
            name="institutionType"
            className="rounded border p-2"
            value={institutionType}
            onChange={(e) => {
              setInstitutionType(e.target.value as InstitutionTypeValue);
              setInstitutionId("");
            }}
            disabled={!districtId}
            required
          >
            <option value="">Ta'lim muassasasi turi</option>
            <option value="SCHOOL">Maktab</option>
            <option value="LYCEUM_COLLEGE">Litsey/Kollej</option>
            <option value="OTHER">Boshqa</option>
          </select>

          {institutionType === "SCHOOL" || institutionType === "LYCEUM_COLLEGE" ? (
            <select
              name="institutionId"
              className="rounded border p-2"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
            >
              <option value="">
                {institutionType === "SCHOOL" ? "Maktabni tanlang" : "Litsey/Kollejni tanlang"}
              </option>
              {filteredInstitutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          ) : (
            <input name="institutionId" type="hidden" value="" readOnly />
          )}
        </div>
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

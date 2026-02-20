"use client";

import { useMemo, useState } from "react";

type SubjectsValue = "" | "CHEMISTRY" | "BIOLOGY" | "BOTH";
type InstitutionTypeValue = "" | "SCHOOL" | "LYCEUM_COLLEGE" | "OTHER";

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

type StudentCreateFormProps = {
  provinces: ProvinceOption[];
  districts: DistrictOption[];
  institutions: InstitutionOption[];
};

export function StudentCreateForm({ provinces, districts, institutions }: StudentCreateFormProps) {
  const [subjects, setSubjects] = useState<SubjectsValue>("");
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [institutionType, setInstitutionType] = useState<InstitutionTypeValue>("");
  const [institutionId, setInstitutionId] = useState("");

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
            <input
              name="institutionId"
              type="hidden"
              value=""
              readOnly
            />
          )}
        </div>
      </div>

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

      <textarea name="note" className="rounded border p-2" placeholder="Izoh (ixtiyoriy)" rows={3} />

      <button className="rounded bg-blue-600 p-2 text-white">Student qo'shish</button>
    </form>
  );
}

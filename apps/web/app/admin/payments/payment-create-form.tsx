"use client";

import { useEffect, useMemo, useState } from "react";

type StudentOption = {
  id: string;
  fullName: string;
  phone: string;
  enrollments: Array<{
    id: string;
    status: "TRIAL" | "ACTIVE" | "PAUSED" | "LEFT";
    group: {
      id: string;
      code: string;
      fan: string;
      priceMonthly: number;
    };
  }>;
};

type PaymentCreateFormProps = {
  students: StudentOption[];
};

const METHOD_OPTIONS = ["CASH", "PAYME", "CLICK", "UZUM", "PAYNET", "BANK"] as const;

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return value.trim();
}

function toDateTimeLocal(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatMoney(value: number) {
  return value.toLocaleString("uz-UZ");
}

function formatDate(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "-";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function addOneMonthToDateInput(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  const targetMonthIndex = month;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);

  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

export function PaymentCreateForm({ students }: PaymentCreateFormProps) {
  const [studentPhone, setStudentPhone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("0");
  const [paidAt, setPaidAt] = useState(toDateTimeLocal(new Date()));

  const normalizedPhone = useMemo(() => normalizePhone(studentPhone), [studentPhone]);

  const selectedStudent = useMemo(() => {
    return students.find((student) => normalizePhone(student.phone) === normalizedPhone) ?? null;
  }, [students, normalizedPhone]);

  const selectedStudentGroups = useMemo(() => {
    if (!selectedStudent) return [];

    return selectedStudent.enrollments
      .filter(
        (enrollment) =>
          enrollment.status === "TRIAL" || enrollment.status === "ACTIVE" || enrollment.status === "PAUSED",
      )
      .map((enrollment) => enrollment.group);
  }, [selectedStudent]);

  const selectedGroup = useMemo(() => {
    return selectedStudentGroups.find((group) => group.id === groupId) ?? null;
  }, [selectedStudentGroups, groupId]);

  useEffect(() => {
    if (!selectedStudentGroups.some((group) => group.id === groupId)) {
      setGroupId("");
    }
  }, [selectedStudentGroups, groupId]);

  const amountRequired = selectedGroup?.priceMonthly ?? 0;
  const discountValue = Number(discount);
  const parsedDiscount = Number.isFinite(discountValue) && discountValue >= 0 ? Math.floor(discountValue) : 0;
  const requiredNet = Math.max(amountRequired - parsedDiscount, 0);
  const periodEndAuto = useMemo(() => addOneMonthToDateInput(periodStart), [periodStart]);

  return (
    <form action="/api/admin/payments" method="post" className="grid gap-2">
      <label className="grid gap-1">
        <span className="text-sm font-medium">1) Student telefoni</span>
        <input
          name="studentPhone"
          className="rounded border p-2"
          placeholder="+998..."
          list="studentPhones"
          value={studentPhone}
          onChange={(e) => setStudentPhone(e.target.value)}
          required
        />
      </label>
      <datalist id="studentPhones">
        {students.map((student) => (
          <option key={student.id} value={student.phone}>
            {student.fullName}
          </option>
        ))}
      </datalist>
      <input type="hidden" name="studentId" value={selectedStudent?.id ?? ""} />

      <label className="grid gap-1">
        <span className="text-sm font-medium">2) O'quvchi o'qiydigan guruh</span>
        <select
          name="groupId"
          className="rounded border p-2"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          required
        >
          <option value="">Guruhni tanlang</option>
          {selectedStudentGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.code} | {group.fan}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">3) Darsni boshlash kuni (kun.oy.yil)</span>
        <input
          name="periodStart"
          type="date"
          className="rounded border p-2"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">4) To'lov tugash muddati (kun.oy.yil)</span>
        <input
          type="date"
          className="rounded border bg-slate-50 p-2"
          value={periodEndAuto}
          readOnly
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">5) To'lov summasi (guruh narxi avtomatik)</span>
        <input
          name="amountRequired"
          type="number"
          min={0}
          className="rounded border bg-slate-50 p-2"
          value={amountRequired}
          readOnly
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">6) Chegirma</span>
        <input
          name="discount"
          type="number"
          min={0}
          className="rounded border p-2"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">7) To'lashi kerak bo'lgan summa (net)</span>
        <input
          type="number"
          min={0}
          className="rounded border bg-slate-50 p-2"
          value={requiredNet}
          readOnly
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">8) Qancha to'lov qilmoqda</span>
        <input
          name="amountPaid"
          type="number"
          min={0}
          className="rounded border p-2"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">9) To'lov usuli</span>
        <select name="paymentMethod" className="rounded border p-2" defaultValue="" required>
          <option value="">To'lov usulini tanlang</option>
          {METHOD_OPTIONS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">10) To'lov vaqti (chekdagi)</span>
        <input
          name="paidAt"
          type="datetime-local"
          className="rounded border p-2"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">11) Izoh (ixtiyoriy)</span>
        <textarea name="note" rows={2} className="rounded border p-2" />
      </label>

      <div className="rounded border bg-slate-50 p-2 text-xs text-slate-700">
        <p>3) Boshlash kuni: {periodStart ? formatDate(periodStart) : "-"}</p>
        <p>4) Tugash kuni (avto): {periodEndAuto ? formatDate(periodEndAuto) : "-"}</p>
        <p>5) Guruh narxi: {formatMoney(amountRequired)}</p>
        <p>7) To'lashi kerak (net): {formatMoney(requiredNet)}</p>
      </div>

      <button className="rounded bg-blue-600 p-2 text-white">To'lovni saqlash</button>
    </form>
  );
}

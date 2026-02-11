import { JournalAttendance } from "@prisma/client";
import {
  formatJournalAttendance,
  formatUzDateOnly,
  startOfTodayUtc,
} from "@/lib/group-journal";

type JournalDateItem = {
  id: string;
  journalDate: Date;
};

type JournalStudentItem = {
  id: string;
  fullName: string;
};

type JournalLessonOption = {
  id: string;
  label: string;
};

type JournalEntryItem = {
  journalDateId: string;
  studentId: string;
  attendance: JournalAttendance;
  lessonId: string | null;
  theoryScore: number | null;
  practicalScore: number | null;
};

type GroupJournalSectionProps = {
  title?: string;
  groupId: string;
  basePath: string;
  journalMonth: string;
  canAddDate?: boolean;
  canEditEntries?: boolean;
  students: JournalStudentItem[];
  dates: JournalDateItem[];
  entries: JournalEntryItem[];
  lessons: JournalLessonOption[];
};

export function GroupJournalSection({
  title = "Baholash va davomat",
  groupId,
  basePath,
  journalMonth,
  canAddDate = true,
  canEditEntries = true,
  students,
  dates,
  entries,
  lessons,
}: GroupJournalSectionProps) {
  const todayUtc = startOfTodayUtc();

  const entryMap = new Map<string, JournalEntryItem>();
  for (const entry of entries) {
    entryMap.set(`${entry.studentId}:${entry.journalDateId}`, entry);
  }

  const lessonMap = new Map<string, string>();
  for (const lesson of lessons) {
    lessonMap.set(lesson.id, lesson.label);
  }

  const redirectTo = `${basePath}?journalMonth=${journalMonth}`;

  return (
    <section className="rounded bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>

      <div className={`mb-4 grid gap-2 ${canAddDate ? "md:grid-cols-[1fr_auto]" : ""}`}>
        <form action={basePath} method="get" className="grid gap-2 md:grid-cols-[220px_auto]">
          <input name="journalMonth" type="month" className="rounded border p-2" defaultValue={journalMonth} />
          <button className="rounded bg-slate-800 px-4 py-2 text-white">Filtr (oylik)</button>
        </form>

        {canAddDate ? (
          <form action="/api/group-journal/dates" method="post" className="grid gap-2 md:grid-cols-[180px_auto]">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input name="journalDate" type="date" className="rounded border p-2" required />
            <button className="rounded bg-blue-600 px-4 py-2 text-white">Sana qo'shish</button>
          </form>
        ) : null}
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 text-left">Sana</th>
              {dates.map((dateCol) => (
                <th key={dateCol.id} className="border p-2 text-left whitespace-nowrap">
                  {formatUzDateOnly(dateCol.journalDate)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="border p-2 align-top font-medium whitespace-nowrap">{student.fullName}</td>
                {dates.map((dateCol) => {
                  const entry = entryMap.get(`${student.id}:${dateCol.id}`);
                  const lessonLabel = entry?.lessonId ? lessonMap.get(entry.lessonId) ?? "-" : "-";
                  const isEditable = dateCol.journalDate.getTime() >= todayUtc.getTime();

                  return (
                    <td key={`${student.id}:${dateCol.id}`} className="border p-2 align-top">
                      <div className="space-y-1 text-[11px] text-slate-700">
                        <p>Davomat: {entry ? formatJournalAttendance(entry.attendance) : "-"}</p>
                        <p>Dars: {entry ? lessonLabel : "-"}</p>
                        <p>N: {entry?.theoryScore ?? "-"} | A: {entry?.practicalScore ?? "-"}</p>
                      </div>

                      {canEditEntries && isEditable ? (
                        <details className="mt-2 rounded border border-slate-200 p-1">
                          <summary className="cursor-pointer text-[11px] text-blue-700">Kiritish / yangilash</summary>
                          <form action="/api/group-journal/entries" method="post" className="mt-2 space-y-1">
                            <input type="hidden" name="journalDateId" value={dateCol.id} />
                            <input type="hidden" name="studentId" value={student.id} />
                            <input type="hidden" name="redirectTo" value={redirectTo} />

                            <select
                              name="attendance"
                              defaultValue={entry?.attendance ?? "PRESENT"}
                              className="w-full rounded border px-1 py-1 text-[11px]"
                            >
                              <option value="PRESENT">KELDI</option>
                              <option value="ABSENT">KELMADI</option>
                              <option value="EXCUSED">SABABLI</option>
                            </select>

                            <select
                              name="lessonId"
                              defaultValue={entry?.lessonId ?? ""}
                              className="w-full rounded border px-1 py-1 text-[11px]"
                            >
                              <option value="">Dars tanlang</option>
                              {lessons.map((lesson) => (
                                <option key={lesson.id} value={lesson.id}>
                                  {lesson.label}
                                </option>
                              ))}
                            </select>

                            <div className="grid grid-cols-2 gap-1">
                              <input
                                name="theoryScore"
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={entry?.theoryScore ?? ""}
                                className="rounded border px-1 py-1 text-[11px]"
                                placeholder="Nazariy"
                              />
                              <input
                                name="practicalScore"
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={entry?.practicalScore ?? ""}
                                className="rounded border px-1 py-1 text-[11px]"
                                placeholder="Amaliy"
                              />
                            </div>

                            <button className="w-full rounded bg-blue-600 px-2 py-1 text-[11px] text-white">Saqlash</button>
                          </form>
                        </details>
                      ) : isEditable ? null : (
                        <p className="mt-2 text-[11px] text-slate-400">Sana o'tgan: tahrir yopiq</p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 ? <p className="mt-2 text-sm text-slate-500">SINOV/AKTIV o'quvchi yo'q.</p> : null}
      {dates.length === 0 ? <p className="mt-2 text-sm text-slate-500">Bu oy uchun sana qo'shilmagan.</p> : null}
    </section>
  );
}

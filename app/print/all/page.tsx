import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import PrintButton from "../[student_id]/PrintButton";
import type { Assignment, Class, SchoolStudent } from "@/lib/types";

export const dynamic = "force-dynamic";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatWeekLabel(monday: Date, sunday: Date): string {
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-US", opts);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${fmt(monday, { month: "long", day: "numeric" })} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
  }
  return `${fmt(monday, { month: "long", day: "numeric" })} – ${fmt(sunday, { month: "long", day: "numeric" })}, ${sunday.getFullYear()}`;
}

function formatDueDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

interface ClassGroup { cls: Class; assignments: Assignment[]; }
interface StudentSheet { schoolStudent: SchoolStudent; classGroups: ClassGroup[]; }

export default async function PrintAllPage({
  searchParams,
}: {
  searchParams: Promise<{ students?: string }>;
}) {
  const { students: studentsParam } = await searchParams;
  const studentIds = studentsParam?.split(",").filter(Boolean) ?? [];
  if (studentIds.length === 0) notFound();

  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const supabase = await createClient();

  // Auth: admin always allowed; parents must own all requested students
  if (me.role !== "admin") {
    const { data: links } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", me.id);
    const allowedIds = new Set(links?.map((l) => l.student_id) ?? []);
    if (!studentIds.every((id) => allowedIds.has(id))) redirect("/parent");
  }

  const { monday, sunday } = getWeekRange();
  const weekLabel = formatWeekLabel(monday, sunday);

  // Batch-fetch everything needed for all students
  const { data: schoolStudents } = await supabase
    .from("school_students")
    .select("*")
    .in("id", studentIds);

  const { data: enrollments } = await supabase
    .from("students")
    .select("id, class_id, school_student_id")
    .in("school_student_id", studentIds);

  const allClassIds = [...new Set((enrollments ?? []).map((e) => e.class_id))];

  const [{ data: classes }, { data: assignments }] = allClassIds.length > 0
    ? await Promise.all([
        supabase.from("classes").select("*").in("id", allClassIds),
        supabase
          .from("assignments")
          .select("*")
          .in("class_id", allClassIds)
          .gte("due_date", monday.toISOString().split("T")[0])
          .lte("due_date", sunday.toISOString().split("T")[0])
          .order("due_date"),
      ])
    : [{ data: [] }, { data: [] }];

  // Build per-student sheets in the requested order
  const sheets: StudentSheet[] = studentIds
    .map((id) => {
      const ss = (schoolStudents ?? []).find((s) => s.id === id) as SchoolStudent | undefined;
      if (!ss) return null;

      const studentClassIds = (enrollments ?? [])
        .filter((e) => e.school_student_id === id)
        .map((e) => e.class_id);

      const classGroups: ClassGroup[] = (classes as Class[] ?? [])
        .filter((c) => studentClassIds.includes(c.id))
        .map((cls) => ({
          cls,
          assignments: (assignments as Assignment[] ?? [])
            .filter((a) => a.class_id === cls.id),
        }))
        .filter((g) => g.assignments.length > 0)
        .sort((a, b) => a.cls.name.localeCompare(b.cls.name));

      return { schoolStudent: ss, classGroups };
    })
    .filter((s): s is StudentSheet => s !== null);

  if (sheets.length === 0) notFound();

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0.75in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { break-after: page; page-break-after: always; }
        }
      `}</style>

      <div className="min-h-screen bg-white">
        {/* Toolbar */}
        <div className="print:hidden bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Homework sheets for {sheets.length} student{sheets.length !== 1 ? "s" : ""} — preview
          </span>
          <PrintButton />
        </div>

        {sheets.map((sheet, i) => {
          const { schoolStudent: ss, classGroups } = sheet;
          const gradeLabel =
            ss.grade_level === "K" ? "Kindergarten" :
            ss.grade_level === "Graduated" ? "Graduated" :
            `Grade ${ss.grade_level}`;
          const isLast = i === sheets.length - 1;

          return (
            <div key={ss.id} className={!isLast ? "page-break" : ""}>
              {/* Visual separator between sheets (hidden when printing) */}
              {i > 0 && (
                <div className="print:hidden bg-gray-100 border-y border-gray-200 px-8 py-2 text-xs text-gray-400 text-center">
                  — page break —
                </div>
              )}

              <div className="max-w-2xl mx-auto px-8 py-10">
                {/* Header */}
                <div className="text-center mb-8 pb-6 border-b-2 border-gray-900">
                  <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">
                    Weekly Homework Sheet
                  </p>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{ss.name}</h1>
                  <p className="text-sm text-gray-500 mt-1">{gradeLabel}</p>
                  <p className="text-base font-medium text-gray-700 mt-2">Week of {weekLabel}</p>
                </div>

                {/* Assignments */}
                {classGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-lg font-medium text-gray-400">No assignments due this week.</p>
                    <p className="text-sm text-gray-300 mt-1">Enjoy your week!</p>
                  </div>
                ) : (
                  <div className="space-y-7">
                    {classGroups.map(({ cls, assignments: asgns }) => (
                      <div key={cls.id}>
                        <div className="flex items-center gap-3 mb-3">
                          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">{cls.name}</h2>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        <ul className="space-y-2.5">
                          {asgns.map((a) => (
                            <li key={a.id} className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-400 cursor-pointer"
                                style={{ accentColor: "#111" }}
                              />
                              <div className="flex-1 flex items-baseline justify-between gap-4">
                                <span className="text-base text-gray-900">{a.name}</span>
                                <span className="text-sm text-gray-400 whitespace-nowrap flex-shrink-0">
                                  {formatDueDate(a.due_date)}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-xs text-gray-300">
                    Printed {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <div className="w-3 h-3 rounded-full bg-gray-900" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addAssignment } from "@/app/actions";
import GradebookSection from "./GradebookSection";
import AppNav from "@/components/AppNav";
import DeleteStudentButton from "./DeleteStudentButton";
import DeleteAssignmentButton from "./DeleteAssignmentButton";
import AddStudentDropdown from "./AddStudentDropdown";
import type { Class, Student, Assignment, Grade, SchoolStudent } from "@/lib/types";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cls }, { data: students }, { data: assignments }, { data: grades }, { data: allRoster }] =
    await Promise.all([
      supabase.from("classes").select("*").eq("id", id).single(),
      supabase.from("students").select("*").eq("class_id", id).order("name"),
      supabase.from("assignments").select("*").eq("class_id", id).order("due_date"),
      supabase
        .from("grades")
        .select("*")
        .in(
          "assignment_id",
          (await supabase.from("assignments").select("id").eq("class_id", id))
            .data?.map((a) => a.id) ?? []
        ),
      supabase.from("school_students").select("*").order("name"),
    ]);

  if (!cls) notFound();

  const gradeMap: Record<string, Record<string, Grade>> = {};
  for (const g of (grades as Grade[]) ?? []) {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    gradeMap[g.student_id][g.assignment_id] = g;
  }

  const enrolledRosterIds = new Set(
    (students as Student[])?.map(s => s.school_student_id).filter(Boolean) ?? []
  );
  const availableRoster = (allRoster as SchoolStudent[])?.filter(
    s => !enrolledRosterIds.has(s.id)
  ) ?? [];

  return (
    <AppNav title={(cls as Class).name}>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Add Student + Add Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Add Student
            </h2>
            <AddStudentDropdown classId={id} rosterStudents={availableRoster} />
            {students?.length ? (
              <ul className="mt-4 divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                {(students as Student[]).map((s) => (
                  <li key={s.id} className="text-sm text-gray-700 px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-gray-50/60 transition-colors">
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0 select-none">
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-800">{s.name}</span>
                    </span>
                    <DeleteStudentButton id={s.id} name={s.name} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-lg">No students enrolled yet — add one above.</p>
            )}
          </section>

          <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Add Assignment
            </h2>
            <form action={addAssignment} className="space-y-2">
              <input type="hidden" name="class_id" value={id} />
              <input
                type="text"
                name="name"
                placeholder="Assignment name"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="due_date"
                  required
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-forest text-white text-sm font-medium rounded-lg hover:bg-forest-light active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>
            </form>
            {assignments?.length ? (
              <ul className="mt-4 divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                {(assignments as Assignment[]).map((a) => (
                  <li key={a.id} className="text-sm text-gray-700 px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-gray-50/60 transition-colors">
                    <span className="font-medium text-gray-800 truncate">{a.name}</span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        Due {new Date(a.due_date + "T00:00:00").toLocaleDateString()}
                      </span>
                      <DeleteAssignmentButton id={a.id} name={a.name} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-lg">No assignments yet — add one above.</p>
            )}
          </section>
        </div>

        {/* Gradebook */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Gradebook
          </h2>
          <GradebookSection
            students={(students as Student[]) ?? []}
            assignments={(assignments as Assignment[]) ?? []}
            gradeMap={gradeMap}
          />
        </section>
      </main>
    </AppNav>
  );
}

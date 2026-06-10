export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addAssignment } from "@/app/actions";
import GradebookSection from "./GradebookSection";
import AppNav from "@/components/AppNav";
import DeleteStudentButton from "./DeleteStudentButton";
import DeleteAssignmentButton from "./DeleteAssignmentButton";
import AddStudentDropdown from "./AddStudentDropdown";
import { SectionLabel } from "@/components/ui/SectionLabel";
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
          <section className="card rounded-xl p-5">
            <SectionLabel>Add Student</SectionLabel>
            <AddStudentDropdown classId={id} rosterStudents={availableRoster} />
            {students?.length ? (
              <ul className="mt-4 divide-y divide-border border border-border rounded-lg overflow-hidden">
                {(students as Student[]).map((s) => (
                  <li key={s.id} className="text-sm px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-surface transition-colors">
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent flex-shrink-0 select-none">
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-primary">{s.name}</span>
                    </span>
                    <DeleteStudentButton id={s.id} name={s.name} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-muted py-3 text-center border border-dashed border-border rounded-lg">No students enrolled yet — add one above.</p>
            )}
          </section>

          <section className="card rounded-xl p-5">
            <SectionLabel>Add Assignment</SectionLabel>
            <form action={addAssignment} className="space-y-2">
              <input type="hidden" name="class_id" value={id} />
              <input
                type="text"
                name="name"
                placeholder="Assignment name"
                required
                className="w-full px-3 h-9 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="due_date"
                  required
                  className="flex-1 px-3 h-9 rounded-md border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 h-9 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>
            </form>
            {assignments?.length ? (
              <ul className="mt-4 divide-y divide-border border border-border rounded-lg overflow-hidden">
                {(assignments as Assignment[]).map((a) => (
                  <li key={a.id} className="text-sm px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-surface transition-colors">
                    <span className="font-medium text-primary truncate">{a.name}</span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted">
                        Due {new Date(a.due_date + "T00:00:00").toLocaleDateString()}
                      </span>
                      <DeleteAssignmentButton id={a.id} name={a.name} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-muted py-3 text-center border border-dashed border-border rounded-lg">No assignments yet — add one above.</p>
            )}
          </section>
        </div>

        {/* Gradebook */}
        <section>
          <SectionLabel className="mb-4">Gradebook</SectionLabel>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addStudent, addAssignment } from "@/app/actions";
import GradebookSection from "./GradebookSection";
import AppNav from "@/components/AppNav";
import DeleteStudentButton from "./DeleteStudentButton";
import DeleteAssignmentButton from "./DeleteAssignmentButton";
import type { Class, Student, Assignment, Grade } from "@/lib/types";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cls }, { data: students }, { data: assignments }, { data: grades }] =
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
    ]);

  if (!cls) notFound();

  const gradeMap: Record<string, Record<string, Grade>> = {};
  for (const g of (grades as Grade[]) ?? []) {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    gradeMap[g.student_id][g.assignment_id] = g;
  }

  return (
    <div className="min-h-screen">
      <AppNav title={(cls as Class).name} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Add Student + Add Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Add Student
            </h2>
            <form action={addStudent} className="flex gap-2">
              <input type="hidden" name="class_id" value={id} />
              <input
                type="text"
                name="name"
                placeholder="Student name"
                required
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Add
              </button>
            </form>
            {students?.length ? (
              <ul className="mt-3 space-y-1">
                {(students as Student[]).map((s) => (
                  <li key={s.id} className="text-sm text-gray-700 px-1 py-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      {s.name}
                    </span>
                    <DeleteStudentButton id={s.id} name={s.name} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-gray-400">No students yet.</p>
            )}
          </section>

          <section className="bg-white border border-gray-100 rounded-xl p-5">
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
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="due_date"
                  required
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
            {assignments?.length ? (
              <ul className="mt-3 space-y-1">
                {(assignments as Assignment[]).map((a) => (
                  <li key={a.id} className="text-sm text-gray-700 px-1 py-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      {a.name}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        Due {new Date(a.due_date + "T00:00:00").toLocaleDateString()}
                      </span>
                      <DeleteAssignmentButton id={a.id} name={a.name} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-gray-400">No assignments yet.</p>
            )}
          </section>
        </div>

        {/* Gradebook */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Gradebook
          </h2>
          <GradebookSection
            students={(students as Student[]) ?? []}
            assignments={(assignments as Assignment[]) ?? []}
            gradeMap={gradeMap}
          />
        </section>
      </main>
    </div>
  );
}

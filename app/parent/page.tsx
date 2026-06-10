import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import AppNav from "@/components/AppNav";
import ParentView, { type ChildData } from "./ParentView";

export const dynamic = "force-dynamic";
import type { Assignment, Grade, Class, SchoolStudent } from "@/lib/types";

export default async function ParentPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const supabase = await createClient();

  // Get this parent's linked school students
  const { data: links } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", me.id);

  const linkedIds = links?.map((l) => l.student_id) ?? [];

  let childrenData: ChildData[] = [];

  if (linkedIds.length > 0) {
    const { data: schoolStudents } = await supabase
      .from("school_students")
      .select("*")
      .in("id", linkedIds)
      .order("name");

    childrenData = await Promise.all(
      ((schoolStudents as SchoolStudent[]) ?? []).map(async (ss) => {
        // All class enrollments for this school student
        const { data: enrollments } = await supabase
          .from("students")
          .select("*")
          .eq("school_student_id", ss.id);

        if (!enrollments?.length) return { schoolStudent: ss, classes: [] };

        const classes = await Promise.all(
          enrollments.map(async (enrollment) => {
            const [{ data: cls }, { data: assignments }, { data: grades }] = await Promise.all([
              supabase.from("classes").select("*").eq("id", enrollment.class_id).single(),
              supabase.from("assignments").select("*").eq("class_id", enrollment.class_id).order("due_date"),
              supabase.from("grades").select("*").eq("student_id", enrollment.id),
            ]);

            const gradeByAssignment: Record<string, Grade> = {};
            for (const g of (grades as Grade[]) ?? []) {
              gradeByAssignment[g.assignment_id] = g;
            }

            const enriched = ((assignments as Assignment[]) ?? []).map((a) => ({
              ...a,
              grade: gradeByAssignment[a.id] ?? null,
            }));

            const scored = enriched.map((a) => a.grade?.score).filter((s): s is number => s !== null);
            const avg = scored.length
              ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
              : null;

            return { cls: cls as Class | null, assignments: enriched, avg };
          })
        );

        return { schoolStudent: ss, classes };
      })
    );
  }

  return (
    <AppNav title="Parent Portal">
      <main className="max-w-3xl mx-auto px-6 py-8">
        <ParentView childrenData={childrenData} />
      </main>
    </AppNav>
  );
}

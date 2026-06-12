export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createClass } from "@/app/actions";
import DeleteClassButton from "./DeleteClassButton";
import AppNav from "@/components/AppNav";
import { SectionLabel } from "@/components/ui/SectionLabel";
import QuickActions from "./QuickActions";

export default async function TeacherDashboard() {
  const me = await getCurrentUser();
  if (!me || (me.role !== "teacher" && me.role !== "admin")) redirect("/");

  const isAdmin = me.role === "admin";
  const supabase = await createClient();

  // Fetch classes
  let classQuery = supabase.from("classes").select("id, name, teacher_id, created_at").order("name");
  if (!isAdmin) classQuery = classQuery.eq("teacher_id", me.id);
  const { data: rawClasses } = await classQuery;
  const classes = rawClasses ?? [];
  const classIds = classes.map((c) => c.id);

  // Fetch enrollments and build student list
  let enrollments: { id: string; name: string; class_id: string; school_student_id: string | null }[] = [];
  const parentEmailMap: Record<string, { name: string; email: string }[]> = {};
  const schoolStudentInfoMap: Record<string, { grade_level: string; email: string | null }> = {};

  if (classIds.length > 0) {
    const { data: rawEnrollments } = await supabase
      .from("students")
      .select("id, name, class_id, school_student_id")
      .in("class_id", classIds)
      .order("name");

    enrollments = rawEnrollments ?? [];
    const ssIds = [...new Set(enrollments.flatMap((e) => (e.school_student_id ? [e.school_student_id] : [])))];

    if (ssIds.length > 0) {
      const [{ data: schoolStudents }, { data: parentLinks }] = await Promise.all([
        supabase.from("school_students").select("id, grade_level, email").in("id", ssIds),
        supabase.from("parent_students").select("student_id, parent_id").in("student_id", ssIds),
      ]);

      for (const ss of schoolStudents ?? []) {
        schoolStudentInfoMap[ss.id] = { grade_level: ss.grade_level, email: ss.email };
      }

      if (parentLinks?.length) {
        const parentUserIds = [...new Set(parentLinks.map((l) => l.parent_id))];
        const { data: parentUsers } = await supabase
          .from("users")
          .select("id, email, name")
          .in("id", parentUserIds);
        const puMap = Object.fromEntries((parentUsers ?? []).map((u) => [u.id, u]));
        for (const link of parentLinks) {
          const pu = puMap[link.parent_id];
          if (pu?.email) {
            if (!parentEmailMap[link.student_id]) parentEmailMap[link.student_id] = [];
            parentEmailMap[link.student_id].push({ name: pu.name || pu.email, email: pu.email });
          }
        }
      }
    }
  }

  const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));
  const studentCountByClass: Record<string, number> = {};
  for (const e of enrollments) {
    studentCountByClass[e.class_id] = (studentCountByClass[e.class_id] ?? 0) + 1;
  }

  const students = enrollments.map((e) => ({
    id: e.id,
    name: e.name,
    classId: e.class_id,
    className: classMap[e.class_id] ?? "Unknown Class",
    gradeLevel: e.school_student_id ? (schoolStudentInfoMap[e.school_student_id]?.grade_level ?? "—") : "—",
    schoolStudentId: e.school_student_id,
    parentEmails: e.school_student_id ? (parentEmailMap[e.school_student_id] ?? []) : [],
  }));

  const allParentEmails = [...new Set(students.flatMap((s) => s.parentEmails.map((p) => p.email)))];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <AppNav title="Dashboard">
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ── Section 1: Welcome ── */}
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary">
              Welcome, {me.name?.split(" ")[0] ?? "Teacher"}
            </h1>
            <p className="text-muted text-sm mt-1">{today}</p>
          </div>
        </section>

        {/* ── Section 2: My Classes ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel className="mb-0">
              {isAdmin ? `All Classes (${classes.length})` : `My Classes (${classes.length})`}
            </SectionLabel>
            <form action={createClass} className="flex gap-2">
              <input
                type="text"
                name="name"
                placeholder="New class name…"
                required
                className="px-3 h-8 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
              />
              <button
                type="submit"
                className="px-3 h-8 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
              >
                Create
              </button>
            </form>
          </div>

          {classes.length === 0 ? (
            <div className="card rounded-xl text-center py-14">
              <svg className="mx-auto mb-3 text-muted" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <p className="text-sm font-medium text-secondary">No classes yet</p>
              <p className="text-xs text-muted mt-1">Create your first class using the form above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="card rounded-xl p-5 flex flex-col gap-4 hover:shadow-elevated transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-primary leading-snug">{cls.name}</h3>
                    <DeleteClassButton id={cls.id} name={cls.name} />
                  </div>
                  <p className="text-sm text-muted flex-1">
                    {studentCountByClass[cls.id] ?? 0}{" "}
                    {(studentCountByClass[cls.id] ?? 0) === 1 ? "student" : "students"}
                  </p>
                  <Link
                    href={`/teacher/class/${cls.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Open
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 3: My Students ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel className="mb-0">
              {isAdmin ? `All Students (${students.length})` : `My Students (${students.length})`}
            </SectionLabel>
            {allParentEmails.length > 0 && (
              <a
                href={`mailto:?bcc=${allParentEmails.join(",")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 h-8 border border-border text-secondary text-xs font-medium rounded-md hover:bg-surface hover:text-primary transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email All Parents
              </a>
            )}
          </div>

          {students.length === 0 ? (
            <div className="card rounded-xl text-center py-14">
              <p className="text-sm text-muted">
                {classes.length === 0
                  ? "Create a class and add students to see them here."
                  : "No students enrolled in your classes yet."}
              </p>
            </div>
          ) : (
            <div className="card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Student</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Grade</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Class</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Parent</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-primary">{s.name}</td>
                      <td className="px-5 py-3 text-secondary">
                        {s.gradeLevel === "K" ? "K" : s.gradeLevel === "—" ? "—" : `Gr. ${s.gradeLevel}`}
                      </td>
                      <td className="px-5 py-3 text-secondary">{s.className}</td>
                      <td className="px-5 py-3">
                        {s.parentEmails.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {s.parentEmails.map((p) => (
                              <a
                                key={p.email}
                                href={`mailto:${p.email}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={p.email}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border border-border text-secondary hover:text-primary hover:border-border-strong transition-colors"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                  <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                {p.name.split(" ")[0]}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">No parent linked</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/teacher/class/${s.classId}`}
                          className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors font-medium"
                        >
                          View Grades
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section 4: Quick Actions ── */}
        <section>
          <SectionLabel>Quick Actions</SectionLabel>
          <QuickActions students={students} reportedBy={me.id} />
        </section>

      </main>
    </AppNav>
  );
}

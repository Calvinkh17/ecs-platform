export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import AppNav from "@/components/AppNav";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { letterGrade, gradeChip } from "@/lib/grades";
import type { Assignment, Grade, Announcement } from "@/lib/types";

export default async function StudentPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "student" && me.role !== "admin") redirect("/");

  const supabase = await createClient();

  // Find school student record by email match
  const { data: schoolStudent } = await supabase
    .from("school_students")
    .select("*")
    .eq("email", me.email)
    .maybeSingle();

  // Fetch announcements (all recent, same as other views)
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!schoolStudent) {
    return (
      <AppNav title="My Dashboard">
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary">
              Welcome, {me.name?.split(" ")[0] ?? "Student"}
            </h1>
            <p className="text-muted text-sm mt-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="card rounded-xl text-center py-16">
            <svg className="mx-auto mb-3 text-muted" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <p className="text-sm font-medium text-secondary">Your student record was not found</p>
            <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
              Make sure the email on your student record matches your login email ({me.email}). Contact your administrator if this is incorrect.
            </p>
          </div>

          {/* Still show announcements */}
          {(announcements?.length ?? 0) > 0 && (
            <AnnouncementsSection announcements={(announcements as Announcement[]) ?? []} />
          )}
        </main>
      </AppNav>
    );
  }

  // Get all class enrollments for this student
  const { data: enrollments } = await supabase
    .from("students")
    .select("id, class_id, name")
    .eq("school_student_id", schoolStudent.id);

  const classIds = (enrollments ?? []).map((e) => e.class_id);
  const enrollmentIds = (enrollments ?? []).map((e) => e.id);
  const enrollmentMap = Object.fromEntries((enrollments ?? []).map((e) => [e.class_id, e.id]));

  let classReports: ClassReport[] = [];
  let upcomingAssignments: UpcomingAssignment[] = [];

  if (classIds.length > 0) {
    const [{ data: classes }, { data: assignments }, { data: grades }] = await Promise.all([
      supabase.from("classes").select("id, name").in("id", classIds).order("name"),
      supabase.from("assignments").select("*").in("class_id", classIds).order("due_date"),
      supabase.from("grades").select("*").in("student_id", enrollmentIds),
    ]);

    const gradeByAssignment: Record<string, Grade> = {};
    for (const g of (grades as Grade[]) ?? []) {
      gradeByAssignment[`${g.student_id}:${g.assignment_id}`] = g;
    }

    // Build upcoming (next 7 days)
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const a of (assignments as Assignment[]) ?? []) {
      const dueDate = new Date(a.due_date + "T23:59:59");
      if (dueDate >= now && dueDate <= sevenDays) {
        const enrollId = enrollmentMap[a.class_id];
        const cls = (classes ?? []).find((c) => c.id === a.class_id);
        const grade = enrollId ? gradeByAssignment[`${enrollId}:${a.id}`] : null;
        upcomingAssignments.push({
          id: a.id,
          name: a.name,
          due_date: a.due_date,
          className: cls?.name ?? "Unknown",
          score: grade?.score ?? null,
          file_url: a.file_url ?? null,
          file_name: a.file_name ?? null,
        });
      }
    }
    upcomingAssignments.sort((a, b) => a.due_date.localeCompare(b.due_date));

    // Build class grade reports
    for (const cls of (classes ?? [])) {
      const classAssignments = ((assignments as Assignment[]) ?? []).filter((a) => a.class_id === cls.id);
      const enrollId = enrollmentMap[cls.id];
      const enriched = classAssignments.map((a) => ({
        ...a,
        grade: enrollId ? (gradeByAssignment[`${enrollId}:${a.id}`] ?? null) : null,
      }));
      const scored = enriched.map((a) => a.grade?.score).filter((s): s is number => s !== null);
      const avg = scored.length
        ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
        : null;
      classReports.push({ classId: cls.id, className: cls.name, assignments: enriched, avg });
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <AppNav title="My Dashboard">
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">

        {/* Welcome */}
        <section>
          <h1 className="font-serif text-2xl font-bold text-primary">
            Welcome, {me.name?.split(" ")[0] ?? schoolStudent.name.split(" ")[0]}
          </h1>
          <p className="text-muted text-sm mt-1">{today}</p>
          <p className="text-sm text-secondary mt-0.5">
            {schoolStudent.grade_level === "K"
              ? "Kindergarten"
              : schoolStudent.grade_level === "Graduated"
              ? "Graduated"
              : `Grade ${schoolStudent.grade_level}`}
            {" · "}
            {classReports.length} {classReports.length === 1 ? "class" : "classes"}
          </p>
        </section>

        {/* Upcoming assignments */}
        <section>
          <SectionLabel>Upcoming Assignments — Next 7 Days ({upcomingAssignments.length})</SectionLabel>
          {upcomingAssignments.length === 0 ? (
            <div className="card rounded-xl text-center py-10">
              <p className="text-sm text-muted">No assignments due in the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAssignments.map((a) => {
                const due = new Date(a.due_date + "T00:00:00");
                const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
                const letter = a.score !== null ? letterGrade(a.score) : null;
                return (
                  <div key={a.id} className="card rounded-xl px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary text-sm">{a.name}</span>
                        {a.file_url && (
                          <a href={a.file_url} target="_blank" rel="noopener noreferrer" title="Download attachment" className="text-muted hover:text-accent transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                            </svg>
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{a.className}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-secondary">
                        Due {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${daysLeft <= 1 ? "text-danger" : daysLeft <= 3 ? "text-amber-500" : "text-muted"}`}>
                        {daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `${daysLeft} days`}
                      </p>
                    </div>
                    {letter ? (
                      <span className={`inline-flex items-center justify-center w-10 h-8 rounded text-xs font-bold flex-shrink-0 ${gradeChip(letter)}`}>
                        {letter}
                      </span>
                    ) : (
                      <span className="w-10 h-8 flex items-center justify-center text-sm text-muted flex-shrink-0">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* My Grades */}
        <section>
          <SectionLabel>My Grades</SectionLabel>
          {classReports.length === 0 ? (
            <div className="card rounded-xl text-center py-10">
              <p className="text-sm text-muted">You are not enrolled in any classes yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classReports.map((report) => {
                const avgLetter = report.avg !== null ? letterGrade(report.avg) : null;
                return (
                  <div key={report.classId} className="card rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold text-primary">{report.className}</h3>
                      {report.avg !== null && avgLetter ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">Average:</span>
                          <span className="font-semibold text-primary">{report.avg}</span>
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${gradeChip(avgLetter)}`}>
                            {avgLetter}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted">No grades yet</span>
                      )}
                    </div>
                    {report.assignments.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-sm text-muted">No assignments yet.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface border-b border-border">
                            <th className="text-left px-5 py-3 font-semibold text-muted text-xs">Assignment</th>
                            <th className="text-center px-4 py-3 font-semibold text-muted text-xs">Due</th>
                            <th className="text-center px-4 py-3 font-semibold text-muted text-xs">Score</th>
                            <th className="text-center px-4 py-3 font-semibold text-muted text-xs">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.assignments.map((a) => {
                            const score = a.grade?.score ?? null;
                            const letter = score !== null ? letterGrade(score) : null;
                            return (
                              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-accent/5 transition-colors">
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-primary">{a.name}</span>
                                    {a.file_url && (
                                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" title={a.file_name ?? "Download"} className="text-muted hover:text-accent transition-colors">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-secondary text-xs">
                                  {new Date(a.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </td>
                                <td className="px-4 py-3 text-center font-medium text-secondary">
                                  {score !== null ? score : <span className="text-muted">—</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {letter ? (
                                    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${gradeChip(letter)}`}>{letter}</span>
                                  ) : <span className="text-muted">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Announcements */}
        <AnnouncementsSection announcements={(announcements as Announcement[]) ?? []} />

      </main>
    </AppNav>
  );
}

interface UpcomingAssignment {
  id: string;
  name: string;
  due_date: string;
  className: string;
  score: number | null;
  file_url: string | null;
  file_name: string | null;
}

interface ClassReport {
  classId: string;
  className: string;
  assignments: (Assignment & { grade: Grade | null })[];
  avg: number | null;
}

function AnnouncementsSection({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) return null;
  return (
    <section>
      <SectionLabel>School Announcements</SectionLabel>
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="card rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-primary text-sm">{a.title}</h3>
              <span className="text-xs text-muted flex-shrink-0">
                {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <p className="text-sm text-secondary mt-1.5 whitespace-pre-wrap leading-relaxed">{a.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

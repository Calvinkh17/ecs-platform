import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createClass } from "@/app/actions";
import DeleteClassButton from "./DeleteClassButton";
import AppNav from "@/components/AppNav";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Class } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const me = await getCurrentUser();
  if (!me || (me.role !== "teacher" && me.role !== "admin")) redirect("/");

  const isAdmin = me.role === "admin";
  const supabase = await createClient();

  let query = supabase.from("classes").select("*").order("name");
  if (!isAdmin) query = query.eq("teacher_id", me.id);
  const { data: classes } = await query;

  let teacherMap: Record<string, string> = {};
  if (isAdmin) {
    const { data: staff } = await supabase
      .from("users")
      .select("id, name, email")
      .in("role", ["admin", "teacher"]);
    teacherMap = Object.fromEntries(
      (staff ?? []).map((u) => [u.id, u.name || u.email])
    );
  }

  return (
    <AppNav title="Classes">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section className="card rounded-xl p-5">
          <SectionLabel>New Class</SectionLabel>
          <form action={createClass} className="flex gap-3">
            <input
              type="text"
              name="name"
              placeholder="Class name (e.g. Algebra I – Period 3)"
              required
              className="flex-1 px-3 h-9 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
            />
            <button
              type="submit"
              className="px-4 h-9 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover active:scale-95 transition-all"
            >
              Create
            </button>
          </form>
        </section>

        <section>
          <SectionLabel>
            {isAdmin ? `All Classes (${classes?.length ?? 0})` : `Your Classes (${classes?.length ?? 0})`}
          </SectionLabel>
          {!classes?.length ? (
            <div className="text-center py-16 card rounded-xl">
              <svg className="mx-auto mb-3 text-muted" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <p className="text-sm font-medium text-secondary">No classes yet</p>
              <p className="text-xs text-muted mt-1">Create your first class using the form above.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(classes as Class[]).map((cls) => (
                <li
                  key={cls.id}
                  className="card rounded-xl flex items-center justify-between px-5 py-4 hover:shadow-elevated transition-all duration-150"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <Link
                      href={`/teacher/class/${cls.id}`}
                      className="font-medium text-primary hover:text-accent transition-colors"
                    >
                      {cls.name}
                    </Link>
                    {isAdmin && (
                      <p className="text-xs text-muted mt-0.5">
                        {cls.teacher_id
                          ? (teacherMap[cls.teacher_id] ?? "Unknown")
                          : <span className="text-amber-500">Unassigned</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-muted">
                      {new Date(cls.created_at).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/teacher/class/${cls.id}`}
                      className="text-sm font-medium text-muted hover:text-primary transition-colors flex items-center gap-1"
                    >
                      Open
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </Link>
                    <DeleteClassButton id={cls.id} name={cls.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppNav>
  );
}

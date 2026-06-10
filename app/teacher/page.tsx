import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createClass } from "@/app/actions";
import DeleteClassButton from "./DeleteClassButton";
import AppNav from "@/components/AppNav";
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

  // For admin: fetch all staff so we can show the assigned teacher name
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
        <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            New Class
          </h2>
          <form action={createClass} className="flex gap-3">
            <input
              type="text"
              name="name"
              placeholder="Class name (e.g. Algebra I – Period 3)"
              required
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-shadow"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-forest text-white text-sm font-medium rounded-lg hover:bg-forest-light active:scale-95 transition-all"
            >
              Create
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            {isAdmin
              ? `All Classes (${classes?.length ?? 0})`
              : `Your Classes (${classes?.length ?? 0})`}
          </h2>
          {!classes?.length ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
              <svg className="mx-auto mb-3 text-gray-300" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <p className="text-sm font-medium text-gray-400">No classes yet</p>
              <p className="text-xs text-gray-300 mt-1">Create your first class using the form above.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(classes as Class[]).map((cls) => (
                <li
                  key={cls.id}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-150"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <Link
                      href={`/teacher/class/${cls.id}`}
                      className="font-medium text-gray-900 hover:text-forest transition-colors"
                    >
                      {cls.name}
                    </Link>
                    {isAdmin && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cls.teacher_id
                          ? (teacherMap[cls.teacher_id] ?? "Unknown")
                          : <span className="text-amber-500">Unassigned</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-gray-300">
                      {new Date(cls.created_at).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/teacher/class/${cls.id}`}
                      className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1"
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createClass } from "@/app/actions";
import DeleteClassButton from "./DeleteClassButton";
import AppNav from "@/components/AppNav";
import type { Class } from "@/lib/types";

export default async function TeacherDashboard() {
  const me = await getCurrentUser();
  if (!me || (me.role !== "teacher" && me.role !== "admin")) redirect("/");

  const supabase = await createClient();
  const query = supabase.from("classes").select("*").order("created_at", { ascending: false });
  if (me.role === "teacher") query.eq("teacher_id", me.id);
  const { data: classes } = await query;

  return (
    <div className="min-h-screen">
      <AppNav title="Teacher Dashboard" />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            New Class
          </h2>
          <form action={createClass} className="flex gap-3">
            <input
              type="text"
              name="name"
              placeholder="Class name (e.g. Algebra I – Period 3)"
              required
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Create
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Your Classes ({classes?.length ?? 0})
          </h2>
          {!classes?.length ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              No classes yet. Create one above.
            </div>
          ) : (
            <ul className="space-y-2">
              {(classes as Class[]).map((cls) => (
                <li
                  key={cls.id}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-gray-200 transition-colors"
                >
                  <Link
                    href={`/teacher/class/${cls.id}`}
                    className="font-medium text-gray-900 hover:text-gray-600 transition-colors flex-1"
                  >
                    {cls.name}
                  </Link>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {new Date(cls.created_at).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/teacher/class/${cls.id}`}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      Open →
                    </Link>
                    <DeleteClassButton id={cls.id} name={cls.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

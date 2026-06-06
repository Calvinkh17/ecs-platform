import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { assignRole } from "@/app/actions";
import AppNav from "@/components/AppNav";

const ROLES = ["admin", "teacher", "parent", "student", "pending"] as const;

const roleColors: Record<string, string> = {
  admin:   "bg-purple-50 text-purple-700",
  teacher: "bg-blue-50 text-blue-700",
  parent:  "bg-green-50 text-green-700",
  student: "bg-yellow-50 text-yellow-700",
  pending: "bg-gray-100 text-gray-500",
};

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  const pending = users?.filter((u) => u.role === "pending") ?? [];
  const others  = users?.filter((u) => u.role !== "pending") ?? [];

  return (
    <div className="min-h-screen">
      <AppNav title="Admin" />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Pending approvals */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Pending Approval ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
              No pending users.
            </div>
          ) : (
            <ul className="space-y-2">
              {pending.map((u) => (
                <li key={u.id} className="bg-white border border-yellow-100 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-400">{u.email}</p>
                  </div>
                  <form action={assignRole} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={u.id} />
                    <select
                      name="role"
                      defaultValue=""
                      required
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="" disabled>Assign role…</option>
                      {ROLES.filter((r) => r !== "pending").map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Assign
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* All users */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            All Users ({users?.length ?? 0})
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {[...pending, ...others].map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {u.name}
                      {u.id === me.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${roleColors[u.role] ?? "bg-gray-100 text-gray-500"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <form action={assignRole} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

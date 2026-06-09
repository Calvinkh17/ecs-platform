"use client";

import { useState } from "react";
import { grantAnnouncementAccess, revokeAnnouncementAccess } from "@/app/actions";
import type { AnnouncementAccess } from "@/lib/types";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  users: AppUser[];
  initialAccess: AnnouncementAccess[];
}

export default function AnnouncementAccessTab({ users, initialAccess }: Props) {
  const [access, setAccess] = useState<AnnouncementAccess[]>(initialAccess);
  const [userId, setUserId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const existingIds = new Set(access.map(a => a.user_id));
  const eligible = users.filter(
    u => !["admin", "teacher"].includes(u.role) && !existingIds.has(u.id)
  );

  const accessWithNames = access.map(a => ({
    ...a,
    user_name: users.find(u => u.id === a.user_id)?.name || "Unknown",
    user_email: users.find(u => u.id === a.user_id)?.email || "",
  }));

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSaveError("");
    const fd = new FormData();
    fd.append("user_id", userId);
    if (expiresAt) fd.append("expires_at", new Date(expiresAt).toISOString());
    const result = await grantAnnouncementAccess(fd);
    setSaving(false);
    if (result?.error) { setSaveError(result.error); return; }
    const newRecord: AnnouncementAccess = {
      id: crypto.randomUUID(),
      user_id: userId,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      can_send: true,
      created_at: new Date().toISOString(),
    };
    setAccess(prev => [...prev, newRecord]);
    setUserId("");
    setExpiresAt("");
  }

  async function handleRevoke(id: string, userName: string) {
    if (!confirm(`Revoke announcement access for ${userName}?`)) return;
    const fd = new FormData();
    fd.append("id", id);
    const result = await revokeAnnouncementAccess(fd);
    if (result?.error) { alert(result.error); return; }
    setAccess(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
          Grant Send Access
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Admins and teachers always have send access. Use this to grant temporary or permanent access to others.
        </p>
        {eligible.length === 0 ? (
          <p className="text-sm text-gray-400">
            No eligible users to grant access to. All non-admin, non-teacher users already have access, or none exist.
          </p>
        ) : (
          <form onSubmit={handleGrant} className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">User</label>
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                required
                className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-60"
              >
                <option value="" disabled>Select user…</option>
                {eligible.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Expires (blank = permanent)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !userId}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Grant"}
            </button>
            {saveError && <p className="text-sm text-red-500 mt-1">{saveError}</p>}
          </form>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Current Access Grants ({access.length})
        </h2>
        {access.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
            No custom access grants yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">User</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Expires</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {accessWithNames.map(a => {
                  const expired = a.expires_at ? new Date(a.expires_at) <= new Date() : false;
                  return (
                    <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-800">{a.user_name}</td>
                      <td className="px-5 py-3 text-gray-500">{a.user_email}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {a.expires_at
                          ? new Date(a.expires_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "numeric", minute: "2-digit",
                            })
                          : "Never (permanent)"}
                      </td>
                      <td className="px-5 py-3">
                        {expired ? (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleRevoke(a.id, a.user_name)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

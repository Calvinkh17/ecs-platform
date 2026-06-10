"use client";

import { useState } from "react";
import { grantAnnouncementAccess, revokeAnnouncementAccess } from "@/app/actions";
import type { AnnouncementAccess } from "@/lib/types";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface AppUser { id: string; name: string; email: string; role: string; }

interface Props {
  users: AppUser[];
  initialAccess: AnnouncementAccess[];
}

const selectCls = "h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";

export default function AnnouncementAccessTab({ users, initialAccess }: Props) {
  const [access, setAccess] = useState<AnnouncementAccess[]>(initialAccess);
  const [userId, setUserId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const existingIds = new Set(access.map(a => a.user_id));
  const eligible = users.filter(u => !["admin", "teacher"].includes(u.role) && !existingIds.has(u.id));

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
    const newRecord: AnnouncementAccess = { id: crypto.randomUUID(), user_id: userId, expires_at: expiresAt ? new Date(expiresAt).toISOString() : null, can_send: true, created_at: new Date().toISOString() };
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
      <section className="card rounded-xl p-5">
        <SectionLabel>Grant Send Access</SectionLabel>
        <p className="text-xs text-muted mb-4">
          Admins and teachers always have send access. Use this to grant temporary or permanent access to others.
        </p>
        {eligible.length === 0 ? (
          <p className="text-sm text-muted">No eligible users to grant access to.</p>
        ) : (
          <form onSubmit={handleGrant} className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">User</label>
              <select value={userId} onChange={e => setUserId(e.target.value)} required className={`${selectCls} w-60`}>
                <option value="" disabled>Select user…</option>
                {eligible.map(u => <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Expires (blank = permanent)</label>
              <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={selectCls} />
            </div>
            <button type="submit" disabled={saving || !userId} className="h-9 px-4 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
              {saving ? "Saving…" : "Grant"}
            </button>
            {saveError && <p className="text-sm text-danger mt-1">{saveError}</p>}
          </form>
        )}
      </section>

      <section>
        <SectionLabel>Current Access Grants ({access.length})</SectionLabel>
        {access.length === 0 ? (
          <div className="text-center py-10 text-muted card rounded-xl text-sm">No custom access grants yet.</div>
        ) : (
          <div className="card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">User</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Email</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Expires</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {accessWithNames.map(a => {
                  const expired = a.expires_at ? new Date(a.expires_at) <= new Date() : false;
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-primary">{a.user_name}</td>
                      <td className="px-5 py-3 text-muted">{a.user_email}</td>
                      <td className="px-5 py-3 text-secondary">
                        {a.expires_at ? new Date(a.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Never (permanent)"}
                      </td>
                      <td className="px-5 py-3">
                        {expired ? (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-danger-faint text-danger">Expired</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleRevoke(a.id, a.user_name)} className="text-xs text-danger hover:text-danger/80 transition-colors">Revoke</button>
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

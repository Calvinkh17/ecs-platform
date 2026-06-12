"use client";

import { useState, useRef } from "react";
import { upsertTeacher, deleteTeacher } from "@/app/actions";
import type { Teacher, TeacherStatus } from "@/lib/types";
import { SectionLabel } from "@/components/ui/SectionLabel";
import Link from "next/link";

const DEPARTMENTS = ["Math", "Science", "English", "History", "Art", "Music", "PE", "Technology", "Languages", "Other"];
const STATUSES: { value: TeacherStatus; label: string; color: string }[] = [
  { value: "active",     label: "Active",     color: "bg-emerald-100 text-emerald-700" },
  { value: "on_leave",   label: "On Leave",   color: "bg-amber-100 text-amber-700" },
  { value: "contract",   label: "Contract",   color: "bg-blue-100 text-blue-700" },
  { value: "probation",  label: "Probation",  color: "bg-orange-100 text-orange-700" },
  { value: "retired",    label: "Retired",    color: "bg-surface text-muted" },
  { value: "resigned",   label: "Resigned",   color: "bg-danger-faint text-danger" },
];

function statusBadge(status: TeacherStatus) {
  const s = STATUSES.find((x) => x.value === status);
  return s ? (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.color}`}>{s.label}</span>
  ) : null;
}

interface AppUser { id: string; name: string; email: string; role: string; }
interface Props {
  initialTeachers: Teacher[];
  users: AppUser[];
}

const inputCls = "px-3 h-9 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";
const selectCls = "h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";

export default function TeachersTab({ initialTeachers, users }: Props) {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const teacherUserIds = new Set(teachers.map((t) => t.id));
  const availableUsers = users.filter(
    (u) => (u.role === "teacher" || u.role === "admin") && !teacherUserIds.has(u.id)
  );

  const filtered = teachers.filter((t) => {
    if (deptFilter && t.department !== deptFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const editingTeacher = teachers.find((t) => t.id === editingId) ?? null;

  async function handleSave(fd: FormData, isNew: boolean) {
    setSaving(true);
    setSaveError("");
    const result = await upsertTeacher(fd);
    setSaving(false);
    if (result?.error) { setSaveError(result.error); return; }
    if (isNew) {
      const id = fd.get("id") as string;
      const newT: Teacher = {
        id,
        name: (fd.get("name") as string).trim(),
        email: (fd.get("email") as string)?.trim() || null,
        photo_url: null,
        room_number: (fd.get("room_number") as string)?.trim() || null,
        department: (fd.get("department") as string)?.trim() || null,
        status: (fd.get("status") as TeacherStatus) || "active",
        start_date: (fd.get("start_date") as string) || null,
        notes: (fd.get("notes") as string)?.trim() || null,
        created_at: new Date().toISOString(),
      };
      setTeachers((prev) => [...prev, newT].sort((a, b) => a.name.localeCompare(b.name)));
      setAddingNew(false);
    } else {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: (fd.get("name") as string).trim(),
                email: (fd.get("email") as string)?.trim() || null,
                room_number: (fd.get("room_number") as string)?.trim() || null,
                department: (fd.get("department") as string)?.trim() || null,
                status: (fd.get("status") as TeacherStatus) || t.status,
                start_date: (fd.get("start_date") as string) || null,
                notes: (fd.get("notes") as string)?.trim() || null,
              }
            : t
        )
      );
      setEditingId(null);
    }
    setPhotoPreview(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the teachers database?`)) return;
    const fd = new FormData();
    fd.append("id", id);
    await deleteTeacher(fd);
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  }

  function TeacherForm({ teacher, isNew, userId }: { teacher?: Teacher; isNew?: boolean; userId?: string }) {
    return (
      <form
        ref={isNew ? formRef : editFormRef}
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await handleSave(fd, !!isNew);
        }}
        className="space-y-4 p-5"
      >
        <input type="hidden" name="id" value={teacher?.id ?? userId ?? ""} />
        <input type="hidden" name="existing_photo_url" value={teacher?.photo_url ?? ""} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Full Name *</label>
            <input type="text" name="name" defaultValue={teacher?.name ?? ""} required className={`${inputCls} w-full`} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Email</label>
            <input type="email" name="email" defaultValue={teacher?.email ?? ""} className={`${inputCls} w-full`} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Department</label>
            <select name="department" defaultValue={teacher?.department ?? ""} className={`${selectCls} w-full`}>
              <option value="">No department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Room Number</label>
            <input type="text" name="room_number" defaultValue={teacher?.room_number ?? ""} placeholder="e.g. 204" className={`${inputCls} w-full`} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Status</label>
            <select name="status" defaultValue={teacher?.status ?? "active"} className={`${selectCls} w-full`}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Start Date</label>
            <input type="date" name="start_date" defaultValue={teacher?.start_date ?? ""} className={`${inputCls} w-full`} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted">Photo</label>
          <div className="flex items-center gap-4">
            {(photoPreview ?? teacher?.photo_url) && (
              <img
                src={photoPreview ?? teacher?.photo_url ?? ""}
                alt="Preview"
                className="w-14 h-14 rounded-full object-cover border border-border"
              />
            )}
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPhotoPreview(URL.createObjectURL(file));
              }}
              className="text-sm text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:text-secondary file:bg-surface hover:file:bg-border file:transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted">Notes</label>
          <textarea name="notes" rows={2} defaultValue={teacher?.notes ?? ""} className="w-full px-3 py-2 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none" />
        </div>

        {saveError && <p className="text-sm text-danger">{saveError}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 h-9 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
            {saving ? "Saving…" : isNew ? "Add Teacher" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => { isNew ? setAddingNew(false) : setEditingId(null); setSaveError(""); setPhotoPreview(null); }}
            className="px-4 h-9 border border-border text-secondary text-sm font-medium rounded-md hover:bg-surface transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters + Add button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectCls}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {(deptFilter || statusFilter) && (
            <button onClick={() => { setDeptFilter(""); setStatusFilter(""); }} className="text-xs text-muted hover:text-secondary">Clear</button>
          )}
        </div>
        <button
          onClick={() => { setAddingNew(true); setEditingId(null); }}
          className="px-4 h-9 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
        >
          + Add Teacher
        </button>
      </div>

      {/* Add new teacher form */}
      {addingNew && availableUsers.length === 0 && (
        <div className="card rounded-xl p-5">
          <p className="text-sm text-muted">All teacher/admin users already have a profile. Assign the &ldquo;teacher&rdquo; role to a user first.</p>
          <button onClick={() => setAddingNew(false)} className="mt-3 text-xs text-muted hover:text-secondary">Dismiss</button>
        </div>
      )}
      {addingNew && availableUsers.length > 0 && (
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-3">
              <SectionLabel className="mb-0">New Teacher — Link to user account</SectionLabel>
              <select
                id="user-select"
                defaultValue=""
                onChange={(e) => {
                  const user = availableUsers.find((u) => u.id === e.target.value);
                  if (user && formRef.current) {
                    (formRef.current.querySelector('[name="id"]') as HTMLInputElement).value = user.id;
                    (formRef.current.querySelector('[name="name"]') as HTMLInputElement).value = user.name || "";
                    (formRef.current.querySelector('[name="email"]') as HTMLInputElement).value = user.email || "";
                  }
                }}
                className={selectCls}
              >
                <option value="" disabled>Select user account…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
          <TeacherForm isNew />
        </div>
      )}

      {/* Teachers table */}
      {filtered.length === 0 ? (
        <div className="card rounded-xl text-center py-14">
          <p className="text-sm text-muted">
            {teachers.length === 0
              ? "No teachers in the database yet. Add one above."
              : "No teachers match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Teacher</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Department</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Room</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Status</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Start Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <>
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {t.photo_url ? (
                          <img src={t.photo_url} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-border flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link href={`/teacher/profile/${t.id}`} className="font-medium text-primary hover:text-accent transition-colors">
                            {t.name}
                          </Link>
                          {t.email && <p className="text-xs text-muted">{t.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-secondary">{t.department ?? "—"}</td>
                    <td className="px-5 py-3 text-secondary">{t.room_number ?? "—"}</td>
                    <td className="px-5 py-3">{statusBadge(t.status)}</td>
                    <td className="px-5 py-3 text-secondary text-xs">
                      {t.start_date ? new Date(t.start_date + "T00:00:00").toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => { setEditingId(t.id); setAddingNew(false); setPhotoPreview(null); setSaveError(""); }}
                          className="text-xs text-muted hover:text-secondary transition-colors"
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="text-xs text-danger hover:text-danger/80 transition-colors"
                        >Remove</button>
                      </div>
                    </td>
                  </tr>
                  {editingId === t.id && (
                    <tr key={`edit-${t.id}`} className="border-b border-border bg-accent/5">
                      <td colSpan={6} className="p-0">
                        <TeacherForm teacher={t} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

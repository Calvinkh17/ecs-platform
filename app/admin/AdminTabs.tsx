"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assignRole, addSchoolStudent, deleteSchoolStudent, updateSchoolStudent, linkParentStudent, unlinkParentStudent } from "@/app/actions";
import type { SchoolStudent, ParentLink, Observation, ObservationResponse, AnnouncementAccess, ChatChannel, ChannelMember, Class } from "@/lib/types";
import ObservationTab from "./ObservationTab";
import AnnouncementAccessTab from "./AnnouncementAccessTab";
import ChannelsTab from "./ChannelsTab";
import ClassesTab from "./ClassesTab";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RoleBadge } from "@/components/ui/Badge";

const GRADE_LEVELS = ["K","1","2","3","4","5","6","7","8","9","10","11","12","Graduated"];
const ROLES = ["admin","teacher","parent","student","pending"] as const;

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  meId: string;
  users: AppUser[];
  schoolStudents: SchoolStudent[];
  initialParentLinks: ParentLink[];
  initialObservations: Observation[];
  initialResponses: ObservationResponse[];
  initialAnnouncementAccess: AnnouncementAccess[];
  initialChannels: ChatChannel[];
  initialChannelMembers: (ChannelMember & { user_name: string; user_email: string })[];
  initialClasses: Class[];
}

const inputCls = "px-3 h-9 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";
const selectCls = "h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";
const btnPrimary = "px-4 h-9 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50";

export default function AdminTabs({ meId, users, schoolStudents: initialStudents, initialParentLinks, initialObservations, initialResponses, initialAnnouncementAccess, initialChannels, initialChannelMembers, initialClasses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ["users", "students", "parents", "observations", "announcements", "channels", "classes"] as const;
  type Tab = typeof validTabs[number];
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab") as Tab;
    return validTabs.includes(t) ? t : "users";
  });
  const teacherUsers = users.filter(u => u.role === "teacher");

  function changeTab(t: Tab) {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    if (t !== "observations") params.delete("teacher");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const [gradeFilter, setGradeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [addError, setAddError] = useState("");
  const [roster, setRoster] = useState<SchoolStudent[]>(initialStudents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: "", grade_level: "", year_joined: "", graduating_year: "", email: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const [links, setLinks] = useState<ParentLink[]>(initialParentLinks);
  const [linkStatus, setLinkStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [linkError, setLinkError] = useState("");
  const linkFormRef = useRef<HTMLFormElement>(null);

  const pending = users.filter(u => u.role === "pending");
  const others  = users.filter(u => u.role !== "pending");
  const parentUsers = users.filter(u => u.role === "parent");

  const uniqueYears = [...new Set(roster.map(s => s.year_joined))].sort((a, b) => b - a);
  const filtered = roster.filter(s => {
    if (gradeFilter && s.grade_level !== gradeFilter) return false;
    if (yearFilter && String(s.year_joined) !== yearFilter) return false;
    return true;
  });

  const TAB_LABELS: Record<Tab, string> = {
    users: "Users", students: "Students", parents: "Parents",
    observations: "Observations", announcements: "Announcements",
    channels: "Channels", classes: "Classes",
  };
  const TAB_COUNTS: Partial<Record<Tab, number>> = {
    users: users.length, students: roster.length,
    parents: links.length, classes: initialClasses.length,
  };

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex border-b border-border flex-wrap -mb-px">
        {(["users", "students", "parents", "observations", "announcements", "channels", "classes"] as const).map(t => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t
                ? "border-accent text-primary"
                : "border-transparent text-muted hover:text-secondary hover:border-border"
            }`}
          >
            {TAB_LABELS[t]}
            {TAB_COUNTS[t] !== undefined && (
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${tab === t ? "bg-accent/10 text-accent" : "bg-surface text-muted"}`}>
                {TAB_COUNTS[t]}
              </span>
            )}
            {t === "users" && pending.length > 0 && tab !== "users" && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block align-middle" />
            )}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card rounded-xl px-5 py-4">
              <div className="text-3xl font-bold text-primary tabular-nums">{users.length}</div>
              <div className="text-xs text-muted mt-1.5 font-medium">Total Users</div>
            </div>
            <div className={`card rounded-xl px-5 py-4 ${pending.length > 0 ? "!bg-amber-500/10 !border-amber-500/30" : ""}`}>
              <div className={`text-3xl font-bold tabular-nums ${pending.length > 0 ? "text-amber-500" : "text-primary"}`}>{pending.length}</div>
              <div className={`text-xs mt-1.5 font-medium ${pending.length > 0 ? "text-amber-500/80" : "text-muted"}`}>Pending Approval</div>
            </div>
            <div className="card rounded-xl px-5 py-4">
              <div className="text-3xl font-bold text-accent tabular-nums">{users.filter(u => u.role === "teacher").length}</div>
              <div className="text-xs text-muted mt-1.5 font-medium">Teachers</div>
            </div>
            <div className="card rounded-xl px-5 py-4">
              <div className="text-3xl font-bold text-primary tabular-nums">{users.filter(u => u.role === "parent").length}</div>
              <div className="text-xs text-muted mt-1.5 font-medium">Parents</div>
            </div>
          </div>

          <section>
            <SectionLabel>Pending Approval ({pending.length})</SectionLabel>
            {pending.length === 0 ? (
              <div className="card text-center py-8 text-muted rounded-xl text-sm">
                <svg className="mx-auto mb-2 text-border-strong" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                All users have been approved.
              </div>
            ) : (
              <ul className="space-y-2">
                {pending.map(u => (
                  <li key={u.id} className="card rounded-xl px-5 py-4 flex items-center justify-between gap-4 !bg-amber-500/10 !border-amber-500/30">
                    <div>
                      <p className="font-medium text-primary">{u.name}</p>
                      <p className="text-sm text-muted">{u.email}</p>
                    </div>
                    <form action={assignRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select name="role" defaultValue="" required className={selectCls}>
                        <option value="" disabled>Assign role…</option>
                        {ROLES.filter(r => r !== "pending").map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      <button type="submit" className={btnPrimary}>Assign</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionLabel>All Users ({users.length})</SectionLabel>
            <div className="card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Name</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Email</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Role</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pending, ...others].map(u => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-primary">
                        {u.name}
                        {u.id === meId && <span className="ml-2 text-xs text-muted">(you)</span>}
                      </td>
                      <td className="px-5 py-3 text-muted">{u.email}</td>
                      <td className="px-5 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-3">
                        <form action={assignRole} className="flex items-center gap-2">
                          <input type="hidden" name="user_id" value={u.id} />
                          <select name="role" defaultValue={u.role} className="h-7 px-2 rounded-md border border-border bg-surface-raised text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent/40">
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                          <button type="submit" className="px-2 h-7 bg-surface border border-border text-secondary text-xs font-medium rounded-md hover:bg-border transition-colors">
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
        </div>
      )}

      {/* ── Students tab ── */}
      {tab === "students" && (
        <div className="space-y-6">
          <section className="card rounded-xl p-5">
            <SectionLabel>Add Student to Roster</SectionLabel>
            <form
              ref={formRef}
              onSubmit={async (e) => {
                e.preventDefault();
                setAddStatus("pending");
                setAddError("");
                try {
                  const fd = new FormData(e.currentTarget);
                  const result = await addSchoolStudent(fd);
                  if (result?.error) { setAddStatus("error"); setAddError(result.error); return; }
                  const newStudent: SchoolStudent = {
                    id: crypto.randomUUID(),
                    name: (fd.get("name") as string).trim(),
                    grade_level: fd.get("grade_level") as string,
                    year_joined: parseInt(fd.get("year_joined") as string),
                    graduating_year: parseInt(fd.get("graduating_year") as string),
                    email: (fd.get("email") as string)?.trim() || null,
                    created_at: new Date().toISOString(),
                  };
                  setRoster(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name)));
                  formRef.current?.reset();
                  setAddStatus("success");
                  setTimeout(() => setAddStatus("idle"), 2000);
                } catch (err) {
                  setAddStatus("error");
                  setAddError(String(err));
                }
              }}
              className="flex flex-wrap gap-2 items-end"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Name</label>
                <input type="text" name="name" placeholder="Full name" required className={`${inputCls} w-48`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Grade</label>
                <select name="grade_level" required defaultValue="" className={selectCls}>
                  <option value="" disabled>Grade…</option>
                  {GRADE_LEVELS.map(g => (
                    <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Year Joined</label>
                <input type="number" name="year_joined" placeholder="2024" min={2000} max={2100} required className={`${inputCls} w-28`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Graduating Year</label>
                <input type="number" name="graduating_year" placeholder="2026" min={2000} max={2100} required className={`${inputCls} w-36`} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Email (optional)</label>
                <input type="email" name="email" placeholder="student@school.edu" className={`${inputCls} w-48`} />
              </div>
              <button type="submit" disabled={addStatus === "pending"} className={btnPrimary}>
                {addStatus === "pending" ? "Adding…" : "Add"}
              </button>
            </form>
            {addStatus === "success" && <p className="mt-2 text-sm text-green-600">Student added successfully.</p>}
            {addStatus === "error" && <p className="mt-2 text-sm text-danger">Error: {addError || "Something went wrong."}</p>}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel className="mb-0">
                All Students ({filtered.length}{filtered.length !== roster.length ? ` of ${roster.length}` : ""})
              </SectionLabel>
              <div className="flex items-center gap-2">
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className={selectCls}>
                  <option value="">All grades</option>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>)}
                </select>
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className={selectCls}>
                  <option value="">All years</option>
                  {uniqueYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                {(gradeFilter || yearFilter) && (
                  <button onClick={() => { setGradeFilter(""); setYearFilter(""); }} className="text-xs text-muted hover:text-secondary">Clear</button>
                )}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="card text-center py-12 rounded-xl">
                <p className="text-sm text-muted">{roster.length === 0 ? "No students in the roster yet — add one above." : "No students match the selected filters."}</p>
              </div>
            ) : (
              <div className="card rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Name</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Grade</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Year Joined</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Graduating Year</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Email</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => editingId === s.id ? (
                      <tr key={s.id} className="border-b border-border last:border-0 bg-accent/5">
                        <td className="px-3 py-2"><input type="text" value={editValues.name} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} className={`${inputCls} w-full`} /></td>
                        <td className="px-3 py-2">
                          <select value={editValues.grade_level} onChange={e => setEditValues(v => ({ ...v, grade_level: e.target.value }))} className={`${selectCls} w-full`}>
                            {GRADE_LEVELS.map(g => <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" value={editValues.year_joined} onChange={e => setEditValues(v => ({ ...v, year_joined: e.target.value }))} min={2000} max={2100} className={`${inputCls} w-24`} /></td>
                        <td className="px-3 py-2"><input type="number" value={editValues.graduating_year} onChange={e => setEditValues(v => ({ ...v, graduating_year: e.target.value }))} min={2000} max={2100} className={`${inputCls} w-24`} required /></td>
                        <td className="px-3 py-2"><input type="email" value={editValues.email} onChange={e => setEditValues(v => ({ ...v, email: e.target.value }))} placeholder="optional" className={`${inputCls} w-full`} /></td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              disabled={editSaving}
                              onClick={async () => {
                                setEditSaving(true); setEditError("");
                                const fd = new FormData();
                                fd.append("id", s.id); fd.append("name", editValues.name);
                                fd.append("grade_level", editValues.grade_level);
                                fd.append("year_joined", editValues.year_joined);
                                fd.append("graduating_year", editValues.graduating_year);
                                fd.append("email", editValues.email);
                                const result = await updateSchoolStudent(fd);
                                setEditSaving(false);
                                if (result?.error) { setEditError(result.error); return; }
                                setRoster(prev => prev.map(r => r.id === s.id ? { ...r, name: editValues.name.trim(), grade_level: editValues.grade_level, year_joined: parseInt(editValues.year_joined), graduating_year: parseInt(editValues.graduating_year), email: editValues.email.trim() || null } : r).sort((a, b) => a.name.localeCompare(b.name)));
                                setEditingId(null);
                              }}
                              className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors"
                            >
                              {editSaving ? "Saving…" : "Save"}
                            </button>
                            <button onClick={() => { setEditingId(null); setEditError(""); }} className="text-xs text-muted hover:text-secondary transition-colors">Cancel</button>
                            {editError && <span className="text-xs text-danger">{editError}</span>}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-primary">{s.name}</td>
                        <td className="px-5 py-3 text-secondary">{s.grade_level === "K" ? "Kindergarten" : s.grade_level === "Graduated" ? "Graduated" : `Grade ${s.grade_level}`}</td>
                        <td className="px-5 py-3 text-secondary">{s.year_joined}</td>
                        <td className="px-5 py-3 text-secondary">{s.graduating_year}</td>
                        <td className="px-5 py-3 text-muted">{s.email ?? "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button className="text-xs text-muted hover:text-secondary transition-colors" onClick={() => { setEditingId(s.id); setEditValues({ name: s.name, grade_level: s.grade_level, year_joined: String(s.year_joined), graduating_year: s.graduating_year != null ? String(s.graduating_year) : "", email: s.email ?? "" }); setEditError(""); }}>Edit</button>
                            <button className="text-xs text-danger hover:text-danger/80 transition-colors" onClick={async () => { if (!confirm(`Remove "${s.name}" from the roster?`)) return; const fd = new FormData(); fd.append("id", s.id); await deleteSchoolStudent(fd); setRoster(prev => prev.filter(r => r.id !== s.id)); }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "observations" && (
        <ObservationTab teachers={teacherUsers} initialObservations={initialObservations} initialResponses={initialResponses} />
      )}
      {tab === "announcements" && (
        <AnnouncementAccessTab users={users} initialAccess={initialAnnouncementAccess} />
      )}
      {tab === "channels" && (
        <ChannelsTab meId={meId} users={users} initialChannels={initialChannels} initialMembers={initialChannelMembers} />
      )}
      {tab === "classes" && (
        <ClassesTab initialClasses={initialClasses} users={users} />
      )}

      {/* ── Parents tab ── */}
      {tab === "parents" && (
        <div className="space-y-6">
          <section className="card rounded-xl p-5">
            <SectionLabel>Link Parent to Student</SectionLabel>
            {parentUsers.length === 0 ? (
              <p className="text-sm text-muted">No parent accounts yet. Assign the &ldquo;parent&rdquo; role to a user first.</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-muted">No students in the roster yet. Add students first.</p>
            ) : (
              <form
                ref={linkFormRef}
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLinkStatus("pending"); setLinkError("");
                  const fd = new FormData(e.currentTarget);
                  const result = await linkParentStudent(fd);
                  if (result?.error) { setLinkStatus("error"); setLinkError(result.error); return; }
                  const parent_id = fd.get("parent_id") as string;
                  const student_id = fd.get("student_id") as string;
                  const newLink: ParentLink = { id: crypto.randomUUID(), parent_id, student_id, parent_name: parentUsers.find(u => u.id === parent_id)?.name ?? "", parent_email: parentUsers.find(u => u.id === parent_id)?.email ?? "", student_name: roster.find(s => s.id === student_id)?.name ?? "", created_at: new Date().toISOString() };
                  setLinks(prev => [newLink, ...prev]);
                  linkFormRef.current?.reset();
                  setLinkStatus("success");
                  setTimeout(() => setLinkStatus("idle"), 2000);
                }}
                className="flex flex-wrap gap-2 items-end"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Parent</label>
                  <select name="parent_id" required defaultValue="" className={`${selectCls} w-56`}>
                    <option value="" disabled>Select parent…</option>
                    {parentUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Student</label>
                  <select name="student_id" required defaultValue="" className={`${selectCls} w-56`}>
                    <option value="" disabled>Select student…</option>
                    {roster.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={linkStatus === "pending"} className={btnPrimary}>
                  {linkStatus === "pending" ? "Linking…" : "Link"}
                </button>
              </form>
            )}
            {linkStatus === "success" && <p className="mt-2 text-sm text-green-600">Linked successfully.</p>}
            {linkStatus === "error" && <p className="mt-2 text-sm text-danger">Error: {linkError}</p>}
          </section>

          <section>
            <SectionLabel>All Parent-Student Links ({links.length})</SectionLabel>
            {links.length === 0 ? (
              <div className="text-center py-10 text-muted card rounded-xl text-sm">
                No links yet.
              </div>
            ) : (
              <div className="card rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Parent</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Email</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs">Student</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {links.map(link => (
                      <tr key={link.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-primary">{link.parent_name || "—"}</td>
                        <td className="px-5 py-3 text-muted">{link.parent_email}</td>
                        <td className="px-5 py-3 text-secondary">{link.student_name}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            className="text-xs text-danger hover:text-danger/80 transition-colors"
                            onClick={async () => {
                              if (!confirm(`Remove link between ${link.parent_name || link.parent_email} and ${link.student_name}?`)) return;
                              const fd = new FormData();
                              fd.append("id", link.id);
                              await unlinkParentStudent(fd);
                              setLinks(prev => prev.filter(l => l.id !== link.id));
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

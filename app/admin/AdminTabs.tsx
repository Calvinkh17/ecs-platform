"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assignRole, addSchoolStudent, deleteSchoolStudent, updateSchoolStudent, linkParentStudent, unlinkParentStudent } from "@/app/actions";
import type { SchoolStudent, ParentLink, Observation, ObservationResponse, AnnouncementAccess } from "@/lib/types";
import ObservationTab from "./ObservationTab";
import AnnouncementAccessTab from "./AnnouncementAccessTab";

const GRADE_LEVELS = ["K","1","2","3","4","5","6","7","8","9","10","11","12","Graduated"];
const ROLES = ["admin","teacher","parent","student","pending"] as const;

const roleColors: Record<string, string> = {
  admin:   "bg-purple-50 text-purple-700",
  teacher: "bg-blue-50 text-blue-700",
  parent:  "bg-green-50 text-green-700",
  student: "bg-yellow-50 text-yellow-700",
  pending: "bg-gray-100 text-gray-500",
};

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
}

export default function AdminTabs({ meId, users, schoolStudents: initialStudents, initialParentLinks, initialObservations, initialResponses, initialAnnouncementAccess }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ["users", "students", "parents", "observations", "announcements"] as const;
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

  // Students tab state
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

  // Parents tab state
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

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 flex-wrap">
        {(["users", "students", "parents", "observations", "announcements"] as const).map(t => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {t === "users" ? `Users (${users.length})` : t === "students" ? `Students (${roster.length})` : t === "parents" ? `Parents (${links.length})` : t === "observations" ? "Observations" : "Announcements"}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <div className="space-y-8">
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
                {pending.map(u => (
                  <li key={u.id} className="bg-white border border-yellow-100 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-400">{u.email}</p>
                    </div>
                    <form action={assignRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select name="role" defaultValue="" required className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                        <option value="" disabled>Assign role…</option>
                        {ROLES.filter(r => r !== "pending").map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      <button type="submit" className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                        Assign
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              All Users ({users.length})
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
                  {[...pending, ...others].map(u => (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {u.name}
                        {u.id === meId && <span className="ml-2 text-xs text-gray-400">(you)</span>}
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
                          <select name="role" defaultValue={u.role} className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900">
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                          <button type="submit" className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
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
          <section className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Add Student to Roster
            </h2>
            <form
              ref={formRef}
              onSubmit={async (e) => {
                e.preventDefault();
                setAddStatus("pending");
                setAddError("");
                try {
                  const fd = new FormData(e.currentTarget);
                  const result = await addSchoolStudent(fd);
                  if (result?.error) {
                    setAddStatus("error");
                    setAddError(result.error);
                    return;
                  }
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
                <label className="text-xs text-gray-400">Name</label>
                <input type="text" name="name" placeholder="Full name" required className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Grade</label>
                <select name="grade_level" required defaultValue="" className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="" disabled>Grade…</option>
                  {GRADE_LEVELS.map(g => (
                    <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Year Joined</label>
                <input type="number" name="year_joined" placeholder="2024" min={2000} max={2100} required className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-28" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Graduating Year</label>
                <input type="number" name="graduating_year" placeholder="2026" min={2000} max={2100} required className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Email (optional)</label>
                <input type="email" name="email" placeholder="student@school.edu" className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48" />
              </div>
              <button type="submit" disabled={addStatus === "pending"} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
                {addStatus === "pending" ? "Adding…" : "Add"}
              </button>
            </form>
            {addStatus === "success" && <p className="mt-2 text-sm text-green-600">Student added successfully.</p>}
            {addStatus === "error" && <p className="mt-2 text-sm text-red-500">Error: {addError || "Something went wrong."}</p>}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                All Students ({filtered.length}{filtered.length !== roster.length ? ` of ${roster.length}` : ""})
              </h2>
              <div className="flex items-center gap-2">
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">All grades</option>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>)}
                </select>
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">All years</option>
                  {uniqueYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                {(gradeFilter || yearFilter) && (
                  <button onClick={() => { setGradeFilter(""); setYearFilter(""); }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                )}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
                {roster.length === 0 ? "No students in the roster yet." : "No students match the selected filters."}
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Grade</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Year Joined</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Graduating Year</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => editingId === s.id ? (
                      <tr key={s.id} className="border-b border-gray-50 last:border-0 bg-blue-50/20">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editValues.name}
                            onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editValues.grade_level}
                            onChange={e => setEditValues(v => ({ ...v, grade_level: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          >
                            {GRADE_LEVELS.map(g => (
                              <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={editValues.year_joined}
                            onChange={e => setEditValues(v => ({ ...v, year_joined: e.target.value }))}
                            min={2000}
                            max={2100}
                            className="w-24 px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={editValues.graduating_year}
                            onChange={e => setEditValues(v => ({ ...v, graduating_year: e.target.value }))}
                            min={2000}
                            max={2100}
                            className="w-24 px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="email"
                            value={editValues.email}
                            onChange={e => setEditValues(v => ({ ...v, email: e.target.value }))}
                            placeholder="optional"
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              disabled={editSaving}
                              onClick={async () => {
                                setEditSaving(true);
                                setEditError("");
                                const fd = new FormData();
                                fd.append("id", s.id);
                                fd.append("name", editValues.name);
                                fd.append("grade_level", editValues.grade_level);
                                fd.append("year_joined", editValues.year_joined);
                                fd.append("graduating_year", editValues.graduating_year);
                                fd.append("email", editValues.email);
                                const result = await updateSchoolStudent(fd);
                                setEditSaving(false);
                                if (result?.error) { setEditError(result.error); return; }
                                setRoster(prev =>
                                  prev.map(r => r.id === s.id ? {
                                    ...r,
                                    name: editValues.name.trim(),
                                    grade_level: editValues.grade_level,
                                    year_joined: parseInt(editValues.year_joined),
                                    graduating_year: parseInt(editValues.graduating_year),
                                    email: editValues.email.trim() || null,
                                  } : r).sort((a, b) => a.name.localeCompare(b.name))
                                );
                                setEditingId(null);
                              }}
                              className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors"
                            >
                              {editSaving ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditError(""); }}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                            {editError && <span className="text-xs text-red-500">{editError}</span>}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                        <td className="px-5 py-3 text-gray-600">{s.grade_level === "K" ? "Kindergarten" : s.grade_level === "Graduated" ? "Graduated" : `Grade ${s.grade_level}`}</td>
                        <td className="px-5 py-3 text-gray-600">{s.year_joined}</td>
                        <td className="px-5 py-3 text-gray-600">{s.graduating_year}</td>
                        <td className="px-5 py-3 text-gray-400">{s.email ?? "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                              onClick={() => {
                                setEditingId(s.id);
                                setEditValues({
                                  name: s.name,
                                  grade_level: s.grade_level,
                                  year_joined: String(s.year_joined),
                                  graduating_year: s.graduating_year != null ? String(s.graduating_year) : "",
                                  email: s.email ?? "",
                                });
                                setEditError("");
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              onClick={async () => {
                                if (!confirm(`Remove "${s.name}" from the roster?`)) return;
                                const fd = new FormData();
                                fd.append("id", s.id);
                                await deleteSchoolStudent(fd);
                                setRoster(prev => prev.filter(r => r.id !== s.id));
                              }}
                            >
                              Delete
                            </button>
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

      {/* ── Observations tab ── */}
      {tab === "observations" && (
        <ObservationTab
          teachers={teacherUsers}
          initialObservations={initialObservations}
          initialResponses={initialResponses}
        />
      )}

      {/* ── Announcements tab ── */}
      {tab === "announcements" && (
        <AnnouncementAccessTab
          users={users}
          initialAccess={initialAnnouncementAccess}
        />
      )}

      {/* ── Parents tab ── */}
      {tab === "parents" && (
        <div className="space-y-6">
          <section className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Link Parent to Student
            </h2>
            {parentUsers.length === 0 ? (
              <p className="text-sm text-gray-400">No parent accounts yet. Assign the "parent" role to a user first.</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-gray-400">No students in the roster yet. Add students first.</p>
            ) : (
              <form
                ref={linkFormRef}
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLinkStatus("pending");
                  setLinkError("");
                  const fd = new FormData(e.currentTarget);
                  const result = await linkParentStudent(fd);
                  if (result?.error) {
                    setLinkStatus("error");
                    setLinkError(result.error);
                    return;
                  }
                  const parent_id = fd.get("parent_id") as string;
                  const student_id = fd.get("student_id") as string;
                  const newLink: ParentLink = {
                    id: crypto.randomUUID(),
                    parent_id,
                    student_id,
                    parent_name: parentUsers.find(u => u.id === parent_id)?.name ?? "",
                    parent_email: parentUsers.find(u => u.id === parent_id)?.email ?? "",
                    student_name: roster.find(s => s.id === student_id)?.name ?? "",
                    created_at: new Date().toISOString(),
                  };
                  setLinks(prev => [newLink, ...prev]);
                  linkFormRef.current?.reset();
                  setLinkStatus("success");
                  setTimeout(() => setLinkStatus("idle"), 2000);
                }}
                className="flex flex-wrap gap-2 items-end"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Parent</label>
                  <select name="parent_id" required defaultValue="" className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-56">
                    <option value="" disabled>Select parent…</option>
                    {parentUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Student</label>
                  <select name="student_id" required defaultValue="" className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-56">
                    <option value="" disabled>Select student…</option>
                    {roster.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={linkStatus === "pending"} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
                  {linkStatus === "pending" ? "Linking…" : "Link"}
                </button>
              </form>
            )}
            {linkStatus === "success" && <p className="mt-2 text-sm text-green-600">Linked successfully.</p>}
            {linkStatus === "error" && <p className="mt-2 text-sm text-red-500">Error: {linkError}</p>}
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              All Parent-Student Links ({links.length})
            </h2>
            {links.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
                No links yet.
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Parent</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Student</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {links.map(link => (
                      <tr key={link.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">{link.parent_name || "—"}</td>
                        <td className="px-5 py-3 text-gray-500">{link.parent_email}</td>
                        <td className="px-5 py-3 text-gray-700">{link.student_name}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
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

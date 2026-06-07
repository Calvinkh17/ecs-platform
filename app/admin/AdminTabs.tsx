"use client";

import { useState, useRef } from "react";
import { assignRole, addSchoolStudent, deleteSchoolStudent } from "@/app/actions";
import type { SchoolStudent } from "@/lib/types";

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
}

export default function AdminTabs({ meId, users, schoolStudents: initialStudents }: Props) {
  const [tab, setTab] = useState<"users" | "students">("users");
  const [gradeFilter, setGradeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [addError, setAddError] = useState("");
  const [roster, setRoster] = useState<SchoolStudent[]>(initialStudents);
  const formRef = useRef<HTMLFormElement>(null);

  const pending = users.filter(u => u.role === "pending");
  const others  = users.filter(u => u.role !== "pending");

  const uniqueYears = [...new Set(roster.map(s => s.year_joined))].sort((a, b) => b - a);

  const filtered = roster.filter(s => {
    if (gradeFilter && s.grade_level !== gradeFilter) return false;
    if (yearFilter && String(s.year_joined) !== yearFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {(["users", "students"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {t === "users" ? `Users (${users.length})` : `Students (${schoolStudents.length})`}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-8">
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

          {/* All users */}
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

      {tab === "students" && (
        <div className="space-y-6">
          {/* Add student form */}
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
                  await addSchoolStudent(fd);
                  const newStudent: SchoolStudent = {
                    id: crypto.randomUUID(),
                    name: (fd.get("name") as string).trim(),
                    grade_level: fd.get("grade_level") as string,
                    year_joined: parseInt(fd.get("year_joined") as string),
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
                <input
                  type="text"
                  name="name"
                  placeholder="Full name"
                  required
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Grade</label>
                <select
                  name="grade_level"
                  required
                  defaultValue=""
                  className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="" disabled>Grade…</option>
                  {GRADE_LEVELS.map(g => (
                    <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Year Joined</label>
                <input
                  type="number"
                  name="year_joined"
                  placeholder="2024"
                  min={2000}
                  max={2100}
                  required
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-28"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Email (optional)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="student@school.edu"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-48"
                />
              </div>
              <button
                type="submit"
                disabled={addStatus === "pending"}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {addStatus === "pending" ? "Adding…" : "Add"}
              </button>
            </form>
            {addStatus === "success" && (
              <p className="mt-2 text-sm text-green-600">Student added successfully.</p>
            )}
            {addStatus === "error" && (
              <p className="mt-2 text-sm text-red-500">Error: {addError || "Something went wrong."}</p>
            )}
          </section>

          {/* Filters + student list */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                All Students ({filtered.length}{filtered.length !== schoolStudents.length ? ` of ${schoolStudents.length}` : ""})
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={gradeFilter}
                  onChange={e => setGradeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All grades</option>
                  {GRADE_LEVELS.map(g => (
                    <option key={g} value={g}>{g === "K" ? "Kindergarten" : g === "Graduated" ? "Graduated" : `Grade ${g}`}</option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All years</option>
                  {uniqueYears.map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                {(gradeFilter || yearFilter) && (
                  <button
                    onClick={() => { setGradeFilter(""); setYearFilter(""); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
                {schoolStudents.length === 0 ? "No students in the roster yet." : "No students match the selected filters."}
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Grade</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Year Joined</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {s.grade_level === "K" ? "Kindergarten" : `Grade ${s.grade_level}`}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{s.year_joined}</td>
                        <td className="px-5 py-3 text-gray-400">{s.email ?? "—"}</td>
                        <td className="px-5 py-3 text-right">
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

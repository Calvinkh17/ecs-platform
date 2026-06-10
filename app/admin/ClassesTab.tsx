"use client";

import { useState } from "react";
import { reassignClass } from "@/app/actions";
import type { Class } from "@/lib/types";

interface AppUser { id: string; name: string; email: string; role: string; }

interface Props {
  initialClasses: Class[];
  users: AppUser[];
}

export default function ClassesTab({ initialClasses, users }: Props) {
  const [classes, setClasses] = useState<Class[]>(initialClasses);
  const [selected, setSelected] = useState<Record<string, string>>(
    () => Object.fromEntries(initialClasses.map((c) => [c.id, c.teacher_id ?? ""]))
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const teacherUsers = users.filter((u) => u.role === "teacher");
  const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name || u.email]));

  async function handleSave(classId: string) {
    setSaving((s) => ({ ...s, [classId]: true }));
    setErrors((e) => ({ ...e, [classId]: "" }));
    const fd = new FormData();
    fd.append("id", classId);
    fd.append("teacher_id", selected[classId] ?? "");
    const result = await reassignClass(fd);
    setSaving((s) => ({ ...s, [classId]: false }));
    if (result?.error) {
      setErrors((e) => ({ ...e, [classId]: result.error! }));
      return;
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, teacher_id: selected[classId] || null } : c
      )
    );
    setSaved((s) => ({ ...s, [classId]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [classId]: false })), 2000);
  }

  return (
    <div className="card rounded-xl overflow-hidden">
      {classes.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          No classes yet. Create one from the Teacher Dashboard.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Class</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Current Teacher</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Reassign To</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => {
              const currentTeacherId = cls.teacher_id ?? "";
              const isDirty = selected[cls.id] !== currentTeacherId;
              return (
                <tr key={cls.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{cls.name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {cls.teacher_id
                      ? (nameMap[cls.teacher_id] ?? "Unknown")
                      : <span className="text-amber-500">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={selected[cls.id] ?? ""}
                      onChange={(e) =>
                        setSelected((s) => ({ ...s, [cls.id]: e.target.value }))
                      }
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold w-52"
                    >
                      <option value="">— Unassigned —</option>
                      {teacherUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {saved[cls.id] && (
                        <span className="text-xs text-green-600">Saved</span>
                      )}
                      {errors[cls.id] && (
                        <span className="text-xs text-red-500">{errors[cls.id]}</span>
                      )}
                      <button
                        onClick={() => handleSave(cls.id)}
                        disabled={saving[cls.id] || !isDirty}
                        className="px-3 py-1.5 bg-forest text-white text-xs font-medium rounded-lg hover:bg-forest-light transition-colors disabled:opacity-40"
                      >
                        {saving[cls.id] ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { letterGrade, gradeChip } from "@/lib/grades";
import type { Student, Assignment, Grade, Class } from "@/lib/types";

interface ClassReport {
  cls: Class;
  assignments: (Assignment & { grade: Grade | null })[];
  avg: number | null;
}

export default function ParentSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [report, setReport] = useState<ClassReport[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [activeClass, setActiveClass] = useState<string>("all");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setNotFound(false);
    setReport([]);
    setStudentName(null);
    setActiveClass("all");

    const supabase = createClient();

    // Find ALL student rows matching the name (one per class they're in)
    const { data: students } = await supabase
      .from("students")
      .select("*")
      .ilike("name", `%${query.trim()}%`);

    if (!students?.length) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setStudentName((students[0] as Student).name);

    // Build a report for each class the student appears in
    const reports = await Promise.all(
      (students as Student[]).map(async (student) => {
        const [{ data: cls }, { data: assignments }, { data: grades }] = await Promise.all([
          supabase.from("classes").select("*").eq("id", student.class_id).single(),
          supabase.from("assignments").select("*").eq("class_id", student.class_id).order("due_date"),
          supabase.from("grades").select("*").eq("student_id", student.id),
        ]);

        const gradeByAssignment: Record<string, Grade> = {};
        for (const g of (grades as Grade[]) ?? []) {
          gradeByAssignment[g.assignment_id] = g;
        }

        const enriched = ((assignments as Assignment[]) ?? []).map((a) => ({
          ...a,
          grade: gradeByAssignment[a.id] ?? null,
        }));

        const scored = enriched
          .map((a) => a.grade?.score)
          .filter((s): s is number => s !== null && s !== undefined);

        const avg = scored.length
          ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
          : null;

        return { cls: cls as Class, assignments: enriched, avg };
      })
    );

    setReport(reports);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500 text-sm mb-4">
          Enter your child&apos;s name to view their grades.
        </p>
        <form onSubmit={search} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student name"
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-forest text-white text-sm font-medium rounded-lg hover:bg-forest-light disabled:opacity-50 transition-colors"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
      </div>

      {notFound && (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
          No student found matching &ldquo;{query}&rdquo;.
        </div>
      )}

      {studentName && report.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {studentName}
              <span className="ml-2 text-sm font-normal text-gray-400">
                {report.length} {report.length === 1 ? "class" : "classes"}
              </span>
            </h2>

            {report.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setActiveClass("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeClass === "all"
                      ? "bg-forest text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  All
                </button>
                {report.map(({ cls }) => (
                  <button
                    key={cls?.id}
                    onClick={() => setActiveClass(cls?.id ?? "all")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeClass === cls?.id
                        ? "bg-forest text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {cls?.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {report.filter(({ cls }) => activeClass === "all" || cls?.id === activeClass).map(({ cls, assignments, avg }) => (
            <div key={cls?.id ?? "unknown"} className="card rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{cls?.name ?? "Unknown Class"}</h3>
                {avg !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Average:</span>
                    <span className="font-semibold text-gray-900">{avg}</span>
                    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${gradeChip(letterGrade(avg))}`}>
                      {letterGrade(avg)}
                    </span>
                  </div>
                )}
              </div>

              {!assignments.length ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                  No assignments yet.
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-gray-500 border-b border-gray-100">
                        Assignment
                      </th>
                      <th className="text-center px-5 py-3 font-medium text-gray-500 border-b border-gray-100">
                        Due Date
                      </th>
                      <th className="text-center px-5 py-3 font-medium text-gray-500 border-b border-gray-100">
                        Score
                      </th>
                      <th className="text-center px-5 py-3 font-medium text-gray-500 border-b border-gray-100">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const score = a.grade?.score ?? null;
                      const letter = score !== null ? letterGrade(score) : null;
                      return (
                        <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-800">{a.name}</td>
                          <td className="px-5 py-3 text-center text-gray-500">
                            {new Date(a.due_date + "T00:00:00").toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-center text-gray-700">
                            {score !== null ? score : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {letter ? (
                              <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${gradeChip(letter)}`}>{letter}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

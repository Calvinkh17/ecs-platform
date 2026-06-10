"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { letterGrade, gradeChip } from "@/lib/grades";
import type { Assignment, Grade, Class, SchoolStudent } from "@/lib/types";

interface ClassReport {
  cls: Class | null;
  assignments: (Assignment & { grade: Grade | null })[];
  avg: number | null;
}

export interface ChildData {
  schoolStudent: SchoolStudent;
  classes: ClassReport[];
}

interface Props {
  childrenData: ChildData[];
}

function GradeTable({ classes }: { classes: ClassReport[] }) {
  const [activeClass, setActiveClass] = useState<string>("all");

  const visible = classes.filter(({ cls }) => activeClass === "all" || cls?.id === activeClass);

  return (
    <div className="space-y-6">
      {classes.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveClass("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeClass === "all" ? "bg-forest text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          {classes.map(({ cls }) => (
            <button
              key={cls?.id}
              onClick={() => setActiveClass(cls?.id ?? "all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeClass === cls?.id ? "bg-forest text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cls?.name}
            </button>
          ))}
        </div>
      )}

      {visible.map(({ cls, assignments, avg }) => (
        <div key={cls?.id ?? "unknown"} className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{cls?.name ?? "Unknown Class"}</h3>
            {avg !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Average:</span>
                <span className="font-semibold text-gray-900">{avg}</span>
                <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${gradeChip(letterGrade(avg))}`}>{letterGrade(avg)}</span>
              </div>
            )}
          </div>
          {!assignments.length ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">No assignments yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">Assignment</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">Due Date</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">Score</th>
                  <th className="text-center px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">Grade</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => {
                  const score = a.grade?.score ?? null;
                  const letter = score !== null ? letterGrade(score) : null;
                  return (
                    <tr key={a.id} className={`border-b border-gray-50 last:border-0 hover:bg-blue-50/20 transition-colors ${idx % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{a.name}</td>
                      <td className="px-5 py-3 text-center text-gray-500">
                        {new Date(a.due_date + "T00:00:00").toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-700 font-medium">
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
  );
}

const PrintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

function PrintDropdown({ childrenData }: { childrenData: ChildData[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allIds = childrenData.map(c => c.schoolStudent.id).join(",");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        <PrintIcon />
        Print Homework Sheet
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
          {childrenData.map(c => (
            <Link
              key={c.schoolStudent.id}
              href={`/print/${c.schoolStudent.id}`}
              target="_blank"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <PrintIcon />
              Print {c.schoolStudent.name}&apos;s Sheet
            </Link>
          ))}
          <div className="border-t border-gray-100" />
          <Link
            href={`/print/all?students=${allIds}`}
            target="_blank"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <PrintIcon />
            Print All Sheets
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ParentView({ childrenData }: Props) {
  const [activeChild, setActiveChild] = useState(0);

  if (childrenData.length === 0) {
    return (
      <div className="card text-center py-20 rounded-xl">
        <svg className="mx-auto mb-3 text-gray-300" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p className="text-sm font-medium text-gray-400">No students linked yet</p>
        <p className="text-xs text-gray-300 mt-1">Contact your school administrator to link your children.</p>
      </div>
    );
  }

  const child = childrenData[activeChild];

  return (
    <div className="space-y-6">
      {/* Child selector — only shown if multiple children */}
      {childrenData.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 mr-1">Viewing:</span>
          {childrenData.map((c, i) => (
            <button
              key={c.schoolStudent.id}
              onClick={() => setActiveChild(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeChild === i ? "bg-forest text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {c.schoolStudent.name}
            </button>
          ))}
        </div>
      )}

      {/* Child header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{child.schoolStudent.name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {child.schoolStudent.grade_level === "K" ? "Kindergarten" : child.schoolStudent.grade_level === "Graduated" ? "Graduated" : `Grade ${child.schoolStudent.grade_level}`}
            {" · "}
            {child.classes.length} {child.classes.length === 1 ? "class" : "classes"}
          </p>
        </div>
        {childrenData.length === 1 ? (
          <Link
            href={`/print/${child.schoolStudent.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <PrintIcon />
            Print Homework Sheet
          </Link>
        ) : (
          <PrintDropdown childrenData={childrenData} />
        )}
      </div>

      {child.classes.length === 0 ? (
        <div className="card text-center py-14 rounded-xl">
          <svg className="mx-auto mb-3 text-gray-300" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <p className="text-sm font-medium text-gray-400">Not enrolled in any classes yet</p>
          <p className="text-xs text-gray-300 mt-1">Contact your teacher or administrator for enrollment.</p>
        </div>
      ) : (
        <GradeTable classes={child.classes} />
      )}
    </div>
  );
}

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
        <div key={cls?.id ?? "unknown"} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">{cls?.name ?? "Unknown Class"}</h3>
            {avg !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Average:</span>
                <span className="font-semibold text-gray-900">{avg}</span>
                <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${gradeChip(letterGrade(avg))}`}>{letterGrade(avg)}</span>
              </div>
            )}
          </div>
          {!assignments.length ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No assignments yet.</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500 border-b border-gray-100">Assignment</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500 border-b border-gray-100">Due Date</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500 border-b border-gray-100">Score</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500 border-b border-gray-100">Grade</th>
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
      <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
        No students linked to your account yet. Contact your administrator.
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
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
          This student is not enrolled in any classes yet.
        </div>
      ) : (
        <GradeTable classes={child.classes} />
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { upsertGrade } from "@/app/actions";
import { letterGrade, gradeChip } from "@/lib/grades";
import type { Student, Assignment, Grade } from "@/lib/types";

interface Props {
  students: Student[];
  assignments: Assignment[];
  gradeMap: Record<string, Record<string, Grade>>;
}

function GradeRow({
  student,
  assignment,
  initialScore,
  index,
}: {
  student: Student;
  assignment: Assignment;
  initialScore: number | null;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState<string>(initialScore !== null ? String(initialScore) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayed = score === "" ? null : Number(score);
  const letter = displayed !== null ? letterGrade(displayed) : null;

  async function commit() {
    setEditing(false);
    const fd = new FormData();
    fd.append("assignment_id", assignment.id);
    fd.append("student_id", student.id);
    fd.append("score", score);
    await upsertGrade(fd);
  }

  return (
    <div className={`flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50/20 transition-colors ${index % 2 === 0 ? "" : "bg-gray-50/30"}`}>
      <span className="text-sm font-medium text-gray-800">{student.name}</span>
      <div className="flex items-center gap-3">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-20 px-2 py-1 text-sm text-center border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
            className="w-20 px-2 py-1 text-sm text-center border border-rule rounded-lg hover:border-gray-400 transition-colors text-gray-700"
          >
            {displayed !== null ? displayed : <span className="text-gray-300">—</span>}
          </button>
        )}
        {letter ? (
          <span className={`inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold ${gradeChip(letter)}`}>
            {letter}
          </span>
        ) : (
          <span className="w-9 h-7 flex items-center justify-center text-sm text-gray-300">—</span>
        )}
      </div>
    </div>
  );
}

export default function GradebookSection({ students, assignments, gradeMap }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string>(() => {
    const fromUrl = searchParams.get("assignment") ?? "";
    return assignments.some(a => a.id === fromUrl) ? fromUrl : (assignments[0]?.id ?? "");
  });

  function selectAssignment(id: string) {
    setSelected(id);
    router.replace(`?assignment=${id}`, { scroll: false });
  }
  const [studentQuery, setStudentQuery] = useState("");
  const [studentSelected, setStudentSelected] = useState<Student | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const studentInputRef = useRef<HTMLInputElement>(null);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  const filteredStudentOptions = students.filter((s) =>
    s.name.toLowerCase().includes(studentQuery.toLowerCase())
  );
  const visibleStudents = studentSelected ? [studentSelected] : students;

  function selectStudent(s: Student) {
    setStudentSelected(s);
    setStudentQuery(s.name);
    setDropdownOpen(false);
  }

  function clearStudent() {
    setStudentSelected(null);
    setStudentQuery("");
    studentInputRef.current?.focus();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(e.target as Node) &&
        !studentInputRef.current?.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!students.length || !assignments.length) {
    return (
      <div className="card text-center py-14 text-gray-400 rounded-xl text-sm">
        <svg className="mx-auto mb-3 text-gray-200" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
        </svg>
        <p className="font-medium text-gray-400">
          {!students.length && !assignments.length
            ? "Add students and assignments to start grading."
            : !students.length
            ? "Add students to start grading."
            : "Add assignments to start grading."}</p>
      </div>
    );
  }

  const assignment = assignments.find((a) => a.id === selected) ?? assignments[0];

  const scores = students
    .map((s) => gradeMap[s.id]?.[assignment.id]?.score ?? null)
    .filter((v): v is number => v !== null);
  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
  const avgLetter = avg !== null ? letterGrade(avg) : null;

  return (
    <div className="flex gap-4 items-start">
      {/* Assignment list */}
      <div className="card w-56 flex-shrink-0 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-rule bg-gray-50">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Assignments</span>
        </div>
        <ul>
          {assignments.map((a) => {
            const aScores = students
              .map((s) => gradeMap[s.id]?.[a.id]?.score ?? null)
              .filter((v): v is number => v !== null);
            const aAvg = aScores.length
              ? Math.round(aScores.reduce((x, y) => x + y, 0) / aScores.length)
              : null;
            const aLetter = aAvg !== null ? letterGrade(aAvg) : null;
            const isActive = a.id === assignment.id;

            return (
              <li key={a.id}>
                <button
                  onClick={() => selectAssignment(a.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                    isActive ? "bg-forest text-white" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-gray-800"}`}>
                    {a.name}
                  </div>
                  <div className={`text-xs mt-0.5 flex items-center justify-between ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                    <span>{new Date(a.due_date + "T00:00:00").toLocaleDateString()}</span>
                    {aLetter && (
                      <span className={isActive ? "text-gray-200" : gradeChip(aLetter).split(" ")[0]}>
                        {aLetter}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Assignment detail */}
      <div className="card flex-1 rounded-xl overflow-hidden">
        {/* Header with average widget */}
        <div className="px-5 py-4 border-b border-rule flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{assignment.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Due {new Date(assignment.due_date + "T00:00:00").toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {scores.length} of {students.length} graded
            </p>
          </div>

          {/* Average widget */}
          <div className="flex-shrink-0 w-24 h-24 rounded-xl flex flex-col items-center justify-center bg-gray-50" style={{ border: "1px solid #E5E0D8" }}>
            {avg !== null && avgLetter ? (
              <>
                <span className="text-2xl font-bold text-gray-900">{avg}</span>
                <span className={`inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold mt-1 ${gradeChip(avgLetter)}`}>
                  {avgLetter}
                </span>
                <span className="text-[10px] text-gray-400 mt-1">class avg</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-gray-300">—</span>
                <span className="text-[10px] text-gray-400 mt-1">class avg</span>
              </>
            )}
          </div>
        </div>

        {/* Student filter combobox */}
        <div className="px-5 py-3 border-b border-rule">
          <div className="relative w-64">
            <div className="flex items-center border border-rule rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-gold focus-within:border-transparent">
              <input
                ref={studentInputRef}
                type="text"
                value={studentQuery}
                placeholder="Filter by student…"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                onChange={(e) => { setStudentQuery(e.target.value); setStudentSelected(null); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
              />
              {studentQuery ? (
                <button onClick={clearStudent} className="px-2.5 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              ) : (
                <span className="px-2.5 text-gray-400 text-sm">▾</span>
              )}
            </div>
            {dropdownOpen && filteredStudentOptions.length > 0 && (
              <div ref={studentDropdownRef} className="absolute z-10 mt-1 w-full bg-white border border-rule rounded-lg shadow-lg overflow-hidden">
                {filteredStudentOptions.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => { e.preventDefault(); selectStudent(s); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${studentSelected?.id === s.id ? "bg-gray-50 font-medium" : "text-gray-700"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {dropdownOpen && filteredStudentOptions.length === 0 && studentQuery && (
              <div ref={studentDropdownRef} className="absolute z-10 mt-1 w-full bg-white border border-rule rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                No students match &ldquo;{studentQuery}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Student list */}
        <div className="divide-y divide-gray-50">
          <div className="flex items-center justify-between px-5 py-2 bg-gray-50 border-b border-rule">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Student</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Score / Grade</span>
          </div>
          {visibleStudents.map((s, i) => (
            <GradeRow
              key={`${s.id}-${assignment.id}`}
              student={s}
              assignment={assignment}
              initialScore={gradeMap[s.id]?.[assignment.id]?.score ?? null}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

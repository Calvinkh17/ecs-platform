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
    <div className={`flex items-center justify-between px-5 py-3 border-b border-border last:border-0 hover:bg-accent/5 transition-colors ${index % 2 === 0 ? "" : "bg-surface/50"}`}>
      <span className="text-sm font-medium text-primary">{student.name}</span>
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
            className="w-20 px-2 py-1 text-sm text-center border border-accent/40 bg-surface-raised text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
            className="w-20 px-2 py-1 text-sm text-center border border-border bg-surface-raised rounded-md hover:border-border-strong transition-colors text-secondary"
          >
            {displayed !== null ? displayed : <span className="text-muted">—</span>}
          </button>
        )}
        {letter ? (
          <span className={`inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold ${gradeChip(letter)}`}>
            {letter}
          </span>
        ) : (
          <span className="w-9 h-7 flex items-center justify-center text-sm text-muted">—</span>
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
      <div className="card text-center py-14 text-muted rounded-xl text-sm">
        <svg className="mx-auto mb-3 text-border-strong" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
        </svg>
        <p className="font-medium">
          {!students.length && !assignments.length
            ? "Add students and assignments to start grading."
            : !students.length
            ? "Add students to start grading."
            : "Add assignments to start grading."}
        </p>
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
        <div className="px-4 py-3 border-b border-border bg-surface">
          <span className="text-xs font-semibold text-muted">Assignments</span>
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
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors ${
                    isActive ? "bg-accent text-white" : "hover:bg-surface text-secondary"
                  }`}
                >
                  <div className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-primary"}`}>
                    {a.name}
                  </div>
                  <div className={`text-xs mt-0.5 flex items-center justify-between ${isActive ? "text-white/60" : "text-muted"}`}>
                    <span>{new Date(a.due_date + "T00:00:00").toLocaleDateString()}</span>
                    {aLetter && (
                      <span className={isActive ? "text-white/80" : ""}>
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
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-primary">{assignment.name}</h3>
            <p className="text-xs text-muted mt-0.5">
              Due {new Date(assignment.due_date + "T00:00:00").toLocaleDateString()}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {scores.length} of {students.length} graded
            </p>
          </div>

          {/* Average widget */}
          <div className="flex-shrink-0 w-24 h-24 rounded-xl flex flex-col items-center justify-center bg-surface border border-border">
            {avg !== null && avgLetter ? (
              <>
                <span className="text-2xl font-bold text-primary">{avg}</span>
                <span className={`inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold mt-1 ${gradeChip(avgLetter)}`}>
                  {avgLetter}
                </span>
                <span className="text-[10px] text-muted mt-1">class avg</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-muted">—</span>
                <span className="text-[10px] text-muted mt-1">class avg</span>
              </>
            )}
          </div>
        </div>

        {/* Student filter combobox */}
        <div className="px-5 py-3 border-b border-border">
          <div className="relative w-64">
            <div className="flex items-center border border-border bg-surface-raised rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-accent/40">
              <input
                ref={studentInputRef}
                type="text"
                value={studentQuery}
                placeholder="Filter by student…"
                className="flex-1 px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none bg-transparent"
                onChange={(e) => { setStudentQuery(e.target.value); setStudentSelected(null); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
              />
              {studentQuery ? (
                <button onClick={clearStudent} className="px-2.5 text-muted hover:text-secondary text-lg leading-none">×</button>
              ) : (
                <span className="px-2.5 text-muted text-sm">▾</span>
              )}
            </div>
            {dropdownOpen && filteredStudentOptions.length > 0 && (
              <div ref={studentDropdownRef} className="absolute z-10 mt-1 w-full bg-surface-raised border border-border rounded-lg shadow-elevated overflow-hidden">
                {filteredStudentOptions.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => { e.preventDefault(); selectStudent(s); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-surface transition-colors ${studentSelected?.id === s.id ? "bg-surface font-medium text-primary" : "text-secondary"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {dropdownOpen && filteredStudentOptions.length === 0 && studentQuery && (
              <div ref={studentDropdownRef} className="absolute z-10 mt-1 w-full bg-surface-raised border border-border rounded-lg shadow-elevated px-3 py-2 text-sm text-muted">
                No students match &ldquo;{studentQuery}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Student list */}
        <div>
          <div className="flex items-center justify-between px-5 py-2 bg-surface border-b border-border">
            <span className="text-xs font-semibold text-muted">Student</span>
            <span className="text-xs font-semibold text-muted">Score / Grade</span>
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

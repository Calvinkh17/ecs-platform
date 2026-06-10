"use client";

import { useRef, useState } from "react";
import { upsertGrade } from "@/app/actions";
import { letterGrade, gradeChip } from "@/lib/grades";

interface Props {
  assignmentId: string;
  studentId: string;
  initialScore: number | null;
}

export default function GradeCell({ assignmentId, studentId, initialScore }: Props) {
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState<string>(initialScore !== null ? String(initialScore) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayed = score === "" ? null : Number(score);
  const letter = displayed !== null ? letterGrade(displayed) : null;

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commit() {
    setEditing(false);
    const fd = new FormData();
    fd.append("assignment_id", assignmentId);
    fd.append("student_id", studentId);
    fd.append("score", score);
    await upsertGrade(fd);
  }

  if (editing) {
    return (
      <td className="border border-gray-100 p-0 w-24">
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
          className="w-full h-full px-2 py-1.5 text-sm text-center focus:outline-none focus:bg-blue-50"
          autoFocus
        />
      </td>
    );
  }

  return (
    <td
      className="border border-gray-100 p-2 text-center cursor-pointer hover:bg-gray-50 w-24"
      onClick={startEdit}
    >
      {displayed !== null ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm text-gray-700">{displayed}</span>
          <span className={`text-[10px] font-bold px-1 rounded ${gradeChip(letter!)}`}>{letter}</span>
        </div>
      ) : (
        <span className="text-gray-300 text-xs">—</span>
      )}
    </td>
  );
}

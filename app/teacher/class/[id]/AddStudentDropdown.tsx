"use client";

import { useState, useRef, useEffect } from "react";
import { addStudent } from "@/app/actions";
import type { SchoolStudent } from "@/lib/types";

interface Props {
  classId: string;
  rosterStudents: SchoolStudent[];
}

export default function AddStudentDropdown({ classId, rosterStudents }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SchoolStudent | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = rosterStudents.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  function pick(s: SchoolStudent) {
    setSelected(s);
    setQuery(s.name);
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    inputRef.current?.focus();
  }

  async function submit() {
    if (!selected) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("class_id", classId);
    fd.append("school_student_id", selected.id);
    fd.append("name", selected.name);
    await addStudent(fd);
    setSelected(null);
    setQuery("");
    setLoading(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex gap-2 items-start">
      <div className="relative flex-1">
        <div className="flex items-center border border-border rounded-lg bg-surface-raised overflow-hidden focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-transparent">
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={rosterStudents.length ? "Search roster…" : "No students in roster yet"}
            disabled={!rosterStudents.length}
            className="flex-1 px-3 py-2 text-sm text-primary bg-transparent focus:outline-none disabled:opacity-50 placeholder:text-muted"
            onChange={e => { setQuery(e.target.value); setSelected(null); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {query ? (
            <button onClick={clear} className="px-2.5 text-muted hover:text-secondary text-lg leading-none">×</button>
          ) : (
            <span className="px-2.5 text-muted text-sm">▾</span>
          )}
        </div>
        {open && options.length > 0 && (
          <div ref={dropdownRef} className="absolute z-10 mt-1 w-full bg-surface-raised border border-border rounded-lg shadow-elevated overflow-hidden max-h-48 overflow-y-auto">
            {options.map(s => (
              <button
                key={s.id}
                onMouseDown={e => { e.preventDefault(); pick(s); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface transition-colors"
              >
                <span className="font-medium text-primary">{s.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {s.grade_level === "K" ? "K" : `Gr. ${s.grade_level}`} · Grad. {s.graduating_year}
                </span>
              </button>
            ))}
          </div>
        )}
        {open && options.length === 0 && query && (
          <div ref={dropdownRef} className="absolute z-10 mt-1 w-full bg-surface-raised border border-border rounded-lg shadow-elevated px-3 py-2 text-sm text-muted">
            No matches for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
      <button
        onClick={submit}
        disabled={!selected || loading}
        className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Adding…" : "Add"}
      </button>
    </div>
  );
}

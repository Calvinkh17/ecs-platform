"use client";

import { useState } from "react";
import { createDisciplineRecord } from "@/app/actions";

const KEYWORDS = [
  "Self-Control",
  "Cheating",
  "Lying",
  "Blurting Out",
  "Disrespect",
  "Tardiness",
  "Other",
] as const;

interface DashboardStudent {
  id: string;
  name: string;
  classId: string;
  className: string;
  gradeLevel: string;
  schoolStudentId: string | null;
  parentEmails: { name: string; email: string }[];
}

interface Props {
  students: DashboardStudent[];
  reportedBy: string;
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

// ── Discipline Record Modal ──────────────────────────────────────────────────
function DisciplineModal({
  students,
  reportedBy,
  onClose,
}: {
  students: DashboardStudent[];
  reportedBy: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<DashboardStudent | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  function toggleKeyword(kw: string) {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedStudent) { setError("Please select a student."); return; }
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.append("student_id", selectedStudent.schoolStudentId ?? "");
    fd.append("reported_by", reportedBy);
    fd.append("keywords", JSON.stringify(selectedKeywords));
    const result = await createDisciplineRecord(fd);
    setSubmitting(false);
    if (result?.error) { setError(result.error); return; }
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onClose(); }, 1200);
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-surface-raised border border-border rounded-2xl shadow-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-semibold text-primary text-base">New Discipline Record</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors text-lg leading-none">×</button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-medium text-primary">Record submitted</p>
            <p className="text-sm text-muted mt-1">Admin has been notified.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {/* Student selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Student *</label>
              <div className="relative">
                <div className="flex items-center border border-border rounded-lg bg-surface-raised overflow-hidden focus-within:ring-2 focus-within:ring-accent/40">
                  <input
                    type="text"
                    value={selectedStudent ? selectedStudent.name : query}
                    placeholder="Search students…"
                    className="flex-1 px-3 py-2.5 text-sm text-primary bg-transparent focus:outline-none placeholder:text-muted"
                    onChange={(e) => { setQuery(e.target.value); setSelectedStudent(null); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                  />
                  {(query || selectedStudent) && (
                    <button
                      type="button"
                      onClick={() => { setQuery(""); setSelectedStudent(null); }}
                      className="px-2.5 text-muted hover:text-secondary text-lg leading-none"
                    >×</button>
                  )}
                </div>
                {dropdownOpen && filtered.length > 0 && !selectedStudent && (
                  <div className="absolute z-10 mt-1 w-full bg-surface-raised border border-border rounded-lg shadow-elevated overflow-hidden max-h-48 overflow-y-auto">
                    {filtered.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setSelectedStudent(s); setQuery(""); setDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface transition-colors"
                      >
                        <span className="font-medium text-primary">{s.name}</span>
                        <span className="ml-2 text-xs text-muted">{s.className}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {students.length === 0 && (
                <p className="text-xs text-muted">No students in your classes yet.</p>
              )}
            </div>

            {/* Event name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Event Name *</label>
              <input
                type="text"
                name="event_name"
                required
                placeholder="Brief title (e.g. Disruptive behavior during test)"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Date *</label>
              <input
                type="date"
                name="date"
                defaultValue={todayString()}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Describe what happened…"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors resize-none"
              />
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted">Keywords</label>
              <div className="flex flex-wrap gap-2">
                {KEYWORDS.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggleKeyword(kw)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      selectedKeywords.includes(kw)
                        ? "bg-accent text-white border-accent"
                        : "border-border text-secondary hover:border-border-strong hover:text-primary"
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit Record"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-border text-secondary text-sm font-medium rounded-lg hover:bg-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Admin Visit Modal ────────────────────────────────────────────────────────
function AdminVisitModal({
  reportedBy,
  onClose,
}: {
  reportedBy: string;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.append("reported_by", reportedBy);
    fd.append("keywords", JSON.stringify([]));
    const result = await createDisciplineRecord(fd);
    setSubmitting(false);
    if (result?.error) { setError(result.error); return; }
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onClose(); }, 1200);
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-surface-raised border border-border rounded-2xl shadow-elevated w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-semibold text-primary text-base">Request Admin Visit</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors text-lg leading-none">×</button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-medium text-primary">Request sent</p>
            <p className="text-sm text-muted mt-1">An admin will follow up shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            <input type="hidden" name="event_name" value="Admin Visit Request" />
            <input type="hidden" name="date" value={todayString()} />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Reason for visit *</label>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Describe the situation or reason you need admin support…"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors resize-none"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send Request"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-border text-secondary text-sm font-medium rounded-lg hover:bg-surface transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function QuickActions({ students, reportedBy }: Props) {
  const [modal, setModal] = useState<"discipline" | "visit" | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setModal("discipline")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          New Discipline Record
        </button>
        <button
          onClick={() => setModal("visit")}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-secondary text-sm font-medium rounded-lg hover:bg-surface hover:text-primary transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Request Admin Visit
        </button>
      </div>

      {modal === "discipline" && (
        <DisciplineModal
          students={students}
          reportedBy={reportedBy}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "visit" && (
        <AdminVisitModal
          reportedBy={reportedBy}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

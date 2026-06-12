"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateDisciplineRecord } from "@/app/actions";
import type { DisciplineRecord, DisciplineKeyword, DisciplineStatus } from "@/lib/types";
import { SectionLabel } from "@/components/ui/SectionLabel";

const KEYWORDS: DisciplineKeyword[] = [
  "Self-Control", "Cheating", "Lying", "Blurting Out", "Disrespect", "Tardiness", "Other",
];

const STATUS_OPTIONS: { value: DisciplineStatus; label: string; color: string }[] = [
  { value: "open",        label: "Open",        color: "bg-amber-100 text-amber-700" },
  { value: "in_progress", label: "In Progress",  color: "bg-blue-100 text-blue-700" },
  { value: "resolved",    label: "Resolved",     color: "bg-emerald-100 text-emerald-700" },
];

function statusBadge(status: DisciplineStatus) {
  const s = STATUS_OPTIONS.find((x) => x.value === status);
  return s ? (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.color}`}>{s.label}</span>
  ) : null;
}

interface EnrichedRecord extends DisciplineRecord {
  student_name?: string;
  reporter_name?: string;
  handler_name?: string;
}

interface AppUser { id: string; name: string; email: string; role: string; }

interface Props {
  initialRecords: EnrichedRecord[];
  users: AppUser[];
  studentMap: Record<string, string>;
}

export default function DisciplineTab({ initialRecords, users, studentMap }: Props) {
  const [records, setRecords] = useState<EnrichedRecord[]>(initialRecords);
  const [statusFilter, setStatusFilter] = useState<DisciplineStatus | "">("");
  const [keywordFilter, setKeywordFilter] = useState<DisciplineKeyword | "">("");
  const [studentSearch, setStudentSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Realtime subscription — new records appear instantly
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("discipline-admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "discipline_records" }, (payload) => {
        const newRec = payload.new as DisciplineRecord;
        setRecords((prev) =>
          prev.some((r) => r.id === newRec.id)
            ? prev
            : [{ ...newRec, student_name: studentMap[newRec.student_id ?? ""], reporter_name: undefined }, ...prev]
        );
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "discipline_records" }, (payload) => {
        const updated = payload.new as DisciplineRecord;
        setRecords((prev) => prev.map((r) => r.id === updated.id ? { ...r, ...updated } : r));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [studentMap]);

  const filtered = records.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (keywordFilter && !r.keywords.includes(keywordFilter)) return false;
    if (studentSearch && !(r.student_name ?? "").toLowerCase().includes(studentSearch.toLowerCase())) return false;
    return true;
  });

  // Keyword frequency (this month)
  const now = new Date();
  const thisMonth = records.filter((r) => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const kwCounts: Record<string, number> = {};
  for (const r of thisMonth) {
    for (const kw of r.keywords) {
      kwCounts[kw] = (kwCounts[kw] ?? 0) + 1;
    }
  }
  const maxCount = Math.max(1, ...Object.values(kwCounts));

  const adminUsers = users.filter((u) => u.role === "admin");
  const selectCls = "h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";

  async function handleUpdate(id: string, status: string, handled_by: string) {
    setSaving(id);
    const fd = new FormData();
    fd.append("id", id);
    fd.append("status", status);
    fd.append("handled_by", handled_by);
    await updateDisciplineRecord(fd);
    setSaving(null);
  }

  return (
    <div className="space-y-8">
      {/* Keyword frequency chart */}
      {thisMonth.length > 0 && (
        <section className="card rounded-xl p-5">
          <SectionLabel>Keyword Frequency — This Month</SectionLabel>
          <div className="space-y-2.5 mt-1">
            {KEYWORDS.filter((kw) => kwCounts[kw] > 0)
              .sort((a, b) => (kwCounts[b] ?? 0) - (kwCounts[a] ?? 0))
              .map((kw) => (
                <div key={kw} className="flex items-center gap-3">
                  <span className="text-xs text-secondary w-28 flex-shrink-0">{kw}</span>
                  <div className="flex-1 bg-surface rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 bg-accent/80 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(6, (kwCounts[kw] / maxCount) * 100)}%` }}
                    >
                      <span className="text-[10px] text-white font-bold">{kwCounts[kw]}</span>
                    </div>
                  </div>
                </div>
              ))}
            {Object.keys(kwCounts).length === 0 && (
              <p className="text-sm text-muted">No keywords recorded this month.</p>
            )}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DisciplineStatus | "")} className={selectCls}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={keywordFilter} onChange={(e) => setKeywordFilter(e.target.value as DisciplineKeyword | "")} className={selectCls}>
          <option value="">All keywords</option>
          {KEYWORDS.map((kw) => <option key={kw} value={kw}>{kw}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search by student…"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
        />
        {(statusFilter || keywordFilter || studentSearch) && (
          <button onClick={() => { setStatusFilter(""); setKeywordFilter(""); setStudentSearch(""); }} className="text-xs text-muted hover:text-secondary">Clear</button>
        )}
        <span className="ml-auto text-xs text-muted">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="card rounded-xl text-center py-14">
          <p className="text-sm text-muted">
            {records.length === 0 ? "No discipline records yet." : "No records match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rec) => {
            const isExpanded = expandedId === rec.id;
            const isAdminVisit = rec.event_name === "Admin Visit Request";
            return (
              <div key={rec.id} className="card rounded-xl overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-surface/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-primary text-sm">{rec.event_name}</span>
                      {isAdminVisit && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">Visit Request</span>
                      )}
                      {statusBadge(rec.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                      {rec.student_name && <span>Student: {rec.student_name}</span>}
                      {rec.reporter_name && <span>Reported by: {rec.reporter_name}</span>}
                      <span>{new Date(rec.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    {rec.keywords.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {rec.keywords.map((kw) => (
                          <span key={kw} className="px-1.5 py-0.5 rounded text-[10px] bg-surface text-muted border border-border">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-muted flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4 bg-surface/30">
                    {rec.description && (
                      <div>
                        <p className="text-xs font-semibold text-muted mb-1">Description</p>
                        <p className="text-sm text-secondary whitespace-pre-wrap">{rec.description}</p>
                      </div>
                    )}
                    {/* Handler + status update */}
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted">Assign Handler</label>
                        <select
                          defaultValue={rec.handled_by ?? ""}
                          onChange={(e) => handleUpdate(rec.id, rec.status, e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Unassigned</option>
                          {adminUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted">Status</label>
                        <select
                          defaultValue={rec.status}
                          onChange={(e) => handleUpdate(rec.id, e.target.value, rec.handled_by ?? "")}
                          className={selectCls}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      {saving === rec.id && <span className="text-xs text-muted pb-1">Saving…</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

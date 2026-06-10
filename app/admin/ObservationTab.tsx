"use client";

import { useState, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createObservation, saveObservation, deleteObservation } from "@/app/actions";
import { RUBRIC, ALL_POINT_KEYS, TOTAL_POINTS } from "@/lib/rubric";
import type { Observation, ObservationResponse } from "@/lib/types";
import { SectionLabel } from "@/components/ui/SectionLabel";

const ORDINALS = ["", "1st", "2nd", "3rd", "4th"] as const;
type Status = "observed" | "not_observed" | "na";

interface Teacher { id: string; name: string; email: string; }
interface Props { teachers: Teacher[]; initialObservations: Observation[]; initialResponses: ObservationResponse[]; }
interface ActiveObs { id: string; teacherId: string; teacherName: string; number: number; date: string; }

function initResponses(): Record<string, Status> {
  return Object.fromEntries(ALL_POINT_KEYS.map(k => [k, "observed" as Status]));
}

function computeScore(obsId: string, responses: ObservationResponse[]): number {
  return responses.filter(r => r.observation_id === obsId && r.status === "observed").length;
}

function PointRow({ index, text, status, onChange }: { index: number; text: string; status: Status; onChange: (s: Status) => void }) {
  const buttons: { s: Status; label: string; active: string }[] = [
    { s: "observed",     label: "Observed",     active: "bg-green-600 text-white border-green-600" },
    { s: "not_observed", label: "Not Observed",  active: "bg-red-500 text-white border-red-500"    },
    { s: "na",           label: "N/A",           active: "bg-muted text-white border-muted"        },
  ];
  return (
    <div className="py-3.5 border-b border-border last:border-0">
      <p className="text-sm text-primary mb-2.5 leading-snug">
        <span className="text-muted mr-1">{index}.</span>{text}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {buttons.map(({ s, label, active }) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`py-3 px-1 rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${
              status === s ? active : "border-border text-muted bg-surface-raised active:bg-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LawCard({ law, responses, onChange }: { law: typeof RUBRIC[0]; responses: Record<string, Status>; onChange: (key: string, s: Status) => void }) {
  const observed = law.points.filter(p => responses[p.key] === "observed").length;
  const allDone = observed === law.points.length;
  const none = observed === 0 && law.points.every(p => responses[p.key] === "na");
  return (
    <div className="card rounded-xl overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div>
          <p className="text-xs font-semibold text-muted">Law {law.number}</p>
          <h3 className="text-sm font-bold text-primary mt-0.5">{law.title}</h3>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className={`text-xl font-bold ${allDone ? "text-green-600" : none ? "text-muted" : "text-primary"}`}>
            {observed}/{law.points.length}
          </p>
          <p className="text-xs text-muted leading-none mt-0.5">observed</p>
        </div>
      </div>
      <div className="px-4">
        {law.points.map((p, i) => (
          <PointRow key={p.key} index={i + 1} text={p.text} status={responses[p.key] ?? "observed"} onChange={s => onChange(p.key, s)} />
        ))}
      </div>
    </div>
  );
}

function PatternAnalysis({ teacherObs, allResponses }: { teacherObs: Observation[]; allResponses: ObservationResponse[] }) {
  if (teacherObs.length < 2) return null;
  type Gap = { key: string; text: string; lawNum: number; lawTitle: string; count: number };
  const gaps: Gap[] = [];
  for (const law of RUBRIC) {
    for (const point of law.points) {
      const count = teacherObs.filter(obs =>
        allResponses.some(r => r.observation_id === obs.id && r.point_key === point.key && r.status === "not_observed")
      ).length;
      if (count >= 2) gaps.push({ key: point.key, text: point.text, lawNum: law.number, lawTitle: law.title, count });
    }
  }
  if (gaps.length === 0) {
    return (
      <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        No consistent gaps found across {teacherObs.length} observations.
      </div>
    );
  }
  return (
    <div className="bg-surface-raised border border-danger/20 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-danger-faint border-b border-danger/20">
        <h3 className="text-sm font-semibold text-danger">Consistent Gaps ({gaps.length})</h3>
        <p className="text-xs text-danger/70 mt-0.5">Marked "Not Observed" in 2 or more of {teacherObs.length} observations</p>
      </div>
      <ul className="divide-y divide-border">
        {gaps.sort((a, b) => b.count - a.count).map(g => (
          <li key={g.key} className="px-4 py-3">
            <p className="text-sm text-primary">{g.text}</p>
            <p className="text-xs text-muted mt-0.5">Law {g.lawNum} — {g.lawTitle} · not observed in {g.count}/{teacherObs.length} observations</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const selectCls = "h-9 px-3 rounded-md border border-border bg-surface-raised text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors";

export default function ObservationTab({ teachers, initialObservations, initialResponses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resumingId = searchParams.get("resuming") ?? "";
  const resumingObs = resumingId ? initialObservations.find(o => o.id === resumingId) : null;
  const canResume = resumingObs != null && !initialResponses.some(r => r.observation_id === resumingId);

  const [view, setView] = useState<"list" | "form">(() => canResume ? "form" : "list");
  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  const [allResponses, setAllResponses] = useState<ObservationResponse[]>(initialResponses);
  const [activeObs, setActiveObs] = useState<ActiveObs | null>(() => {
    if (!canResume || !resumingObs) return null;
    const teacher = teachers.find(t => t.id === resumingObs.teacher_id);
    return { id: resumingObs.id, teacherId: resumingObs.teacher_id, teacherName: teacher?.name || teacher?.email || "Unknown", number: resumingObs.observation_number, date: resumingObs.date };
  });

  const [responses, setResponses] = useState<Record<string, Status>>(initResponses);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [teacherSelect, setTeacherSelect] = useState("");
  const [obsNumSelect, setObsNumSelect] = useState("");
  const [dateSelect, setDateSelect] = useState(() => new Date().toISOString().split("T")[0]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const [historyTeacherId, setHistoryTeacherId] = useState<string>(() => searchParams.get("teacher") ?? "");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalObserved = ALL_POINT_KEYS.filter(k => responses[k] === "observed").length;
  const pct = Math.round((totalObserved / TOTAL_POINTS) * 100);

  function setResponse(key: string, s: Status) { setResponses(prev => ({ ...prev, [key]: s })); }

  function changeHistoryTeacher(id: string) {
    setHistoryTeacherId(id);
    setExpandedId(null);
    const params = new URLSearchParams(searchParams.toString());
    if (id) { params.set("teacher", id); } else { params.delete("teacher"); }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function openForm(obs: ActiveObs) {
    setActiveObs(obs); setResponses(initResponses()); setNotes(""); setSaveError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("resuming", obs.id);
    router.replace(`?${params.toString()}`, { scroll: false });
    setView("form");
  }

  function closeForm() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("resuming");
    router.replace(`?${params.toString()}`, { scroll: false });
    setView("list"); setActiveObs(null);
  }

  async function startObservation() {
    if (!teacherSelect || !obsNumSelect) { setStartError("Select a teacher and observation number."); return; }
    setStarting(true); setStartError("");
    const fd = new FormData();
    fd.append("teacher_id", teacherSelect); fd.append("observation_number", obsNumSelect); fd.append("date", dateSelect);
    const result = await createObservation(fd);
    setStarting(false);
    if (result.error || !result.id) { setStartError(result.error ?? "Failed to start observation."); return; }
    const teacher = teachers.find(t => t.id === teacherSelect);
    openForm({ id: result.id, teacherId: teacherSelect, teacherName: teacher?.name || teacher?.email || "Unknown", number: parseInt(obsNumSelect), date: dateSelect });
  }

  async function handleSave() {
    if (!activeObs) return;
    setSaving(true); setSaveError("");
    const fd = new FormData();
    fd.append("observation_id", activeObs.id); fd.append("notes", notes);
    fd.append("responses", JSON.stringify(Object.entries(responses).map(([point_key, status]) => ({ point_key, status }))));
    const result = await saveObservation(fd);
    setSaving(false);
    if (result.error) { setSaveError(result.error); return; }

    const newObs: Observation = { id: activeObs.id, teacher_id: activeObs.teacherId, observer_id: "", observation_number: activeObs.number, date: activeObs.date, notes: notes.trim() || null, created_at: new Date().toISOString() };
    const newResps: ObservationResponse[] = Object.entries(responses).map(([point_key, status]) => ({ id: crypto.randomUUID(), observation_id: activeObs.id, point_key, status, created_at: new Date().toISOString() }));
    setObservations(prev => [newObs, ...prev]);
    setAllResponses(prev => [...prev, ...newResps]);
    setHistoryTeacherId(activeObs.teacherId); setExpandedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("teacher", activeObs.teacherId); params.delete("resuming");
    router.replace(`?${params.toString()}`, { scroll: false });
    setActiveObs(null); setView("list");
  }

  if (view === "form" && activeObs) {
    const scoreColor = totalObserved >= 18 ? "text-green-600" : totalObserved >= 12 ? "text-yellow-600" : "text-danger";
    return (
      <div>
        <div className="sticky top-0 z-20 bg-surface-raised border-b border-border px-4 py-3 flex items-center justify-between shadow-sm rounded-xl mb-4">
          <div className="min-w-0">
            <p className="text-xs text-muted truncate">{ORDINALS[activeObs.number]} Observation</p>
            <p className="text-sm font-bold text-primary truncate">{activeObs.teacherName}</p>
            <p className="text-xs text-muted">{new Date(activeObs.date + "T00:00:00").toLocaleDateString()}</p>
          </div>
          <div className="text-center px-4 flex-shrink-0">
            <p className={`text-3xl font-bold ${scoreColor}`}>{totalObserved}/{TOTAL_POINTS}</p>
            <p className="text-xs text-muted mt-0.5">{pct}% observed</p>
          </div>
          <button onClick={() => { if (confirm("Leave this observation? You can resume it from the history list.")) closeForm(); }} className="text-xs text-muted hover:text-secondary px-3 py-1.5 border border-border rounded-md flex-shrink-0 transition-colors">
            Cancel
          </button>
        </div>

        {RUBRIC.map(law => (
          <LawCard key={law.number} law={law} responses={responses} onChange={setResponse} />
        ))}

        <div className="card rounded-xl p-4 mb-4">
          <SectionLabel>Observer Notes</SectionLabel>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes about this observation…"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none transition-colors"
          />
        </div>

        {saveError && <p className="text-sm text-danger mb-3 px-1">{saveError}</p>}

        <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 text-base mb-8">
          {saving ? "Saving…" : "Save Observation"}
        </button>
      </div>
    );
  }

  const historyObs = historyTeacherId
    ? observations.filter(o => o.teacher_id === historyTeacherId).sort((a, b) => a.observation_number - b.observation_number)
    : observations;

  return (
    <div className="space-y-6">
      <section className="card rounded-xl p-5">
        <SectionLabel>Start New Observation</SectionLabel>
        {teachers.length === 0 ? (
          <p className="text-sm text-muted">No teacher accounts yet. Assign the &ldquo;teacher&rdquo; role to a user first.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Teacher</label>
                <select value={teacherSelect} onChange={e => setTeacherSelect(e.target.value)} className={`${selectCls} w-56`}>
                  <option value="">Select teacher…</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Observation #</label>
                <select value={obsNumSelect} onChange={e => setObsNumSelect(e.target.value)} className={selectCls}>
                  <option value="">Number…</option>
                  {([1, 2, 3, 4] as const).map(n => <option key={n} value={n}>{ORDINALS[n]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted">Date</label>
                <input type="date" value={dateSelect} onChange={e => setDateSelect(e.target.value)} className={selectCls} />
              </div>
              <button onClick={startObservation} disabled={starting} className="h-9 px-5 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
                {starting ? "Starting…" : "Start"}
              </button>
            </div>
            {startError && <p className="mt-2 text-sm text-danger">{startError}</p>}
          </>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <SectionLabel className="mb-0">Observation History</SectionLabel>
          <select value={historyTeacherId} onChange={e => changeHistoryTeacher(e.target.value)} className={selectCls}>
            <option value="">All teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name || t.email} ({observations.filter(o => o.teacher_id === t.id).length})</option>)}
          </select>
        </div>

        {observations.length === 0 ? (
          <div className="text-center py-10 text-muted card rounded-xl text-sm">No observations yet. Start one above.</div>
        ) : historyObs.length === 0 ? (
          <div className="text-center py-10 text-muted card rounded-xl text-sm">No observations for this teacher yet.</div>
        ) : (
          <>
            <div className="card rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="text-left px-5 py-3 font-semibold text-muted text-xs">Teacher</th>
                    <th className="text-left px-5 py-3 font-semibold text-muted text-xs">Obs #</th>
                    <th className="text-left px-5 py-3 font-semibold text-muted text-xs">Date</th>
                    <th className="text-center px-5 py-3 font-semibold text-muted text-xs">Score</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {historyObs.map(obs => {
                    const teacher = teachers.find(t => t.id === obs.teacher_id);
                    const hasResponses = allResponses.some(r => r.observation_id === obs.id);
                    const score = computeScore(obs.id, allResponses);
                    const isExpanded = expandedId === obs.id;
                    const lawScores = RUBRIC.map(law => ({
                      law,
                      observed: law.points.filter(p => allResponses.some(r => r.observation_id === obs.id && r.point_key === p.key && r.status === "observed")).length,
                    }));
                    const notObservedPoints = RUBRIC.flatMap(law =>
                      law.points.filter(p => allResponses.some(r => r.observation_id === obs.id && r.point_key === p.key && r.status === "not_observed")).map(p => ({ ...p, lawNum: law.number, lawTitle: law.title }))
                    );

                    return (
                      <Fragment key={obs.id}>
                        <tr className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-primary">{teacher?.name || teacher?.email || "Unknown"}</td>
                          <td className="px-5 py-3 text-secondary">{ORDINALS[obs.observation_number]}</td>
                          <td className="px-5 py-3 text-secondary">{new Date(obs.date + "T00:00:00").toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-center">
                            {hasResponses ? (
                              <span className={`font-semibold ${score >= 18 ? "text-green-600" : score >= 14 ? "text-yellow-600" : "text-danger"}`}>{score}/{TOTAL_POINTS}</span>
                            ) : (
                              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">In Progress</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {!hasResponses && (
                                <button onClick={() => openForm({ id: obs.id, teacherId: obs.teacher_id, teacherName: teacher?.name || teacher?.email || "Unknown", number: obs.observation_number, date: obs.date })} className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">Resume</button>
                              )}
                              {hasResponses && (
                                <button onClick={() => setExpandedId(isExpanded ? null : obs.id)} className="text-xs text-muted hover:text-secondary transition-colors">{isExpanded ? "Hide" : "Details"}</button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!confirm(`Delete ${ORDINALS[obs.observation_number]} observation for ${teacher?.name ?? "this teacher"}?`)) return;
                                  const fd = new FormData(); fd.append("id", obs.id);
                                  await deleteObservation(fd);
                                  setObservations(prev => prev.filter(o => o.id !== obs.id));
                                  setAllResponses(prev => prev.filter(r => r.observation_id !== obs.id));
                                  if (expandedId === obs.id) setExpandedId(null);
                                }}
                                className="text-xs text-danger hover:text-danger/80 transition-colors"
                              >Delete</button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-border">
                            <td colSpan={5} className="px-5 py-4 bg-surface/60">
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {lawScores.map(({ law, observed }) => (
                                  <span key={law.number} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${observed === law.points.length ? "bg-green-50 text-green-700" : observed === 0 ? "bg-danger-faint text-danger" : "bg-amber-50 text-amber-700"}`}>
                                    L{law.number}: {observed}/{law.points.length}
                                  </span>
                                ))}
                              </div>
                              {notObservedPoints.length === 0 ? (
                                <p className="text-xs text-green-600">All applicable points were observed.</p>
                              ) : (
                                <div className="mb-3">
                                  <p className="text-xs font-medium text-secondary mb-1.5">Not observed:</p>
                                  <ul className="space-y-1">
                                    {notObservedPoints.map(p => (
                                      <li key={p.key} className="text-xs text-danger flex items-start gap-1.5">
                                        <span className="text-danger/50 mt-0.5 flex-shrink-0">✗</span><span>{p.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {obs.notes && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-xs font-medium text-secondary mb-1">Notes:</p>
                                  <p className="text-xs text-secondary whitespace-pre-wrap">{obs.notes}</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {historyTeacherId && historyObs.length >= 2 && (
              <div>
                <SectionLabel>Patterns — {teachers.find(t => t.id === historyTeacherId)?.name}</SectionLabel>
                <PatternAnalysis teacherObs={historyObs.filter(o => allResponses.some(r => r.observation_id === o.id))} allResponses={allResponses} />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

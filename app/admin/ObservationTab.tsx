"use client";

import { useState, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createObservation, saveObservation, deleteObservation } from "@/app/actions";
import { RUBRIC, ALL_POINT_KEYS, TOTAL_POINTS } from "@/lib/rubric";
import type { Observation, ObservationResponse } from "@/lib/types";

const ORDINALS = ["", "1st", "2nd", "3rd", "4th"] as const;
type Status = "observed" | "not_observed" | "na";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Props {
  teachers: Teacher[];
  initialObservations: Observation[];
  initialResponses: ObservationResponse[];
}

interface ActiveObs {
  id: string;
  teacherId: string;
  teacherName: string;
  number: number;
  date: string;
}

function initResponses(): Record<string, Status> {
  return Object.fromEntries(ALL_POINT_KEYS.map(k => [k, "observed" as Status]));
}

function computeScore(obsId: string, responses: ObservationResponse[]): number {
  return responses.filter(r => r.observation_id === obsId && r.status === "observed").length;
}

// ── Single rubric point row ────────────────────────────────
function PointRow({ index, text, status, onChange }: {
  index: number; text: string; status: Status; onChange: (s: Status) => void;
}) {
  const buttons: { s: Status; label: string; active: string }[] = [
    { s: "observed",     label: "Observed",     active: "bg-green-600 text-white border-green-600" },
    { s: "not_observed", label: "Not Observed",  active: "bg-red-500 text-white border-red-500"    },
    { s: "na",           label: "N/A",           active: "bg-gray-400 text-white border-gray-400"  },
  ];
  return (
    <div className="py-3.5 border-b border-gray-50 last:border-0">
      <p className="text-sm text-gray-800 mb-2.5 leading-snug">
        <span className="text-gray-400 mr-1">{index}.</span>{text}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {buttons.map(({ s, label, active }) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`py-3 px-1 rounded-xl border text-xs font-semibold transition-colors touch-manipulation ${
              status === s ? active : "border-gray-200 text-gray-500 bg-white active:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Law section card ──────────────────────────────────────
function LawCard({ law, responses, onChange }: {
  law: typeof RUBRIC[0];
  responses: Record<string, Status>;
  onChange: (key: string, s: Status) => void;
}) {
  const observed = law.points.filter(p => responses[p.key] === "observed").length;
  const allDone = observed === law.points.length;
  const none = observed === 0 && law.points.every(p => responses[p.key] === "na");
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Law {law.number}</p>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5">{law.title}</h3>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className={`text-xl font-bold ${allDone ? "text-green-600" : none ? "text-gray-300" : "text-gray-800"}`}>
            {observed}/{law.points.length}
          </p>
          <p className="text-xs text-gray-400 leading-none mt-0.5">observed</p>
        </div>
      </div>
      <div className="px-4">
        {law.points.map((p, i) => (
          <PointRow
            key={p.key}
            index={i + 1}
            text={p.text}
            status={responses[p.key] ?? "observed"}
            onChange={s => onChange(p.key, s)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Pattern analysis ──────────────────────────────────────
function PatternAnalysis({ teacherObs, allResponses }: {
  teacherObs: Observation[];
  allResponses: ObservationResponse[];
}) {
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
    <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-red-50 border-b border-red-100">
        <h3 className="text-sm font-semibold text-red-700">Consistent Gaps ({gaps.length})</h3>
        <p className="text-xs text-red-400 mt-0.5">
          Marked "Not Observed" in 2 or more of {teacherObs.length} observations
        </p>
      </div>
      <ul className="divide-y divide-gray-50">
        {gaps.sort((a, b) => b.count - a.count).map(g => (
          <li key={g.key} className="px-4 py-3">
            <p className="text-sm text-gray-900">{g.text}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Law {g.lawNum} — {g.lawTitle} · not observed in {g.count}/{teacherObs.length} observations
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function ObservationTab({ teachers, initialObservations, initialResponses }: Props) {
  // Hooks first — state initializers below depend on searchParams
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for an in-progress observation to resume on load
  const resumingId = searchParams.get("resuming") ?? "";
  const resumingObs = resumingId ? initialObservations.find(o => o.id === resumingId) : null;
  const canResume = resumingObs != null && !initialResponses.some(r => r.observation_id === resumingId);

  const [view, setView] = useState<"list" | "form">(() => canResume ? "form" : "list");
  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  const [allResponses, setAllResponses] = useState<ObservationResponse[]>(initialResponses);
  const [activeObs, setActiveObs] = useState<ActiveObs | null>(() => {
    if (!canResume || !resumingObs) return null;
    const teacher = teachers.find(t => t.id === resumingObs.teacher_id);
    return {
      id: resumingObs.id,
      teacherId: resumingObs.teacher_id,
      teacherName: teacher?.name || teacher?.email || "Unknown",
      number: resumingObs.observation_number,
      date: resumingObs.date,
    };
  });

  // Form state
  const [responses, setResponses] = useState<Record<string, Status>>(initResponses);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Start-new state
  const [teacherSelect, setTeacherSelect] = useState("");
  const [obsNumSelect, setObsNumSelect] = useState("");
  const [dateSelect, setDateSelect] = useState(() => new Date().toISOString().split("T")[0]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // History state — seeded from URL
  const [historyTeacherId, setHistoryTeacherId] = useState<string>(
    () => searchParams.get("teacher") ?? ""
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalObserved = ALL_POINT_KEYS.filter(k => responses[k] === "observed").length;
  const pct = Math.round((totalObserved / TOTAL_POINTS) * 100);

  function setResponse(key: string, s: Status) {
    setResponses(prev => ({ ...prev, [key]: s }));
  }

  function changeHistoryTeacher(id: string) {
    setHistoryTeacherId(id);
    setExpandedId(null);
    const params = new URLSearchParams(searchParams.toString());
    if (id) { params.set("teacher", id); } else { params.delete("teacher"); }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function openForm(obs: ActiveObs) {
    setActiveObs(obs);
    setResponses(initResponses());
    setNotes("");
    setSaveError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("resuming", obs.id);
    router.replace(`?${params.toString()}`, { scroll: false });
    setView("form");
  }

  function closeForm() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("resuming");
    router.replace(`?${params.toString()}`, { scroll: false });
    setView("list");
    setActiveObs(null);
  }

  async function startObservation() {
    if (!teacherSelect || !obsNumSelect) { setStartError("Select a teacher and observation number."); return; }
    setStarting(true); setStartError("");
    const fd = new FormData();
    fd.append("teacher_id", teacherSelect);
    fd.append("observation_number", obsNumSelect);
    fd.append("date", dateSelect);
    const result = await createObservation(fd);
    setStarting(false);
    if (result.error || !result.id) { setStartError(result.error ?? "Failed to start observation."); return; }
    const teacher = teachers.find(t => t.id === teacherSelect);
    openForm({
      id: result.id,
      teacherId: teacherSelect,
      teacherName: teacher?.name || teacher?.email || "Unknown",
      number: parseInt(obsNumSelect),
      date: dateSelect,
    });
  }

  async function handleSave() {
    if (!activeObs) return;
    setSaving(true); setSaveError("");
    const fd = new FormData();
    fd.append("observation_id", activeObs.id);
    fd.append("notes", notes);
    fd.append("responses", JSON.stringify(
      Object.entries(responses).map(([point_key, status]) => ({ point_key, status }))
    ));
    const result = await saveObservation(fd);
    setSaving(false);
    if (result.error) { setSaveError(result.error); return; }

    const newObs: Observation = {
      id: activeObs.id, teacher_id: activeObs.teacherId, observer_id: "",
      observation_number: activeObs.number, date: activeObs.date,
      notes: notes.trim() || null, created_at: new Date().toISOString(),
    };
    const newResps: ObservationResponse[] = Object.entries(responses).map(([point_key, status]) => ({
      id: crypto.randomUUID(), observation_id: activeObs.id, point_key, status,
      created_at: new Date().toISOString(),
    }));
    setObservations(prev => [newObs, ...prev]);
    setAllResponses(prev => [...prev, ...newResps]);

    // Navigate back to history for this teacher, clear resuming param
    setHistoryTeacherId(activeObs.teacherId);
    setExpandedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("teacher", activeObs.teacherId);
    params.delete("resuming");
    router.replace(`?${params.toString()}`, { scroll: false });
    setActiveObs(null);
    setView("list");
  }

  // ── Form view ──────────────────────────────────────────────
  if (view === "form" && activeObs) {
    const scoreColor = totalObserved >= 18 ? "text-green-600" : totalObserved >= 12 ? "text-yellow-600" : "text-red-500";
    return (
      <div>
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm rounded-xl mb-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">{ORDINALS[activeObs.number]} Observation</p>
            <p className="text-sm font-bold text-gray-900 truncate">{activeObs.teacherName}</p>
            <p className="text-xs text-gray-400">{new Date(activeObs.date + "T00:00:00").toLocaleDateString()}</p>
          </div>
          <div className="text-center px-4 flex-shrink-0">
            <p className={`text-3xl font-bold ${scoreColor}`}>{totalObserved}/{TOTAL_POINTS}</p>
            <p className="text-xs text-gray-400 mt-0.5">{pct}% observed</p>
          </div>
          <button
            onClick={() => {
              if (confirm("Leave this observation? You can resume it from the history list.")) closeForm();
            }}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg flex-shrink-0"
          >
            Cancel
          </button>
        </div>

        {RUBRIC.map(law => (
          <LawCard key={law.number} law={law} responses={responses} onChange={setResponse} />
        ))}

        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Observer Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes about this observation…"
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        {saveError && <p className="text-sm text-red-500 mb-3 px-1">{saveError}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 text-base mb-8"
        >
          {saving ? "Saving…" : "Save Observation"}
        </button>
      </div>
    );
  }

  // ── List / history view ────────────────────────────────────
  const historyObs = historyTeacherId
    ? observations.filter(o => o.teacher_id === historyTeacherId)
        .sort((a, b) => a.observation_number - b.observation_number)
    : observations;

  return (
    <div className="space-y-6">
      {/* Start new */}
      <section className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Start New Observation</h2>
        {teachers.length === 0 ? (
          <p className="text-sm text-gray-400">No teacher accounts yet. Assign the "teacher" role to a user first.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Teacher</label>
                <select
                  value={teacherSelect}
                  onChange={e => setTeacherSelect(e.target.value)}
                  className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-56"
                >
                  <option value="">Select teacher…</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Observation #</label>
                <select
                  value={obsNumSelect}
                  onChange={e => setObsNumSelect(e.target.value)}
                  className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Number…</option>
                  {([1, 2, 3, 4] as const).map(n => <option key={n} value={n}>{ORDINALS[n]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Date</label>
                <input
                  type="date"
                  value={dateSelect}
                  onChange={e => setDateSelect(e.target.value)}
                  className="h-[38px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <button
                onClick={startObservation}
                disabled={starting}
                className="h-[38px] px-5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {starting ? "Starting…" : "Start"}
              </button>
            </div>
            {startError && <p className="mt-2 text-sm text-red-500">{startError}</p>}
          </>
        )}
      </section>

      {/* History */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Observation History</h2>
          <select
            value={historyTeacherId}
            onChange={e => changeHistoryTeacher(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All teachers</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name || t.email} ({observations.filter(o => o.teacher_id === t.id).length})
              </option>
            ))}
          </select>
        </div>

        {observations.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
            No observations yet. Start one above.
          </div>
        ) : historyObs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
            No observations for this teacher yet.
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Teacher</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Obs #</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-500">Score</th>
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
                      observed: law.points.filter(p =>
                        allResponses.some(r => r.observation_id === obs.id && r.point_key === p.key && r.status === "observed")
                      ).length,
                    }));
                    const notObservedPoints = RUBRIC.flatMap(law =>
                      law.points
                        .filter(p => allResponses.some(r => r.observation_id === obs.id && r.point_key === p.key && r.status === "not_observed"))
                        .map(p => ({ ...p, lawNum: law.number, lawTitle: law.title }))
                    );

                    return (
                      <Fragment key={obs.id}>
                        <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-5 py-3 font-medium text-gray-800">
                            {teacher?.name || teacher?.email || "Unknown"}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{ORDINALS[obs.observation_number]}</td>
                          <td className="px-5 py-3 text-gray-600">
                            {new Date(obs.date + "T00:00:00").toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {hasResponses ? (
                              <span className={`font-semibold ${
                                score >= 18 ? "text-green-600" : score >= 14 ? "text-yellow-600" : "text-red-500"
                              }`}>
                                {score}/{TOTAL_POINTS}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-md">
                                In Progress
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {!hasResponses && (
                                <button
                                  onClick={() => {
                                    openForm({
                                      id: obs.id,
                                      teacherId: obs.teacher_id,
                                      teacherName: teacher?.name || teacher?.email || "Unknown",
                                      number: obs.observation_number,
                                      date: obs.date,
                                    });
                                  }}
                                  className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                                >
                                  Resume
                                </button>
                              )}
                              {hasResponses && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : obs.id)}
                                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                  {isExpanded ? "Hide" : "Details"}
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!confirm(`Delete ${ORDINALS[obs.observation_number]} observation for ${teacher?.name ?? "this teacher"}?`)) return;
                                  const fd = new FormData();
                                  fd.append("id", obs.id);
                                  await deleteObservation(fd);
                                  setObservations(prev => prev.filter(o => o.id !== obs.id));
                                  setAllResponses(prev => prev.filter(r => r.observation_id !== obs.id));
                                  if (expandedId === obs.id) setExpandedId(null);
                                }}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="border-b border-gray-100">
                            <td colSpan={5} className="px-5 py-4 bg-gray-50/60">
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {lawScores.map(({ law, observed }) => (
                                  <span
                                    key={law.number}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                      observed === law.points.length ? "bg-green-50 text-green-700" :
                                      observed === 0 ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-700"
                                    }`}
                                  >
                                    L{law.number}: {observed}/{law.points.length}
                                  </span>
                                ))}
                              </div>
                              {notObservedPoints.length === 0 ? (
                                <p className="text-xs text-green-600">All applicable points were observed.</p>
                              ) : (
                                <div className="mb-3">
                                  <p className="text-xs font-medium text-gray-500 mb-1.5">Not observed:</p>
                                  <ul className="space-y-1">
                                    {notObservedPoints.map(p => (
                                      <li key={p.key} className="text-xs text-red-600 flex items-start gap-1.5">
                                        <span className="text-red-300 mt-0.5 flex-shrink-0">✗</span>
                                        <span>{p.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {obs.notes && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{obs.notes}</p>
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
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Patterns — {teachers.find(t => t.id === historyTeacherId)?.name}
                </h3>
                <PatternAnalysis
                  teacherObs={historyObs.filter(o => allResponses.some(r => r.observation_id === o.id))}
                  allResponses={allResponses}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

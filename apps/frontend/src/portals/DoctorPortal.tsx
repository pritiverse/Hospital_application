import React, { useState, useEffect } from "react";
import { AiSummaryCard, StatusBadge, StatCard, Toast } from "../components/Shared";
import { api } from "../data/api";

// ── Doctor Dashboard ──────────────────────────────────────────────────────────
function DoctorDashboard({
  userName = "Doctor",
  onNavigate,
}: {
  userName?: string;
  onNavigate: (v: string) => void;
}) {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTodayQueue()
      .then(setQueue)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPatients = queue.length;
  const completedCount = queue.filter((q) => q.status === "completed" || q.hasVisit).length;
  const pendingCount = queue.filter((q) => q.status !== "completed" && !q.hasVisit).length;

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">{greeting}, {userName.startsWith("Dr.") ? userName : `Dr. ${userName}`}</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">{todayStr}</p>
        </div>
        <button
          onClick={() => onNavigate("queue")}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors"
        >
          Patient Queue
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Today's Patients" value={totalPatients} sub={`${completedCount} completed`} />
        <StatCard label="Pending Visits" value={pendingCount} sub="Awaiting consultation" />
        <StatCard label="Completed" value={completedCount} sub="Visit notes submitted" />
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-semibold text-[#475569] mb-4">Today's Schedule</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <p className="text-sm text-[#94A3B8] text-center py-6">No appointments scheduled for today.</p>
        ) : (
          <div className="space-y-1">
            {queue.map((item, i) => (
              <div
                key={item.id || i}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl ${
                  item.status === "current" ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                } transition-colors`}
              >
                <span className="text-xs font-mono text-[#94A3B8] w-16 flex-shrink-0">{item.time}</span>
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.status === "completed" || item.hasVisit ? "bg-[#16A34A]" :
                    item.status === "current" ? "bg-[#2563EB] animate-pulse" :
                    "bg-[#CBD5E1]"
                  }`}
                />
                <span className={`text-sm flex-1 ${
                  item.status === "completed" || item.hasVisit ? "text-[#94A3B8] line-through" :
                  item.status === "current" ? "text-[#2563EB] font-medium" :
                  "text-[#334155]"
                }`}>
                  {item.patient}
                </span>
                {item.status === "current" && (
                  <span className="text-xs font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                    Up next
                  </span>
                )}
                {(item.status === "completed" || item.hasVisit) && (
                  <span className="text-xs text-[#16A34A] flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="4.5" fill="#16A34A" />
                      <path d="M2.5 5l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Done
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient Queue ─────────────────────────────────────────────────────────────
function PatientQueue({ onVisit }: { onVisit: (queueItem: any) => void }) {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.getTodayQueue()
      .then((data) => {
        setQueue(data);
        if (data.length > 0) {
          setExpanded(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Today's Patient Queue</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-[#94A3B8] text-sm">
          No patients in queue for today.
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((appt) => (
            <div key={appt.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === appt.id ? null : appt.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-[#F8FAFC] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-[#475569]">
                    {appt.patient.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F172A]">{appt.patient}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{appt.time}</p>
                </div>
                <div className="flex items-center gap-3">
                  {appt.hasVisit ? (
                    <StatusBadge status="COMPLETED" size="xs" />
                  ) : appt.status === "completed" ? (
                    <StatusBadge status="COMPLETED" size="xs" />
                  ) : appt.status === "current" ? (
                    <StatusBadge status="CONFIRMED" size="xs" />
                  ) : (
                    <StatusBadge status="HELD" size="xs" />
                  )}
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    className={`text-[#94A3B8] transition-transform ${expanded === appt.id ? "rotate-180" : ""}`}
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>

              {expanded === appt.id && (
                <div className="px-5 pb-5 border-t border-[#F1F5F9] pt-4 animate-fade-in">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">AI Patient Brief</p>
                    <AiSummaryCard
                      data={appt.aiSummary}
                      status={appt.aiSummary?.status ?? "FAILED"}
                      title="AI Patient Brief"
                      fallbackSymptoms={appt.symptoms || undefined}
                    />
                  </div>

                  {appt.symptoms && appt.aiSummary?.status !== "SUCCESS" && (
                    <div className="mb-4 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs text-[#94A3B8] mb-1">Raw symptom notes</p>
                      <p className="text-sm text-[#334155]">{appt.symptoms}</p>
                    </div>
                  )}

                  <button
                    onClick={() => onVisit(appt)}
                    className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {appt.hasVisit ? "Update Visit Notes" : "Start Visit"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Visit Form ────────────────────────────────────────────────────────────────
type PrescriptionItem = {
  medicine: string;
  dosage: string;
  frequency: string;
  frequencyPerDay: number;
  duration: string;
  instructions: string;
};

function VisitForm({
  queueItem,
  onDone,
}: {
  queueItem?: any;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([
    { medicine: "", dosage: "", frequency: "Once daily", frequencyPerDay: 1, duration: "7", instructions: "" },
  ]);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const [editedSummary, setEditedSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  const patientName = queueItem?.patient || "Patient";
  const appointmentTime = queueItem?.time || "Today";

  // Restore draft notes from localStorage if available
  useEffect(() => {
    if (!queueItem?.id) return;
    const savedDraft = localStorage.getItem(`cs_draft_${queueItem.id}`);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.diagnosis) setDiagnosis(parsed.diagnosis);
        if (parsed.followUp) setFollowUp(parsed.followUp);
        if (parsed.prescription && parsed.prescription.length > 0) setPrescription(parsed.prescription);
        if (parsed.editedSummary) setEditedSummary(parsed.editedSummary);
      } catch {}
    }
  }, [queueItem?.id]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (!queueItem?.id) return;
    const timer = setTimeout(() => {
      localStorage.setItem(
        `cs_draft_${queueItem.id}`,
        JSON.stringify({ notes, diagnosis, followUp, prescription, editedSummary })
      );
      setDraftSaved(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [notes, diagnosis, followUp, prescription, editedSummary, queueItem?.id]);

  const PRESET_MEDS: PrescriptionItem[] = [
    { medicine: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", frequencyPerDay: 3, duration: "7", instructions: "Take after meals with full glass of water" },
    { medicine: "Paracetamol", dosage: "650mg", frequency: "Twice daily", frequencyPerDay: 2, duration: "3", instructions: "Take after meals as needed for fever/pain" },
    { medicine: "Omeprazole", dosage: "20mg", frequency: "Once daily", frequencyPerDay: 1, duration: "14", instructions: "Take 30 minutes before breakfast" },
    { medicine: "Cetirizine", dosage: "10mg", frequency: "Once daily", frequencyPerDay: 1, duration: "5", instructions: "Take once daily at bedtime" },
  ];

  const applyPreset = (preset: PrescriptionItem) => {
    setPrescription((prev) => {
      const filtered = prev.filter((p) => p.medicine.trim() !== "");
      return [...filtered, { ...preset }];
    });
  };

  const addItem = () =>
    setPrescription([
      ...prescription,
      { medicine: "", dosage: "", frequency: "Once daily", frequencyPerDay: 1, duration: "7", instructions: "" },
    ]);

  const updateItem = (i: number, field: keyof PrescriptionItem, val: any) =>
    setPrescription(
      prescription.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [field]: val };
        if (field === "frequency") {
          updated.frequencyPerDay =
            val === "Twice daily" ? 2 : val === "Three times daily" ? 3 : val === "Four times daily" ? 4 : 1;
        }
        return updated;
      })
    );

  const removeItem = (i: number) =>
    setPrescription(prescription.filter((_, idx) => idx !== i));

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      const generated = `Your consultation concluded smoothly. Based on clinical assessment, the primary diagnosis is ${
        diagnosis || "routine evaluation"
      }. Clinical instructions: ${
        notes || "Please follow standard care guidance."
      }. Prescribed medications should be taken as instructed. ${
        followUp ? `A follow-up visit is scheduled for ${followUp}.` : ""
      } If symptoms worsen or severe issues occur, please seek prompt medical attention.`;
      setSummary(generated);
      setEditedSummary(generated);
    }, 1000);
  };

  const handleSaveVisit = async () => {
    if (!queueItem?.id) {
      setError("No active appointment selected.");
      return;
    }
    if (!notes.trim()) {
      setError("Please provide clinical notes before completing the visit.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const rxPayload = prescription
        .filter((p) => p.medicine.trim())
        .map((p) => ({
          medicineName: p.medicine,
          dosage: p.dosage || "As directed",
          frequencyPerDay: p.frequencyPerDay || 1,
          durationDays: parseInt(p.duration) || 7,
          instructions: p.instructions || undefined,
        }));

      await api.recordVisit({
        appointmentId: queueItem.id,
        clinicalNotes: notes,
        diagnosis: diagnosis || undefined,
        followUpDate: followUp || undefined,
        patientSummary: editedSummary || summary || undefined,
        prescription: rxPayload,
      });

      // Clear draft on success
      localStorage.removeItem(`cs_draft_${queueItem.id}`);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to record visit.");
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" fill="#16A34A" />
            <path d="M10 16l4.5 4.5L22 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#0F172A] mb-2">Visit Recorded & Completed</h2>
        <p className="text-sm text-[#94A3B8] mb-6">
          The clinical notes, follow-up, and prescriptions have been saved for {patientName}.
        </p>
        <button
          onClick={onDone}
          className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          Return to Patient Queue →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={onDone} className="text-[#94A3B8] hover:text-[#475569]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-[#0F172A]">Clinical Consultation — {patientName}</h1>
          <span className="text-sm text-[#94A3B8]">({appointmentTime})</span>
        </div>
        {draftSaved && (
          <span className="text-xs text-[#16A34A] flex items-center gap-1 font-medium bg-[#DCFCE7] px-2.5 py-1 rounded-full animate-fade-in">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#16A34A"/><path d="M2.5 5l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Draft auto-saved
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Clinical notes */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[#475569] mb-4">Clinical Findings & Diagnosis</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#475569] block mb-1.5">Clinical notes & examination findings</label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Examination findings, vital observations, clinical rationale…"
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#475569] block mb-1.5">Primary Diagnosis</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute bronchitis, Hypertension stage 1, Lumbar radiculopathy"
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#475569] block mb-1.5">Recommended Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={followUp}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Prescription */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#475569]">Prescription Builder</h3>
              <span className="text-xs text-[#94A3B8]">Auto-schedules daily reminders</span>
            </div>

            {/* Quick Presets */}
            <div className="mb-4 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <p className="text-[11px] font-semibold text-[#64748B] mb-2 uppercase tracking-wider">Quick Prescription Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_MEDS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 bg-white hover:bg-[#EFF6FF] text-[#2563EB] text-xs font-medium rounded-lg transition-colors border border-[#BFDBFE] shadow-2xs"
                  >
                    + {p.medicine} ({p.dosage})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {prescription.map((item, i) => (
                <div key={i} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#475569]">Medicine #{i + 1}</span>
                    {prescription.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-xs text-[#DC2626] hover:underline">
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.medicine}
                    onChange={(e) => updateItem(i, "medicine", e.target.value)}
                    placeholder="Medicine name (e.g. Amoxicillin 500mg)"
                    className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={item.dosage}
                      onChange={(e) => updateItem(i, "dosage", e.target.value)}
                      placeholder="Dosage (e.g. 1 tablet)"
                      className="border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-white"
                    />
                    <select
                      value={item.frequency}
                      onChange={(e) => updateItem(i, "frequency", e.target.value)}
                      className="border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-white"
                    >
                      <option>Once daily</option>
                      <option>Twice daily</option>
                      <option>Three times daily</option>
                      <option>Four times daily</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={item.duration}
                      onChange={(e) => updateItem(i, "duration", e.target.value)}
                      placeholder="Duration (days)"
                      className="border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-white"
                    />
                    <input
                      type="text"
                      value={item.instructions}
                      onChange={(e) => updateItem(i, "instructions", e.target.value)}
                      placeholder="Instructions (after meals)"
                      className="border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] bg-white"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addItem}
                className="w-full py-2 border border-dashed border-[#CBD5E1] rounded-xl text-sm text-[#94A3B8] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                + Add medicine
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Patient Summary & Submission */}
        <div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#475569]">Patient-Facing Summary</h3>
              {!summary && (
                <button
                  onClick={handleGenerate}
                  disabled={generating || !notes.trim()}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {generating && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                  {generating ? "Generating…" : "Generate Patient Summary"}
                </button>
              )}
            </div>

            {!summary && !generating && (
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-center">
                <p className="text-sm text-[#94A3B8]">
                  Complete your clinical notes first, then generate a patient-friendly summary.
                </p>
                <p className="text-xs text-[#CBD5E1] mt-1">Your notes are preserved and not sent to the patient</p>
              </div>
            )}

            {generating && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                  Drafting clinical summary for patient…
                </div>
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-5/6" />
                <div className="skeleton h-3 w-4/5" />
              </div>
            )}

            {summary && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded bg-[#EFF6FF] flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1l1.2 2.4H9l-2.2 1.6.8 2.5L5 6.2 2.4 7.5l.8-2.5L1 3.4h2.8L5 1z" fill="#2563EB" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-[#94A3B8]">AI-assisted summary — edit before saving</span>
                </div>
                <textarea
                  rows={7}
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-medium text-[#475569] rounded-lg hover:bg-[#F8FAFC] transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
              <button
                disabled={saving || !notes.trim()}
                onClick={handleSaveVisit}
                className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Visit…
                  </>
                ) : (
                  "Complete Visit & Send to Patient"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────────
function DoctorSchedule() {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const [hours, setHours] = useState([
    { dayOfWeek: 1, name: "Mon", enabled: true, start: "09:00", end: "17:00" },
    { dayOfWeek: 2, name: "Tue", enabled: true, start: "09:00", end: "17:00" },
    { dayOfWeek: 3, name: "Wed", enabled: true, start: "09:00", end: "17:00" },
    { dayOfWeek: 4, name: "Thu", enabled: true, start: "09:00", end: "17:00" },
    { dayOfWeek: 5, name: "Fri", enabled: true, start: "09:00", end: "17:00" },
    { dayOfWeek: 6, name: "Sat", enabled: false, start: "09:00", end: "13:00" },
    { dayOfWeek: 0, name: "Sun", enabled: false, start: "09:00", end: "13:00" },
  ]);

  const [leaves, setLeaves] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api.getDoctorLeaves()
      .then(setLeaves)
      .catch(() => {});
  }, []);

  const toggle = (i: number) =>
    setHours(hours.map((h, idx) => (idx === i ? { ...h, enabled: !h.enabled } : h)));

  const update = (i: number, field: "start" | "end", val: string) =>
    setHours(hours.map((h, idx) => (idx === i ? { ...h, [field]: val } : h)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeWorkingHours = hours
        .filter((h) => h.enabled)
        .map((h) => ({
          dayOfWeek: h.dayOfWeek,
          startTime: h.start,
          endTime: h.end,
        }));
      await api.updateSchedule(activeWorkingHours);
      setToast("Working schedule updated successfully.");
    } catch (err: any) {
      setToast(err.message || "Failed to update schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h1 className="text-2xl font-semibold text-[#0F172A]">My Schedule</h1>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-semibold text-[#475569] mb-4">Working Hours</h3>
        <div className="space-y-3">
          {hours.map((item, i) => (
            <div key={item.name} className="flex items-center gap-4">
              <div className="w-24 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                    item.enabled ? "bg-[#2563EB]" : "bg-[#CBD5E1]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      item.enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className={`text-sm ${item.enabled ? "text-[#0F172A] font-medium" : "text-[#94A3B8]"}`}>
                  {item.name}
                </span>
              </div>
              {item.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={item.start}
                    onChange={(e) => update(i, "start", e.target.value)}
                    className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                  <span className="text-[#94A3B8] text-sm">to</span>
                  <input
                    type="time"
                    value={item.end}
                    onChange={(e) => update(i, "end", e.target.value)}
                    className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  />
                </div>
              ) : (
                <span className="text-sm text-[#94A3B8] italic">Not available</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#475569]">Leave Periods</h3>
          <p className="text-xs text-[#94A3B8]">Leave is scheduled and approved by admin</p>
        </div>
        {leaves.length === 0 ? (
          <p className="text-sm text-[#94A3B8] py-4 text-center">No leave periods scheduled.</p>
        ) : (
          <div className="space-y-3">
            {leaves.map((leave, i) => (
              <div key={leave.id || i} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <div>
                  <p className="text-sm font-medium text-[#334155]">
                    {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{leave.reason || "Approved leave"}</p>
                </div>
                <StatusBadge status="CONFIRMED" size="xs" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Doctor Portal Root ────────────────────────────────────────────────────────
export default function DoctorPortal() {
  const [view, setView] = useState("dashboard");
  const [selectedQueueItem, setSelectedQueueItem] = useState<any>(null);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {view === "dashboard" && <DoctorDashboard onNavigate={setView} />}
        {view === "queue" && (
          <PatientQueue
            onVisit={(item) => {
              setSelectedQueueItem(item);
              setView("visit");
            }}
          />
        )}
        {view === "visit" && (
          <VisitForm queueItem={selectedQueueItem} onDone={() => setView("queue")} />
        )}
        {view === "schedule" && <DoctorSchedule />}
      </div>
    </div>
  );
}

export const DOCTOR_NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: "queue",
    label: "Patient Queue",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M13 13c0-1.657-.895-3.122-2.25-3.938" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 6.5h14M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export { DoctorDashboard, PatientQueue, VisitForm, DoctorSchedule };

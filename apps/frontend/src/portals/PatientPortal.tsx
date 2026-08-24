import { useState, useEffect } from "react";
import {
  StatusBadge,
  CountdownTimer,
  Timeline,
  AiSummaryCard,
  ConfirmModal,
  CalendarSyncIcon,
  Toast,
} from "../components/Shared";
import { api } from "../data/api";

// ── Find Doctor ────────────────────────────────────────────────────────────────
function FindDoctor({ onBook }: { onBook: (doctorId: string) => void }) {
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDoctors()
      .then(setDoctors)
      .catch(() => setError("Could not load doctors. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const specializations = [...new Set(doctors.map((d) => d.specialization))];

  const filtered = doctors.filter((d) => {
    if (spec && d.specialization !== spec) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Find a Doctor</h1>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
        />
        <select
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          className="border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 bg-white"
        >
          <option value="">All specializations</option>
          {specializations.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="skeleton h-12 w-12 rounded-xl mb-3" />
              <div className="skeleton h-4 w-40 mb-2" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-sm text-[#DC2626]">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-[#2563EB]">
                    {doc.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#0F172A]">{doc.name}</h3>
                  <span className="inline-flex mt-0.5 px-2 py-0.5 bg-[#F1F5F9] text-[#475569] text-xs font-medium rounded-full">
                    {doc.specialization}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#94A3B8]">Next available</p>
                  <p className="text-sm font-medium text-[#334155] mt-0.5">{doc.nextAvailable || "—"}</p>
                </div>
                <button
                  onClick={() => onBook(doc.id)}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors"
                >
                  View Slots
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-[#94A3B8] text-sm">No doctors match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Book Appointment Wizard ───────────────────────────────────────────────────
const STEPS = ["Select Slot", "Symptoms", "Review", "Confirmed"];

function BookAppointment({ doctorId, onDone }: { doctorId: string | null; onDone: (apptId?: string) => void }) {
  const [step, setStep] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [slotExpired, setSlotExpired] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [doctor, setDoctor] = useState<any>(null);

  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("Mild");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiData, setAiData] = useState<any>(null);

  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

  // Load doctor info + slots
  useEffect(() => {
    if (!doctorId) return;
    api.getDoctors().then((docs) => {
      const d = docs.find((x: any) => x.id === doctorId);
      if (d) setDoctor(d);
    });
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) return;
    setSlotsLoading(true);
    api.getDoctorSlots(doctorId, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [doctorId, selectedDate]);

  const idempotencyKey = () => `book-${doctorId}-${selectedSlotStart}-${Date.now()}`;

  const handleSlotSelect = async (slot: any) => {
    if (!doctorId || !slot.available) return;
    setBookingError("");
    try {
      const key = `book-${doctorId}-${slot.slotStart}-${Math.random().toString(36).slice(2)}`;
      const appt = await api.bookAppointment({ doctorId, slotStart: slot.slotStart, idempotencyKey: key });
      setAppointmentId(appt.id);
      setSelectedSlot(slot.time);
      setSelectedSlotStart(slot.slotStart);
      setHoldExpiry(appt.holdExpiresAt ? new Date(appt.holdExpiresAt) : new Date(Date.now() + 5 * 60000));
      setSlotExpired(false);
    } catch (err: any) {
      setBookingError(err.message || "That slot was just taken. Please choose another open time slot.");
      api.getDoctorSlots(doctorId, selectedDate).then(setSlots).catch(() => {});
    }
  };

  const handleHoldExpired = () => {
    setSlotExpired(true);
    setSelectedSlot(null);
    setSelectedSlotStart(null);
    setHoldExpiry(null);
    setAppointmentId(null);
  };

  const handleSymptomsSubmit = async () => {
    if (!symptoms.trim() || !appointmentId) return;
    setAiLoading(true);
    try {
      const result = await api.submitSymptoms(appointmentId, {
        symptoms,
        severity,
        durationDays: duration ? parseInt(duration) : undefined,
      });
      setAiData(result.fallback ? null : result);
      setAiStatus(result.urgency ? "SUCCESS" : "FAILED");
    } catch {
      setAiStatus("FAILED");
      setAiData(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmAppointment = async () => {
    if (!appointmentId) return;
    setConfirmLoading(true);
    try {
      await api.confirmAppointment(appointmentId);
      setStep(3);
    } catch (err: any) {
      setBookingError(err.message || "Failed to confirm. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < step ? "bg-[#16A34A] text-white" : i === step ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"
              }`}>
                {i < step ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-[#16A34A]" : "bg-[#E2E8F0]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Slot */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Select a Time Slot</h2>
            <p className="text-sm text-[#94A3B8] mt-0.5">
              {doctor ? `Booking with ${doctor.name} · ${doctor.specialization}` : "Loading doctor…"}
            </p>
          </div>

          {bookingError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-sm text-[#DC2626]">{bookingError}</div>
          )}

          {slotExpired && (
            <div className="flex items-start gap-3 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl animate-fade-in">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0">
                <path d="M8 2l6 12H2L8 2z" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 7v3M8 11v.5" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-medium text-[#92400E]">Hold expired — select a new slot</p>
            </div>
          )}

          {selectedSlot && holdExpiry && (
            <div className="flex items-center justify-between p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl animate-fade-in">
              <CountdownTimer expiresAt={holdExpiry} onExpire={handleHoldExpired} />
              <button
                onClick={() => { setSelectedSlot(null); setHoldExpiry(null); setSlotExpired(false); setAppointmentId(null); }}
                className="text-xs text-[#94A3B8] hover:text-[#475569] ml-4"
              >
                Change slot
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs font-medium text-[#94A3B8]">Date</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); setHoldExpiry(null); setAppointmentId(null); }}
                className="border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 bg-white"
              />
            </div>

            {slotsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-6">No slots available on this date.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.slotStart}
                    disabled={!slot.available}
                    onClick={() => handleSlotSelect(slot)}
                    className={`py-2.5 text-sm font-medium rounded-xl border transition-all ${
                      !slot.available
                        ? "border-[#E2E8F0] text-[#CBD5E1] bg-[#F8FAFC] cursor-not-allowed"
                        : selectedSlot === slot.time
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                        : "border-[#E2E8F0] text-[#334155] hover:border-[#2563EB] hover:text-[#2563EB]"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={!selectedSlot}
            onClick={() => setStep(1)}
            className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Symptoms */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Describe Your Symptoms</h2>
            <p className="text-sm text-[#94A3B8] mt-0.5">This helps your doctor prepare for your visit</p>
          </div>

          {!aiLoading && !aiStatus && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                    Describe your symptoms
                    <span className="ml-1 text-[#94A3B8] font-normal">— be as specific as possible</span>
                  </label>
                  <textarea
                    rows={4}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g. I've been experiencing chest tightness when climbing stairs, started 3 weeks ago…"
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[#475569] mb-1.5 block">Duration (days)</label>
                    <input
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 21"
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#475569] mb-1.5 block">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 bg-white"
                    >
                      <option>Mild</option>
                      <option>Moderate</option>
                      <option>Severe</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="px-4 py-2.5 border border-[#E2E8F0] text-sm font-medium text-[#475569] rounded-xl hover:bg-[#F8FAFC] transition-colors">
                  ← Back
                </button>
                <button
                  disabled={!symptoms.trim()}
                  onClick={handleSymptomsSubmit}
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
                >
                  Generate AI Summary
                </button>
              </div>
            </>
          )}

          {aiLoading && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-xl">
                <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#475569]">Generating pre-visit summary with Gemini AI…</span>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-3 w-5/6" />
              </div>
            </div>
          )}

          {aiStatus && !aiLoading && (
            <div className="space-y-4 animate-fade-in">
              <AiSummaryCard data={aiData} status={aiStatus} fallbackSymptoms={symptoms} />
              <div className="flex gap-3">
                <button onClick={() => { setAiStatus(null); setAiLoading(false); }} className="px-4 py-2.5 border border-[#E2E8F0] text-sm font-medium text-[#475569] rounded-xl hover:bg-[#F8FAFC] transition-colors">
                  ← Edit symptoms
                </button>
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors">
                  Continue to Review
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
          <h2 className="text-lg font-semibold text-[#0F172A]">Review Your Appointment</h2>

          {bookingError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-sm text-[#DC2626]">{bookingError}</div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between py-3 border-b border-[#F1F5F9]">
              <span className="text-sm text-[#94A3B8]">Doctor</span>
              <span className="text-sm font-medium text-[#0F172A]">{doctor?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-[#F1F5F9]">
              <span className="text-sm text-[#94A3B8]">Specialization</span>
              <span className="text-sm font-medium text-[#0F172A]">{doctor?.specialization ?? "—"}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-[#F1F5F9]">
              <span className="text-sm text-[#94A3B8]">Date & Time</span>
              <span className="text-sm font-medium text-[#0F172A]">{selectedDate} · {selectedSlot}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-[#F1F5F9]">
              <span className="text-sm text-[#94A3B8]">Severity</span>
              <span className="text-sm font-medium text-[#0F172A]">{severity}</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-[#94A3B8] mb-2">Your symptoms</p>
            <p className="text-sm text-[#334155] bg-[#F8FAFC] rounded-xl p-3">{symptoms}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 border border-[#E2E8F0] text-sm font-medium text-[#475569] rounded-xl hover:bg-[#F8FAFC] transition-colors">
              ← Back
            </button>
            <button
              disabled={confirmLoading}
              onClick={handleConfirmAppointment}
              className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {confirmLoading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Confirming…</>
              ) : "Confirm Appointment"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmed */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#16A34A" />
              <path d="M10 16l4.5 4.5L22 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A] mb-2">Appointment Confirmed!</h2>
          <p className="text-sm text-[#94A3B8] mb-6">
            {doctor?.name} · {selectedDate} at {selectedSlot ?? "—"}
          </p>

          <div className="flex flex-col gap-2 items-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#DCFCE7] rounded-full">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="#16A34A" strokeWidth="1.2" />
                <path d="M3 6l2.5 2.5L11 4" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-medium text-[#16A34A]">Confirmation email queued</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#DCFCE7] rounded-full">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#16A34A" strokeWidth="1.2" />
                <path d="M4 7l2.5 2.5L10 4" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-medium text-[#16A34A]">AI summary generated</span>
            </div>
          </div>

          <button
            onClick={() => onDone(appointmentId ?? undefined)}
            className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors"
          >
            View Appointment
          </button>
        </div>
      )}
    </div>
  );
}

// ── My Appointments ────────────────────────────────────────────────────────────
function RescheduleModal({
  open,
  appointment,
  onClose,
  onDone,
}: {
  open: boolean;
  appointment: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open || !appointment?.doctorId) return;
    api.getDoctorSlots(appointment.doctorId, today).then(setSlots).catch(() => setSlots([]));
  }, [open, appointment, today]);

  const handleSelect = (slot: any) => {
    setSelectedSlot(slot);
    setHoldExpiry(new Date(Date.now() + 5 * 60000));
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !appointment?.id) return;
    setLoading(true);
    setError("");
    try {
      await api.rescheduleAppointment(appointment.id, {
        newSlotStart: selectedSlot.slotStart,
        idempotencyKey: `reschedule-${appointment.id}-${Date.now()}`,
      });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err.message || "Could not reschedule.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-w-lg w-full p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Reschedule Appointment</h3>
        <p className="text-sm text-[#94A3B8] mb-4">{appointment?.doctor} · Select a new slot</p>

        {error && <div className="mb-3 text-sm text-[#DC2626]">{error}</div>}

        {selectedSlot && holdExpiry && (
          <div className="flex items-center justify-between mb-4 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl">
            <CountdownTimer expiresAt={holdExpiry} onExpire={() => { setSelectedSlot(null); setHoldExpiry(null); }} />
            <button onClick={() => { setSelectedSlot(null); setHoldExpiry(null); }} className="text-xs text-[#94A3B8] hover:text-[#475569] ml-3">
              Change
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {slots.map((slot) => (
            <button
              key={slot.slotStart}
              disabled={!slot.available}
              onClick={() => handleSelect(slot)}
              className={`py-2.5 text-sm font-medium rounded-xl border transition-all ${
                !slot.available
                  ? "border-[#E2E8F0] text-[#CBD5E1] bg-[#F8FAFC] cursor-not-allowed"
                  : selectedSlot?.slotStart === slot.slotStart
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                  : "border-[#E2E8F0] text-[#334155] hover:border-[#2563EB] hover:text-[#2563EB]"
              }`}
            >
              {slot.time}
            </button>
          ))}
          {slots.length === 0 && <p className="col-span-3 text-sm text-[#94A3B8] py-4 text-center">No slots available today.</p>}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC]">
            Cancel
          </button>
          <button
            disabled={!selectedSlot || loading}
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Saving…" : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MyAppointments({ onDetail }: { onDetail: (id: string) => void }) {
  const [tab, setTab] = useState("Upcoming");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<any>(null);
  const [toast, setToast] = useState("");

  const load = () => {
    setLoading(true);
    api.getAppointments()
      .then(setAppointments)
      .catch(() => setToast("Could not load appointments."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const tabs = ["Upcoming", "Completed", "Cancelled"];

  const filtered = {
    Upcoming: appointments.filter((a) => ["CONFIRMED", "HELD"].includes(a.status) && new Date(a.slotStart) >= new Date()),
    Completed: appointments.filter((a) => a.status === "COMPLETED"),
    Cancelled: appointments.filter((a) => a.status.startsWith("CANCELLED")),
  }[tab] ?? [];

  const handleCancel = async (id: string) => {
    try {
      await api.cancelAppointment(id);
      setToast("Appointment cancelled.");
      setCancelModal(null);
      load();
    } catch (err: any) {
      setToast(err.message || "Could not cancel.");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      <RescheduleModal
        open={!!rescheduleAppt}
        appointment={rescheduleAppt}
        onClose={() => setRescheduleAppt(null)}
        onDone={() => { setToast("Appointment rescheduled successfully."); load(); }}
      />
      <ConfirmModal
        open={!!cancelModal}
        title="Cancel appointment?"
        onConfirm={() => cancelModal && handleCancel(cancelModal)}
        onCancel={() => setCancelModal(null)}
        confirmLabel="Yes, Cancel"
        destructive
      >
        <p className="text-sm text-[#475569]">This will cancel your appointment and release the slot. A notification will be sent to you.</p>
      </ConfirmModal>

      <h1 className="text-2xl font-semibold text-[#0F172A]">My Appointments</h1>

      <div className="flex gap-1 p-1 bg-[#F1F5F9] rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t ? "bg-white text-[#0F172A] shadow-sm" : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#94A3B8]">
              <p className="text-sm">No {tab.toLowerCase()} appointments</p>
            </div>
          )}
          {filtered.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[#0F172A]">{appt.doctor}</p>
                  <p className="text-sm text-[#94A3B8] mt-0.5">{appt.specialization}</p>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarSyncIcon status={appt.calendarSync} />
                  <StatusBadge status={appt.status} />
                </div>
              </div>
              <p className="text-sm text-[#475569] mt-3 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M1 5.5h12M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {appt.date} at {appt.time}
              </p>
              {(appt.status === "CONFIRMED" || appt.status === "HELD") && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-[#F1F5F9]">
                  <button onClick={() => onDetail(appt.id)} className="text-sm font-medium text-[#2563EB] hover:underline">
                    View Details
                  </button>
                  <button onClick={() => setRescheduleAppt(appt)} className="text-sm font-medium text-[#475569] hover:text-[#0F172A]">
                    Reschedule
                  </button>
                  <button onClick={() => setCancelModal(appt.id)} className="text-sm font-medium text-[#DC2626] hover:underline ml-auto">
                    Cancel
                  </button>
                </div>
              )}
              {appt.status === "COMPLETED" && (
                <button onClick={() => onDetail(appt.id)} className="mt-4 text-sm font-medium text-[#2563EB] hover:underline">
                  View Summary →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Appointment Detail ─────────────────────────────────────────────────────────
function AppointmentDetail({ appointmentId, onBack }: { appointmentId: string | null; onBack: () => void }) {
  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [medReminders, setMedReminders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!appointmentId) { setLoading(false); setError("No appointment selected."); return; }
    api.getAppointment(appointmentId)
      .then(setAppt)
      .catch(() => setError("Could not load appointment details."))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );

  if (error || !appt) return (
    <div className="space-y-4">
      <p className="text-sm text-[#DC2626]">{error || "Appointment not found."}</p>
      <button onClick={onBack} className="text-sm text-[#2563EB] hover:underline">← Back to Appointments</button>
    </div>
  );

  const initials = appt.doctor?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) ?? "DR";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[#94A3B8] hover:text-[#475569]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-[#0F172A]">Appointment Detail</h1>
        <StatusBadge status={appt.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Info + Timeline */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-[#2563EB]">{initials}</span>
              </div>
              <div>
                <h2 className="font-semibold text-[#0F172A]">{appt.doctor}</h2>
                <p className="text-sm text-[#94A3B8]">{appt.specialization}</p>
                <p className="text-sm text-[#475569] mt-2 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M1 5.5h12M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {appt.date} at {appt.time}
                </p>
              </div>
            </div>
          </div>

          {appt.timeline && appt.timeline.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[#475569] mb-5">Appointment Progress</h3>
              <Timeline steps={appt.timeline} />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[#475569] mb-3">Pre-visit Summary</h3>
            <AiSummaryCard
              data={appt.aiSummary}
              status={appt.aiSummary?.status ?? "FAILED"}
              fallbackSymptoms={appt.symptoms ?? undefined}
            />
          </div>
        </div>

        {/* Right: Prescription + Post-visit */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[#475569] mb-4">Prescription</h3>
            {appt.prescription && appt.prescription.length > 0 ? (
              <div className="space-y-3">
                {appt.prescription.map((rx: any, i: number) => (
                  <div key={i} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[#0F172A]">{rx.medicine}</p>
                      <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                        <div
                          onClick={() => setMedReminders((prev) => ({ ...prev, [i]: !prev[i] }))}
                          className={`w-8 rounded-full transition-colors relative ${medReminders[i] ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}
                          style={{ height: "18px" }}
                        >
                          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${medReminders[i] ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-[11px] text-[#94A3B8]">Reminders</span>
                      </label>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">{rx.dosage} · {rx.frequency} · {rx.duration} days</p>
                    {rx.instructions && <p className="text-xs text-[#475569] mt-1">{rx.instructions}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No prescription yet — available after consultation</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-[#475569] mb-3">Post-visit Summary</h3>
            {appt.postVisitSummary ? (
              <p className="text-sm text-[#334155] bg-[#F8FAFC] rounded-xl p-3">{appt.postVisitSummary}</p>
            ) : (
              <p className="text-sm text-[#94A3B8]">Available after your consultation on {appt.date}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Notification type icons ────────────────────────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  const cls = "text-[#475569]";
  if (type === "BOOKING_CONFIRMED") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={cls}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8l2.5 2.5L11 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "REMINDER") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={cls}>
      <rect x="3" y="5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 5V4a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 9v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
  if (type === "LEAVE_AFFECTED" || type === "CANCELLED") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={cls}>
      <path d="M8 2l6 12H2L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={cls}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ── Notifications ──────────────────────────────────────────────────────────────
function PatientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Notifications</h1>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex gap-4 ${
                !n.read ? "border-l-4 border-l-[#2563EB] border-[#E2E8F0]" : "border-[#E2E8F0]"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                <NotifIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? "font-medium text-[#0F172A]" : "text-[#475569]"}`}>
                  {n.message}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">{n.time}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-[#2563EB] flex-shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Patient Portal Root ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: "dashboard", label: "Dashboard",
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
    id: "doctors", label: "Find Doctor",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "appointments", label: "Appointments",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 6.5h14M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "notifications", label: "Notifications",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5a5 5 0 00-5 5v3l-1.5 2h13L13 9.5v-3a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export { NAV_ITEMS, FindDoctor, BookAppointment, MyAppointments, AppointmentDetail, PatientNotifications, NotifIcon };

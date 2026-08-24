import React, { useState, useEffect } from "react";
import { StatusBadge, StatCard, ConfirmModal, Toast } from "../components/Shared";
import { api } from "../data/api";

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Admin Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="skeleton h-56 rounded-2xl" />
          <div className="skeleton h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { notificationHealth: nh, weeklyAppointments } = stats;
  const maxCount = Math.max(...weeklyAppointments.map((d: any) => d.count), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Doctors" value={stats.doctors} />
        <StatCard label="Patients" value={stats.patients.toLocaleString()} />
        <StatCard label="Today's Visits" value={stats.todayVisits} />
        <StatCard label="Pending Leaves" value={stats.pendingLeaves} sub="Future scheduled" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Weekly appointments chart */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-semibold text-[#475569] mb-4">Appointments This Week</h3>
          <div className="flex items-end gap-2 h-32">
            {weeklyAppointments.map((d: any) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[11px] text-[#94A3B8]">{d.count || ""}</span>
                <div
                  className="w-full rounded-t-md bg-[#BFDBFE] hover:bg-[#2563EB] transition-colors"
                  style={{ height: `${maxCount > 0 ? (d.count / maxCount) * 96 : 0}px`, minHeight: d.count > 0 ? "4px" : "0" }}
                />
                <span className="text-[11px] text-[#94A3B8]">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System health */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-semibold text-[#475569] mb-4">System Health</h3>
          <div className="space-y-3">
            {/* Email */}
            <div className="flex items-start justify-between p-3 bg-[#F8FAFC] rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2.5" width="12" height="9" rx="1.5" stroke="#2563EB" strokeWidth="1.2" />
                    <path d="M1 4.5l6 4 6-4" stroke="#2563EB" strokeWidth="1.2" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-[#334155]">Email</span>
              </div>
              <div className="flex gap-3 text-xs font-medium flex-wrap">
                <span className="text-[#16A34A] flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#16A34A"/><path d="M2.5 5l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {nh.email.sent.toLocaleString()} sent
                </span>
                <span className="text-[#D97706] flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1"/><path d="M5 3.5v2.5M5 7.2v.3" stroke="#D97706" strokeWidth="1.1" strokeLinecap="round"/></svg>
                  {nh.email.retrying} retrying
                </span>
                <span className="text-[#DC2626] flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1"/><path d="M3 3l4 4M7 3L3 7" stroke="#DC2626" strokeWidth="1.1" strokeLinecap="round"/></svg>
                  {nh.email.failed} failed
                </span>
              </div>
            </div>
            {/* Calendar */}
            <div className="flex items-start justify-between p-3 bg-[#F8FAFC] rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="#2563EB" strokeWidth="1.2" />
                    <path d="M1 6h12M4 1v3M10 1v3" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-[#334155]">Calendar</span>
              </div>
              <div className="flex gap-3 text-xs font-medium">
                <span className="text-[#16A34A] flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#16A34A"/><path d="M2.5 5l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {nh.calendar.synced} synced
                </span>
                <span className="text-[#D97706] flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1"/><path d="M5 3.5v2.5M5 7.2v.3" stroke="#D97706" strokeWidth="1.1" strokeLinecap="round"/></svg>
                  {nh.calendar.pending} pending
                </span>
              </div>
            </div>
            {/* LLM */}
            <div className="flex items-start justify-between p-3 bg-[#F8FAFC] rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2l1.5 3H12l-2.5 2 1 3L7 8.5 4.5 10l1-3L3 5h3.5L7 2z" fill="#2563EB" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-[#334155]">AI / LLM</span>
              </div>
              <div className="flex gap-3 text-xs font-medium">
                <span className="text-[#16A34A] flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#16A34A"/><path d="M2.5 5l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {nh.llm.generated} generated
                </span>
                <span className="text-[#DC2626] flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1"/><path d="M3 3l4 4M7 3L3 7" stroke="#DC2626" strokeWidth="1.1" strokeLinecap="round"/></svg>
                  {nh.llm.failed} failed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Manage Doctors ────────────────────────────────────────────────────────────
function ManageDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", email: "", specialization: "", slotDuration: "30" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const loadDoctors = () => {
    setLoading(true);
    api.getAdminDoctors()
      .then(setDoctors)
      .catch(() => setToast("Could not load doctors list."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleAddDoctor = async () => {
    if (!newDoc.name || !newDoc.email || !newDoc.specialization) return;
    setSaving(true);
    try {
      await api.createAdminDoctor(newDoc);
      setAddModal(false);
      setNewDoc({ name: "", email: "", specialization: "", slotDuration: "30" });
      setToast(`Dr. ${newDoc.name} added successfully.`);
      loadDoctors();
    } catch (err: any) {
      setToast(err.message || "Failed to create doctor.");
    } finally {
      setSaving(false);
    }
  };

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-5 animate-fade-in">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      <ConfirmModal
        open={addModal}
        title="Add New Doctor"
        onConfirm={handleAddDoctor}
        onCancel={() => setAddModal(false)}
        confirmLabel={saving ? "Adding…" : "Add Doctor"}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1">Full name</label>
            <input
              type="text"
              value={newDoc.name}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              placeholder="Dr. Jane Smith"
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1">Email</label>
            <input
              type="email"
              value={newDoc.email}
              onChange={(e) => setNewDoc({ ...newDoc, email: e.target.value })}
              placeholder="doctor@clinic.io"
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">Specialization</label>
              <input
                type="text"
                value={newDoc.specialization}
                onChange={(e) => setNewDoc({ ...newDoc, specialization: e.target.value })}
                placeholder="Cardiology"
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">Slot duration</label>
              <select
                value={newDoc.slotDuration}
                onChange={(e) => setNewDoc({ ...newDoc, slotDuration: e.target.value })}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 bg-white"
              >
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
          </div>
        </div>
      </ConfirmModal>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Manage Doctors</h1>
        <button
          onClick={() => setAddModal(true)}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          + Add Doctor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3">Doctor</th>
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3">Specialization</th>
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3 hidden sm:table-cell">Slot Duration</th>
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3 hidden md:table-cell">Working Days</th>
                <th className="text-right text-xs font-semibold text-[#94A3B8] px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#94A3B8]">Loading doctors…</td>
                </tr>
              ) : doctors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#94A3B8]">No doctors found.</td>
                </tr>
              ) : (
                doctors.map((doc, i) => (
                  <tr key={doc.id} className={`border-b border-[#F8FAFC] hover:bg-[#F8FAFC] transition-colors ${i === doctors.length - 1 ? "border-0" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#2563EB]">
                            {doc.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-[#0F172A] block">{doc.name}</span>
                          <span className="text-xs text-[#94A3B8]">{doc.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[#475569]">{doc.specialization}</span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-sm text-[#475569]">{doc.slotDuration} min</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-[#475569]">
                        {doc.workingHours?.map((w: any) => DAY_NAMES[w.dayOfWeek]).join(", ") || "Mon-Fri"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <StatusBadge status="CONFIRMED" size="xs" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Leave Management ──────────────────────────────────────────────────────────
function LeaveManagement() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const loadData = () => {
    api.getAdminDoctors().then(setDoctors).catch(() => {});
    api.getAdminLeaves().then(setLeaves).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckConflicts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !startDate || !endDate) return;

    try {
      const result = await api.getLeaveConflicts({ doctorId: selectedDoctor, startDate, endDate });
      setConflicts(result);
      setPreviewOpen(true);
    } catch (err: any) {
      setToast(err.message || "Could not check conflicts.");
    }
  };

  const handleConfirmLeave = async () => {
    setSubmitting(true);
    try {
      const res = await api.createAdminLeave({
        doctorId: selectedDoctor,
        startDate,
        endDate,
        reason: reason || undefined,
      });
      setPreviewOpen(false);
      setToast(`Leave recorded. ${res.cancelledCount || 0} affected appointments cancelled and notified.`);
      setSelectedDoctor("");
      setStartDate("");
      setEndDate("");
      setReason("");
      loadData();
    } catch (err: any) {
      setToast(err.message || "Failed to schedule leave.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <ConfirmModal
        open={previewOpen}
        title="Confirm Leave & Cancel Affected Appointments"
        onConfirm={handleConfirmLeave}
        onCancel={() => setPreviewOpen(false)}
        confirmLabel={submitting ? "Processing…" : "Confirm Leave"}
        cancelLabel="Go Back"
        destructive={conflicts.length > 0}
      >
        <div className="space-y-4">
          {conflicts.length > 0 ? (
            <div className="flex items-center gap-2 p-3 bg-[#FEF3C7] rounded-xl border border-[#FDE68A]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2l6 12H2L8 2z" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 7v3M8 11.5v.5" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-medium text-[#92400E]">
                {conflicts.length} appointment{conflicts.length > 1 ? "s" : ""} will be cancelled by this leave
              </p>
            </div>
          ) : (
            <div className="p-3 bg-[#DCFCE7] rounded-xl border border-[#86EFAC] text-sm text-[#166534]">
              No conflicting appointments found in this range.
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="text-left text-xs font-semibold text-[#94A3B8] px-4 py-2.5">Patient</th>
                    <th className="text-left text-xs font-semibold text-[#94A3B8] px-4 py-2.5">Date / Time</th>
                    <th className="text-right text-xs font-semibold text-[#94A3B8] px-4 py-2.5">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map((c, i) => (
                    <tr key={i} className="border-b border-[#F8FAFC] last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{c.patient}</td>
                      <td className="px-4 py-3 text-sm text-[#475569]">{new Date(c.slotStart).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status="CANCELLED_BY_LEAVE" size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-[#94A3B8]">Each affected patient will automatically receive a cancellation email notification.</p>
        </div>
      </ConfirmModal>

      <h1 className="text-2xl font-semibold text-[#0F172A]">Leave Management</h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Add Leave Form */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-semibold text-[#475569] mb-4">Add Doctor Leave</h3>
          <form onSubmit={handleCheckConflicts} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Doctor</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 bg-white"
              >
                <option value="">Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">From Date</label>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">To Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1.5">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Annual leave, Medical conference"
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors"
            >
              Check Conflicts & Preview →
            </button>
          </form>
        </div>

        {/* Active leaves */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-semibold text-[#475569] mb-4">Recorded Leaves</h3>
          {leaves.length === 0 ? (
            <p className="text-sm text-[#94A3B8] py-8 text-center">No doctor leaves scheduled.</p>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave, i) => (
                <div key={leave.id || i} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-[#2563EB]">
                        {leave.doctorName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "DR"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{leave.doctorName}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                        {leave.reason ? ` · ${leave.reason}` : ""}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="CONFIRMED" size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Notification Center ───────────────────────────────────────────────────────
function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.getAdminNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filters = ["All", "SENT", "RETRY", "FAILED_PERMANENTLY"];
  const filterLabels: Record<string, string> = { All: "All", SENT: "Sent", RETRY: "Retrying", FAILED_PERMANENTLY: "Failed" };

  const filtered = filter === "All"
    ? notifications
    : notifications.filter((n) => n.status === filter);

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Notification Center</h1>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              filter === f
                ? "bg-[#0F172A] text-white border-[#0F172A]"
                : "border-[#E2E8F0] text-[#475569] hover:border-[#0F172A]"
            }`}
          >
            {filterLabels[f]}
            <span className={`ml-1.5 ${filter === f ? "text-white/70" : "text-[#94A3B8]"}`}>
              ({f === "All" ? notifications.length : notifications.filter((n) => n.status === f).length})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F1F5F9]">
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3">Recipient</th>
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3 hidden md:table-cell">Attempts</th>
                <th className="text-left text-xs font-semibold text-[#94A3B8] px-5 py-3 hidden lg:table-cell">Last Error</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#94A3B8]">Loading notification jobs…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#94A3B8]">No notifications found.</td>
                </tr>
              ) : (
                filtered.map((n, i) => (
                  <React.Fragment key={n.id}>
                    <tr
                      onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                      className={`border-b border-[#F8FAFC] hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                        i === filtered.length - 1 && expanded !== n.id ? "border-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-[#0F172A] block">{n.recipient}</span>
                        {n.recipientEmail && <span className="text-xs text-[#94A3B8]">{n.recipientEmail}</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="text-xs font-mono text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          {n.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={n.status} size="xs" />
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className={`text-sm ${n.attempts >= 4 ? "text-[#DC2626] font-medium" : "text-[#475569]"}`}>
                          {n.attempts}/5
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {n.lastError ? (
                          <span className="text-xs text-[#94A3B8] truncate max-w-48 block">{n.lastError}</span>
                        ) : (
                          <span className="text-xs text-[#CBD5E1]">—</span>
                        )}
                      </td>
                    </tr>
                    {expanded === n.id && (
                      <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                        <td colSpan={5} className="px-5 py-3">
                          <div className="text-xs space-y-1">
                            <p><span className="text-[#94A3B8]">Channel:</span> <span className="text-[#475569]">{n.channel}</span></p>
                            {n.sentAt && <p><span className="text-[#94A3B8]">Sent at:</span> <span className="text-[#475569]">{new Date(n.sentAt).toLocaleString()}</span></p>}
                            <p><span className="text-[#94A3B8]">Created:</span> <span className="text-[#475569]">{new Date(n.createdAt).toLocaleString()}</span></p>
                            {n.lastError && <p><span className="text-[#94A3B8]">Error:</span> <span className="text-[#DC2626]">{n.lastError}</span></p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminAuditLog()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Audit Trail</h1>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-[#94A3B8] p-8 text-center">No audit trail entries recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {logs.map((entry, i) => (
              <div key={entry.id || i} className={`px-5 py-4 hover:bg-[#F8FAFC] transition-colors ${i < logs.length - 1 ? "border-b border-[#F8FAFC]" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                        {entry.action}
                      </code>
                      <span className="text-xs text-[#94A3B8]">on</span>
                      <code className="text-xs font-mono text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {entry.entity}/{entry.entityId}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-[#94A3B8]">by</span>
                      <span className="text-xs font-medium text-[#475569]">{entry.actor}</span>
                      {entry.metadata && (
                        <>
                          <span className="text-xs text-[#CBD5E1]">·</span>
                          <span className="text-xs text-[#94A3B8] font-mono truncate max-w-sm">
                            {JSON.stringify(entry.metadata)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[#94A3B8] flex-shrink-0 font-mono">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin Portal Root ─────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [view, setView] = useState("dashboard");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {view === "dashboard" && <AdminDashboard />}
        {view === "doctors" && <ManageDoctors />}
        {view === "leaves" && <LeaveManagement />}
        {view === "notifications" && <NotificationCenter />}
        {view === "audit" && <AuditLog />}
      </div>
    </div>
  );
}

// ── System & Worker Telemetry HUD ─────────────────────────────────────────────
function SystemTelemetry() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchTelemetry = () => {
    setLoading(true);
    api.getAdminTelemetry()
      .then((data) => {
        setTelemetry(data);
        setLastRefreshed(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !telemetry) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-semibold text-[#0F172A]">Worker Telemetry & Integrations</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { queues, dbStatus, uptimeSeconds } = telemetry || {
    queues: {
      email: { total: 0, pending: 0, sent: 0, retrying: 0, failed: 0, healthScore: 100 },
      calendarSync: { synced: 0, pending: 0, failed: 0 },
      aiTriage: { success: 0, pending: 0, invalidSchema: 0, failed: 0, successRate: 100 },
    },
    dbStatus: "CONNECTED",
    uptimeSeconds: 0,
  };

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">System Telemetry & Background Queues</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Live observability over asynchronous BullMQ workers, third-party APIs, and DB connection</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#94A3B8]">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchTelemetry}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-medium text-[#475569] rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M14 8A6 6 0 118 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Top Status Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#94A3B8]">PostgreSQL State</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-sm font-semibold text-[#0F172A]">{dbStatus}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#94A3B8]">Backend Uptime</p>
          <p className="text-sm font-semibold text-[#0F172A] mt-1">{formatUptime(uptimeSeconds)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#94A3B8]">Email Delivery Health</p>
          <p className="text-sm font-semibold text-[#16A34A] mt-1">{queues.email.healthScore}% OK</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-[#94A3B8]">AI Triage Reliability</p>
          <p className="text-sm font-semibold text-[#2563EB] mt-1">{queues.aiTriage.successRate}% Parsed</p>
        </div>
      </div>

      {/* Detailed Queue Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Email Worker */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2 5l6 4.5L14 5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Email Notification Queue</h3>
                <p className="text-xs text-[#94A3B8]">BullMQ / Nodemailer</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Sent</span>
              <span className="text-sm font-bold text-[#16A34A]">{queues.email.sent}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Pending</span>
              <span className="text-sm font-bold text-[#D97706]">{queues.email.pending}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Retrying</span>
              <span className="text-sm font-bold text-[#2563EB]">{queues.email.retrying}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Dead-Letter / Failed</span>
              <span className="text-sm font-bold text-[#DC2626]">{queues.email.failed}</span>
            </div>
          </div>
        </div>

        {/* Google Calendar Sync */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2 6h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Google Calendar Sync</h3>
                <p className="text-xs text-[#94A3B8]">OAuth 2.0 Service</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Synced</span>
              <span className="text-sm font-bold text-[#16A34A]">{queues.calendarSync.synced}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Pending</span>
              <span className="text-sm font-bold text-[#D97706]">{queues.calendarSync.pending}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Failed</span>
              <span className="text-sm font-bold text-[#DC2626]">{queues.calendarSync.failed}</span>
            </div>
          </div>
        </div>

        {/* Gemini Generative AI */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5l1.8 3.8L14 6l-3.2 2.8.8 4.2L8 10.8 4.4 13l.8-4.2L2 6l4.2-.7L8 1.5z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Gemini 1.5 Flash Triage</h3>
                <p className="text-xs text-[#94A3B8]">Zod Schema Validated</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Success</span>
              <span className="text-sm font-bold text-[#16A34A]">{queues.aiTriage.success}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Pending</span>
              <span className="text-sm font-bold text-[#D97706]">{queues.aiTriage.pending}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Schema Fallback</span>
              <span className="text-sm font-bold text-[#475569]">{queues.aiTriage.invalidSchema}</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] rounded-lg">
              <span className="text-[#64748B] block">Failed API</span>
              <span className="text-sm font-bold text-[#DC2626]">{queues.aiTriage.failed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Portal Root ────────────────────────────────────────────────────────
const ADMIN_NAV = [
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
    id: "doctors",
    label: "Manage Doctors",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8 9v3M6.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "leaves",
    label: "Leave Management",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 6.5h14M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5 10h4M5 12.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "telemetry",
    label: "Worker Telemetry",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        <circle cx="9" cy="8" r="1.5" fill="currentColor" />
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3.5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 7l7 4.5L15 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export { AdminDashboard, ManageDoctors, LeaveManagement, SystemTelemetry, NotificationCenter, AuditLog, ADMIN_NAV };

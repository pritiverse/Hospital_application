import { useState, useEffect, useCallback } from "react";

// ── StatusBadge ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  HELD:                { bg: "bg-[#F1F5F9]", text: "text-[#334155]", label: "Reserved" },
  CONFIRMED:           { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", label: "Confirmed" },
  COMPLETED:           { bg: "bg-[#F1F5F9]", text: "text-[#475569]", label: "Completed" },
  CANCELLED_BY_PATIENT:{ bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "Cancelled" },
  CANCELLED_BY_DOCTOR: { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "Cancelled" },
  CANCELLED_BY_LEAVE:  { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "Cancelled" },
  EXPIRED:             { bg: "bg-[#F1F5F9]", text: "text-[#475569]", label: "Expired" },
  RESCHEDULED:         { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]", label: "Rescheduled" },
  NO_SHOW:             { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "No Show" },
  PENDING:             { bg: "bg-[#FEF3C7]", text: "text-[#D97706]", label: "Processing" },
  SUCCESS:             { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", label: "Generated" },
  FAILED:              { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "Unavailable" },
  INVALID_SCHEMA:      { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "Unavailable" },
  SYNCED:              { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", label: "Synced" },
  SENT:                { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", label: "Sent" },
  RETRY:               { bg: "bg-[#FEF3C7]", text: "text-[#D97706]", label: "Retrying" },
  FAILED_PERMANENTLY:  { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "Failed" },
  PROCESSING:          { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]", label: "Processing" },
  Low:                 { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", label: "Low" },
  Medium:              { bg: "bg-[#FEF3C7]", text: "text-[#D97706]", label: "Medium" },
  High:                { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", label: "High" },
};

export function StatusBadge({ status, size = "sm" }: { status: string; size?: "xs" | "sm" }) {
  const cfg = STATUS_CONFIG[status] ?? { bg: "bg-[#F1F5F9]", text: "text-[#475569]", label: status };
  const px = size === "xs" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${px} ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ── CountdownTimer ───────────────────────────────────────────────────────────
export function CountdownTimer({ expiresAt, onExpire }: { expiresAt: Date; onExpire?: () => void }) {
  const getRemaining = useCallback(() => {
    const diff = Math.max(0, expiresAt.getTime() - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { diff, m, s };
  }, [expiresAt]);

  const [time, setTime] = useState(getRemaining);

  useEffect(() => {
    if (time.diff === 0) return;
    const id = setInterval(() => {
      const next = getRemaining();
      setTime(next);
      if (next.diff === 0) { clearInterval(id); onExpire?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [getRemaining, time.diff, onExpire]);

  const urgent = time.m < 2;
  const display = `${String(time.m).padStart(2, "0")}:${String(time.s).padStart(2, "0")}`;
  // Countdown uses a square-pill + border to distinguish from circular urgency badges
  return (
    <span
      role="timer"
      aria-live="polite"
      aria-label={`Slot reserved — ${time.m} minutes ${time.s} seconds remaining`}
      className={`inline-flex items-center gap-1.5 font-medium text-sm px-3 py-1.5 rounded-lg border ${
        urgent
          ? "bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/30"
          : "bg-[#FEF3C7] text-[#D97706] border-[#D97706]/30"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgent ? "bg-[#DC2626]" : "bg-[#D97706]"}`} />
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 4v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 1.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      Reserved — {display} remaining
    </span>
  );
}

// ── TimelineStep ─────────────────────────────────────────────────────────────
export function Timeline({ steps }: { steps: { label: string; state: string; time: string | null }[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="flex gap-3 relative">
            {!isLast && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-[#E2E8F0]" />
            )}
            <div className="flex-shrink-0 mt-1 relative z-10">
              {step.state === "done" && (
                <div className="w-6 h-6 rounded-full bg-[#16A34A] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {step.state === "active" && (
                <div className="w-6 h-6 rounded-full bg-[#2563EB] animate-pulse-ring flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
              )}
              {step.state === "pending" && (
                <div className="w-6 h-6 rounded-full border-2 border-[#CBD5E1] bg-white" />
              )}
              {step.state === "failed" && (
                <div className="w-6 h-6 rounded-full bg-[#FEE2E2] border border-[#DC2626] flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              {step.state === "warning" && (
                <div className="w-6 h-6 rounded-full bg-[#FEF3C7] border border-[#D97706] flex items-center justify-center">
                  <span className="text-[#D97706] text-[10px] font-bold">!</span>
                </div>
              )}
            </div>
            <div className="pb-5 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${
                  step.state === "pending" ? "text-[#94A3B8]" : "text-[#0F172A]"
                }`}>{step.label}</p>
                {(step.state === "failed" || step.state === "warning") && (
                  <button className="text-xs text-[#2563EB] hover:underline flex-shrink-0">Retry</button>
                )}
              </div>
              {step.time && (
                <p className="text-xs text-[#94A3B8] mt-0.5">{step.time}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AiSummaryCard ────────────────────────────────────────────────────────────
export function AiSummaryCard({
  data,
  status,
  title = "AI Pre-Visit Summary",
  fallbackSymptoms,
}: {
  data?: { urgency?: string; chiefComplaint?: string; suggestedQuestions?: string[] };
  status: string;
  title?: string;
  fallbackSymptoms?: string;
}) {
  if (status === "PENDING") {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    );
  }

  if (status !== "SUCCESS") {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" stroke="#94A3B8" strokeWidth="1.5" />
              <path d="M8 5v4M8 10.5v.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#475569]">AI summary unavailable</p>
            <p className="text-sm text-[#94A3B8] mt-1">
              {fallbackSymptoms
                ? "See patient symptom notes below — your doctor will review directly."
                : "Your doctor will review your symptoms directly before the consultation."}
            </p>
            {fallbackSymptoms && (
              <p className="text-sm text-[#475569] mt-2 p-3 bg-white rounded-lg border border-[#E2E8F0]">{fallbackSymptoms}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-[#EFF6FF] flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1l1.5 3H11l-2.5 2 1 3L6 7.5 2.5 9l1-3L1 4h3.5L6 1z" fill="#2563EB" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-[#475569] uppercase tracking-wide">{title}</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#475569]">Urgency</span>
          <StatusBadge status={data?.urgency ?? "Low"} size="xs" />
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] mb-1">Chief complaint</p>
          <p className="text-sm text-[#0F172A]">{data?.chiefComplaint}</p>
        </div>
        {data?.suggestedQuestions && data.suggestedQuestions.length > 0 && (
          <div>
            <p className="text-xs text-[#94A3B8] mb-1.5">Suggested questions</p>
            <ol className="space-y-1">
              {data.suggestedQuestions.map((q, i) => (
                <li key={i} className="text-sm text-[#334155] flex gap-2">
                  <span className="text-[#94A3B8] flex-shrink-0">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#E2E8F0]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5A4.5 4.5 0 116 10.5 4.5 4.5 0 016 1.5z" stroke="#94A3B8" strokeWidth="1" />
            <path d="M6 5v3M6 4.5v-.5" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <p className="text-[11px] text-[#94A3B8]">AI-generated — reviewed by your doctor before the visit</p>
        </div>
      </div>
    </div>
  );
}

// ── ConfirmModal ─────────────────────────────────────────────────────────────
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Go Back",
  onConfirm,
  onCancel,
  destructive = false,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-w-lg w-full p-6 animate-fade-in"
      >
        <h3 className="text-lg font-semibold text-[#0F172A] mb-4">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              destructive
                ? "bg-[#DC2626] hover:opacity-90 text-white"
                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CalendarSyncIcon ─────────────────────────────────────────────────────────
export function CalendarSyncIcon({ status }: { status: string }) {
  if (status === "SYNCED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#16A34A]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#16A34A" strokeWidth="1.2" />
          <path d="M3 5.5l2 2 4-3" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Synced
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#D97706]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#D97706" strokeWidth="1.2" />
          <path d="M6 5v2.5M6 9v.5" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Sync pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8]">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#CBD5E1" strokeWidth="1.2" />
      </svg>
      Pending
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-semibold text-[#0F172A]">{value}</p>
      {sub && <p className="text-xs text-[#94A3B8] mt-1">{sub}</p>}
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="bg-[#0F172A] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#16A34A" />
          <path d="M5 8l2.5 2.5L11 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {message}
      </div>
    </div>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#16A34A" />
      <path d="M5 8l2.5 2.5L11 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

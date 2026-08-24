import { useState } from "react";
import { api, saveAuthUser } from "../data/api";

type Role = "patient" | "doctor" | "admin";

// Demo credentials that match the seed data in apps/backend/prisma/seed.ts
const ROLE_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  patient: { email: "patient@example.com", password: "password" },
  doctor:  { email: "doctor@example.com",  password: "password" },
  admin:   { email: "admin@example.com",   password: "password" },
};

const ROLE_META: Record<Role, {
  label: string;
  tagline: string;
  accent: string;
  accentLight: string;
  accentText: string;
  iconBg: string;
  icon: React.ReactNode;
  features: string[];
}> = {
  patient: {
    label: "Patient Portal",
    tagline: "Book appointments, track your care, review prescriptions.",
    accent: "#2563EB",
    accentLight: "#EFF6FF",
    accentText: "#1D4ED8",
    iconBg: "#DBEAFE",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="10" r="5" stroke="#2563EB" strokeWidth="2" />
        <path d="M4 26c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    features: ["Book & reschedule appointments", "View AI pre-visit summaries", "Track prescriptions & reminders"],
  },
  doctor: {
    label: "Doctor Portal",
    tagline: "Manage your schedule, review patients, record visits.",
    accent: "#16A34A",
    accentLight: "#F0FDF4",
    accentText: "#15803D",
    iconBg: "#DCFCE7",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="5" width="22" height="18" rx="3" stroke="#16A34A" strokeWidth="2" />
        <path d="M14 10v8M10 14h8" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    features: ["Today's patient queue", "AI-assisted patient briefs", "Visit notes & prescription builder"],
  },
  admin: {
    label: "Admin Portal",
    tagline: "Oversee operations, manage doctors, monitor the system.",
    accent: "#D97706",
    accentLight: "#FFFBEB",
    accentText: "#B45309",
    iconBg: "#FEF3C7",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke="#D97706" strokeWidth="2" />
        <path d="M14 8v6l4 2" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    features: ["Doctor & leave management", "Notification center with retry log", "Full audit trail"],
  },
};

const PORTAL_TABS: { role: Role; label: string }[] = [
  { role: "patient", label: "Patient" },
  { role: "doctor",  label: "Doctor" },
  { role: "admin",   label: "Admin" },
];

// Maps backend Role enum to frontend role
const mapRole = (backendRole: string): Role => {
  switch (backendRole) {
    case "DOCTOR": return "doctor";
    case "ADMIN": return "admin";
    default: return "patient";
  }
};

export default function LoginPage({
  onLogin,
}: {
  onLogin: (role: Role, user: { id: string; name: string; email: string }) => void;
}) {
  const [activeRole, setActiveRole] = useState<Role>("patient");
  const [email, setEmail] = useState(ROLE_CREDENTIALS.patient.email);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const meta = ROLE_META[activeRole];

  const handleRoleSwitch = (role: Role) => {
    setActiveRole(role);
    setEmail(ROLE_CREDENTIALS[role].email);
    setPassword("");
    setError("");
    setTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!email || !password) return;
    setError("");
    setLoading(true);

    try {
      const result = await api.login({ email, password });
      // result = { user: { id, name, email, role }, token }
      saveAuthUser(result);
      const role = mapRole(result.user.role);
      onLogin(role, { id: result.user.id, name: result.user.name, email: result.user.email });
    } catch (err: any) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(ROLE_CREDENTIALS[activeRole].email);
    setPassword(ROLE_CREDENTIALS[activeRole].password);
    setError("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#EFF6FF] to-[#F8FAFC] p-6">
      <div className="w-full max-w-4xl glass md:flex rounded-2xl overflow-hidden shadow-xl">
        {/* Left side – brand & features */}
        <section className="md:w-1/2 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-8 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2v14M2 9h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-2xl font-semibold text-white tracking-tight">CareSync</span>
            </div>
            {/* Headline */}
            <h1 className="text-3xl font-bold text-white leading-snug mb-3">
              {activeRole === "patient" && "Your health, organized."}
              {activeRole === "doctor" && "Patient care, streamlined."}
              {activeRole === "admin" && "Clinical ops, in one view."}
            </h1>
            <p className="text-white/80 text-sm leading-relaxed">{meta.tagline}</p>
            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {meta.features.map((f) => (
                <div key={f} className="flex items-center gap-2 p-3 bg-white/20 rounded-lg">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                    <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm text-white/90">{f}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom note */}
          <p className="text-xs text-white/40 mt-10">Demo project · Educational use only · Not HIPAA‑compliant</p>
        </section>

        {/* Right side – login form */}
        <section className="md:w-1/2 bg-white/80 p-8 flex flex-col justify-center">
          {/* Portal tabs */}
          <div className="flex gap-1 p-1 bg-[#F1F5F9] rounded-2xl mb-8">
            {PORTAL_TABS.map(({ role, label }) => (
              <button
                key={role}
                onClick={() => handleRoleSwitch(role)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all transform hover:-translate-y-0.5 ${
                  activeRole === role ? "bg-white shadow-sm text-[#0F172A]" : "text-[#94A3B8] hover:text-[#475569]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form header */}
          <div className="mb-8 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto" style={{ backgroundColor: meta.iconBg }}>
              {meta.icon}
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Sign in</h2>
            <p className="text-sm text-[#94A3B8] mt-1">
              {activeRole === "patient" && "Access your patient portal"}
              {activeRole === "doctor" && "Access your clinical dashboard"}
              {activeRole === "admin" && "Access system administration"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Email address</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2.5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.4" /></svg>
                </div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 transition-all ${
                    touched && !email ? "border-[#DC2626] focus:ring-[#DC2626]/20" : "border-[#E2E8F0] focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wide">Password</label>
                <button type="button" onClick={fillDemo} className="text-xs font-medium hover:underline" style={{ color: meta.accent }}>
                  Fill demo credentials
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 transition-all ${
                    touched && !password ? "border-[#DC2626] focus:ring-[#DC2626]/20" : "border-[#E2E8F0] focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors"
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.7A2 2 0 019.3 9.5M3 7.5C4.5 5 6 3.5 8 3.5c1 0 2 .4 2.8 1.1M5.2 10.8C6 11.5 7 12 8 12c2.5 0 4.5-2 6-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8c1.5-3 3.5-5 6-5s4.5 2 6 5c-1.5 3-3.5 5-6 5S3.5 11 2 8z" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl animate-fade-in" role="alert">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5"><circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.4" /><path d="M8 5v4M8 10.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <p className="text-sm text-[#DC2626]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 transform hover:-translate-y-0.5"
              style={{ backgroundColor: meta.accent }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in to {meta.label.split(" ")[0]} Portal
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </>
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <p className="text-xs font-semibold text-[#475569] mb-2 uppercase tracking-wide">Demo credentials</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">Email</span>
                <code className="text-[#334155] font-mono bg-white border border-[#E2E8F0] px-2 py-0.5 rounded">{ROLE_CREDENTIALS[activeRole].email}</code>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">Password</span>
                <code className="text-[#334155] font-mono bg-white border border-[#E2E8F0] px-2 py-0.5 rounded">{ROLE_CREDENTIALS[activeRole].password}</code>
              </div>
            </div>
          </div>

          {/* Switch portal link */}
          <p className="text-center text-xs text-[#CBD5E1] mt-6">
            Not your portal?{' '}
            {PORTAL_TABS.filter((t) => t.role !== activeRole).map((t, i, arr) => (
              <span key={t.role}>
                <button onClick={() => handleRoleSwitch(t.role)} className="underline text-[#94A3B8] hover:text-[#475569]">{t.label}</button>
                {i < arr.length - 1 && ' or '}
              </span>
            ))}{' '}portal
          </p>
        </section>
      </div>
    </div>
  );
}

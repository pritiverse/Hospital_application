import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import {
  FindDoctor,
  BookAppointment,
  MyAppointments,
  AppointmentDetail,
  PatientNotifications,
  NotifIcon,
  NAV_ITEMS as PATIENT_NAV,
} from "./portals/PatientPortal";
import {
  DoctorDashboard,
  PatientQueue,
  VisitForm,
  DoctorSchedule,
  DOCTOR_NAV,
} from "./portals/DoctorPortal";
import {
  AdminDashboard,
  ManageDoctors,
  LeaveManagement,
  NotificationCenter,
  AuditLog,
  ADMIN_NAV,
} from "./portals/AdminPortal";
import { StatusBadge as SB, CountdownTimer, Toast } from "./components/Shared";
import { api, getAuthUser, clearAuth } from "./data/api";

type Role = "patient" | "doctor" | "admin";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const ROLE_BADGE: Record<Role, string> = {
  patient: "bg-[#EFF6FF] text-[#2563EB]",
  doctor:  "bg-[#DCFCE7] text-[#16A34A]",
  admin:   "bg-[#FEF3C7] text-[#D97706]",
};

const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  doctor:  "Doctor",
  admin:   "Admin",
};

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<Role>("patient");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [patientView, setPatientView] = useState("dashboard");
  const [doctorView, setDoctorView] = useState("dashboard");
  const [adminView, setAdminView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Selected context IDs passed between views
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = getAuthUser();
    const token = localStorage.getItem('cs_token');
    if (storedUser && token) {
      const r = storedUser.role?.toLowerCase() as Role;
      if (r === 'patient' || r === 'doctor' || r === 'admin') {
        setRole(r);
        setUser({ id: storedUser.id, name: storedUser.name, email: storedUser.email });
        setAuthed(true);
      }
    }

    const handleUnauthorized = () => {
      setAuthed(false);
      setUser(null);
    };

    window.addEventListener('cs:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('cs:unauthorized', handleUnauthorized);
  }, []);

  if (!authed) {
    return (
      <LoginPage
        onLogin={(r, u) => {
          setRole(r);
          setUser(u);
          setPatientView("dashboard");
          setDoctorView("dashboard");
          setAdminView("dashboard");
          setAuthed(true);
        }}
      />
    );
  }

  const nav = role === "patient" ? PATIENT_NAV : role === "doctor" ? DOCTOR_NAV : ADMIN_NAV;
  const currentView = role === "patient" ? patientView : role === "doctor" ? doctorView : adminView;
  const setCurrentView = role === "patient" ? setPatientView : role === "doctor" ? setDoctorView : setAdminView;

  const handleLogout = () => {
    clearAuth();
    setAuthed(false);
    setUser(null);
    setSidebarOpen(false);
  };

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-[#E2E8F0] flex items-center px-4 gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] z-10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#475569]"
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v11M2.5 7h9" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#0F172A]">CareSync</span>
        </div>

        <div className="flex-1" />

        {/* User info */}
        <div className="flex items-center gap-2 ml-1">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_BADGE[role]}`}>
            {ROLE_LABEL[role]}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center">
            <span className="text-xs font-semibold text-[#475569]">{initials}</span>
          </div>
          <span className="text-xs font-medium text-[#0F172A] hidden sm:block">{user?.name ?? ""}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-[#94A3B8] hover:text-[#475569] hidden sm:block"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`flex-shrink-0 w-56 bg-white border-r border-[#E2E8F0] flex flex-col z-30 transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } fixed lg:static inset-y-14 left-0`}
        >
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto pt-4">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => { setCurrentView(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                  currentView === item.id
                    ? "bg-[#EFF6FF] text-[#2563EB] font-semibold"
                    : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
                {currentView === item.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-[#F1F5F9]">
            <div className="p-2.5 bg-[#F8FAFC] rounded-xl">
              <p className="text-[11px] text-[#94A3B8] font-medium">Demo Mode</p>
              <p className="text-[10px] text-[#CBD5E1] mt-0.5">Not for clinical use</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">

            {/* Patient screens */}
            {role === "patient" && patientView === "dashboard" && (
              <PatientDashboard
                userName={firstName}
                onNavigate={setPatientView}
                onSelectAppointment={(id) => { setSelectedAppointmentId(id); setPatientView("appointment-detail"); }}
              />
            )}
            {role === "patient" && patientView === "doctors" && (
              <FindDoctor
                onBook={(doctorId) => {
                  setSelectedDoctorId(doctorId);
                  setPatientView("book");
                }}
              />
            )}
            {role === "patient" && patientView === "book" && (
              <BookAppointment
                doctorId={selectedDoctorId}
                onDone={(apptId) => {
                  setSelectedAppointmentId(apptId ?? null);
                  setPatientView("appointment-detail");
                }}
              />
            )}
            {role === "patient" && patientView === "appointments" && (
              <MyAppointments
                onDetail={(id) => {
                  setSelectedAppointmentId(id);
                  setPatientView("appointment-detail");
                }}
              />
            )}
            {role === "patient" && patientView === "appointment-detail" && (
              <AppointmentDetail appointmentId={selectedAppointmentId} onBack={() => setPatientView("appointments")} />
            )}
            {role === "patient" && patientView === "notifications" && (
              <PatientNotifications />
            )}

            {/* Doctor screens */}
            {role === "doctor" && doctorView === "dashboard" && (
              <DoctorDashboard userName={firstName} onNavigate={setDoctorView} />
            )}
            {role === "doctor" && doctorView === "queue" && (
              <PatientQueue
                onVisit={(queueItem) => {
                  setSelectedQueueItem(queueItem);
                  setDoctorView("visit");
                }}
              />
            )}
            {role === "doctor" && doctorView === "visit" && (
              <VisitForm queueItem={selectedQueueItem} onDone={() => setDoctorView("queue")} />
            )}
            {role === "doctor" && doctorView === "schedule" && <DoctorSchedule />}

            {/* Admin screens */}
            {role === "admin" && adminView === "dashboard" && <AdminDashboard />}
            {role === "admin" && adminView === "doctors" && <ManageDoctors />}
            {role === "admin" && adminView === "leaves" && <LeaveManagement />}
            {role === "admin" && adminView === "notifications" && <NotificationCenter />}
            {role === "admin" && adminView === "audit" && <AuditLog />}

          </div>
        </main>
      </div>
    </div>
  );
}

// ── Patient Dashboard ─────────────────────────────────────────────────────────
function PatientDashboard({
  userName,
  onNavigate,
  onSelectAppointment,
}: {
  userName: string;
  onNavigate: (v: string) => void;
  onSelectAppointment: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([api.getAppointments(), api.getNotifications()])
      .then(([appts, notifs]) => {
        setAppointments(appts);
        setNotifications(notifs);
      })
      .catch(() => setToast("Could not load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.find((a) =>
    ["HELD", "CONFIRMED"].includes(a.status) && new Date(a.slotStart) >= new Date()
  );
  const recent = appointments.filter((a) => a.status === "COMPLETED").slice(0, 4);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">{greeting}, {userName}</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => onNavigate("doctors")}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Find a Doctor
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
      ) : upcoming ? (
        /* Upcoming appointment hero */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">Upcoming Appointment</p>
              <h2 className="text-xl font-semibold text-[#0F172A]">{upcoming.doctor}</h2>
              <p className="text-sm text-[#94A3B8] mt-0.5">{upcoming.specialization}</p>
            </div>
            <SB status={upcoming.status} />
          </div>

          <div className="flex items-center gap-2 mb-5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="11" rx="2" stroke="#94A3B8" strokeWidth="1.4" />
              <path d="M2 7h12M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-medium text-[#334155]">{upcoming.date} at {upcoming.time}</span>
            {upcoming.status === "HELD" && upcoming.holdExpiresAt && (
              <CountdownTimer expiresAt={new Date(upcoming.holdExpiresAt)} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Symptoms submitted", done: upcoming.symptomsSubmitted },
              { label: "Calendar synced", done: upcoming.calendarSync === "SYNCED" },
              { label: "Confirmed", done: upcoming.confirmed },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 p-3 rounded-xl ${item.done ? "bg-[#DCFCE7]" : "bg-[#F8FAFC]"}`}
              >
                {item.done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="#16A34A" />
                    <path d="M5 8l2.5 2.5L11 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-[#CBD5E1]" />
                )}
                <span className={`text-xs font-medium ${item.done ? "text-[#15803D]" : "text-[#94A3B8]"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-5 pt-5 border-t border-[#F1F5F9]">
            <button
              onClick={() => onSelectAppointment(upcoming.id)}
              className="text-sm font-medium text-[#2563EB] hover:underline"
            >
              View Details →
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          <p className="text-[#475569] text-sm">No upcoming appointments.</p>
          <button
            onClick={() => onNavigate("doctors")}
            className="mt-3 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            Book an Appointment
          </button>
        </div>
      )}

      {/* Recent visits */}
      {recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#475569] mb-3">Recent Visits</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recent.map((appt) => (
              <div
                key={appt.id}
                className="flex-shrink-0 w-60 bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <p className="text-sm font-medium text-[#0F172A]">{appt.doctor}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{appt.date}</p>
                <div className="mt-2"><SB status={appt.status} size="xs" /></div>
                <button
                  onClick={() => onSelectAppointment(appt.id)}
                  className="mt-3 text-xs font-medium text-[#2563EB] hover:underline"
                >
                  View Summary →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#475569] mb-3">Recent Notifications</h3>
          <div className="space-y-2">
            {notifications.slice(0, 2).map((n: any) => (
              <div
                key={n.id}
                className={`bg-white rounded-xl border p-3.5 flex gap-3 items-start ${
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
                  <p className="text-xs text-[#94A3B8] mt-0.5">{n.time}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

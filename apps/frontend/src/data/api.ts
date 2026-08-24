export const API_URL = 'http://localhost:3001/api';

// ── Auth helpers ─────────────────────────────────────────────────────────────

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('cs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const saveAuthUser = (data: { token: string; user: { id: string; name: string; role: string; email: string } }) => {
  localStorage.setItem('cs_token', data.token);
  localStorage.setItem('cs_user', JSON.stringify(data.user));
};

export const getAuthUser = (): { id: string; name: string; role: string; email: string } | null => {
  try {
    const u = localStorage.getItem('cs_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

export const clearAuth = () => {
  localStorage.removeItem('cs_token');
  localStorage.removeItem('cs_user');
};

// ── Generic fetch helper ──────────────────────────────────────────────────────

export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: defaultHeaders as HeadersInit,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cs:unauthorized'));
      }
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Request failed (${response.status})`);
  }

  return response.json();
};

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: { email: string; password: string; name: string; role: string }) =>
    apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Doctors
  getDoctors: () => apiCall('/doctors'),
  getDoctorSlots: (doctorId: string, date: string) => apiCall(`/doctors/${doctorId}/slots?date=${date}`),

  // Appointments — patient
  getAppointments: () => apiCall('/appointments'),
  getAppointment: (id: string) => apiCall(`/appointments/${id}`),
  bookAppointment: (data: { doctorId: string; slotStart: string; idempotencyKey: string }) =>
    apiCall('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  confirmAppointment: (id: string) =>
    apiCall(`/appointments/${id}/confirm`, { method: 'POST' }),
  cancelAppointment: (id: string) =>
    apiCall(`/appointments/${id}`, { method: 'DELETE' }),
  rescheduleAppointment: (id: string, data: { newSlotStart: string; idempotencyKey: string }) =>
    apiCall(`/appointments/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Symptoms + AI
  submitSymptoms: (id: string, data: { symptoms: string; severity?: string; durationDays?: number }) =>
    apiCall(`/appointments/${id}/symptoms`, { method: 'POST', body: JSON.stringify(data) }),

  // Appointments — doctor
  getTodayQueue: () => apiCall('/appointments/today'),

  // Visits
  recordVisit: (data: {
    appointmentId: string;
    clinicalNotes: string;
    diagnosis?: string;
    followUpDate?: string;
    patientSummary?: string;
    prescription: any[];
  }) => apiCall('/visits', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => apiCall('/notifications'),

  // Doctor profile
  updateSchedule: (workingHours: any[]) =>
    apiCall('/doctor/schedule', { method: 'PUT', body: JSON.stringify({ workingHours }) }),
  getDoctorLeaves: () => apiCall('/doctor/leaves'),

  // Admin
  getAdminStats: () => apiCall('/admin/stats'),
  getAdminDoctors: () => apiCall('/admin/doctors'),
  createAdminDoctor: (data: { name: string; email: string; specialization: string; slotDuration: string }) =>
    apiCall('/admin/doctors', { method: 'POST', body: JSON.stringify(data) }),
  getAdminLeaves: () => apiCall('/admin/leaves'),
  getLeaveConflicts: (data: { doctorId: string; startDate: string; endDate: string }) =>
    apiCall('/admin/leaves/conflicts', { method: 'POST', body: JSON.stringify(data) }),
  createAdminLeave: (data: { doctorId: string; startDate: string; endDate: string; reason?: string }) =>
    apiCall('/admin/leaves', { method: 'POST', body: JSON.stringify(data) }),
  getAdminNotifications: () => apiCall('/admin/notifications'),
  getAdminAuditLog: () => apiCall('/admin/audit'),
};

# CareSync — Healthcare Appointment & Follow-Up Management System

**Production Application:** [https://hospital-application-frontend.vercel.app](https://hospital-application-frontend.vercel.app/)  
**Backend API Service:** [https://caresync-backend-fk7j.onrender.com](https://caresync-backend-fk7j.onrender.com/)  
**API Health Check:** [https://caresync-backend-fk7j.onrender.com/health](https://caresync-backend-fk7j.onrender.com/health)

CareSync is an enterprise-grade healthcare management and clinical scheduling platform built with React, Node.js, Express, Prisma ORM, PostgreSQL, BullMQ, and Google Gemini Generative AI.

It streamlines clinical workflows by combining concurrency-safe slot reservations, AI-assisted pre-visit symptom triage, clinical gap detection, doctor consultation recording with crash-resilient charting, automated medication adherence tracking, and background worker telemetry into a unified, role-based application.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Test Accounts and Credentials](#test-accounts-and-credentials)
- [API Documentation](#api-documentation)
- [Authentication and Authorization](#authentication-and-authorization)
- [Database Schema and Models](#database-schema-and-models)
- [Core Application Workflows](#core-application-workflows)
- [Error Handling and Reliability](#error-handling-and-reliability)
- [Google Calendar OAuth 2.0 Setup Guide](#google-calendar-oauth-20-setup-guide)
- [LLM Prompt Engineering and Clinical Guidance](#llm-prompt-engineering-and-clinical-guidance)
- [Deliverables Matrix](#deliverables-matrix)
- [Testing and Quality Assurance](#testing-and-quality-assurance)
- [Deployment Guidelines](#deployment-guidelines)
- [Known Limitations](#known-limitations)
- [Future Roadmap](#future-roadmap)
- [License](#license)

---

## Overview

Outpatient healthcare systems often face operational friction due to double-booking conflicts, unguided symptom collection, fragmented follow-up care, and lack of visibility into asynchronous background processes.

CareSync resolves these challenges through:
- **Concurrency Control**: Database-level unique constraints and short-term slot holds eliminate double-bookings across concurrent patient sessions.
- **Structured Clinical Intake and AI Triage**: Gathers onset patterns, severity ratings, and associated symptoms while detecting omitted clinical context before the physician begins the consultation.
- **Longitudinal Care Continuity**: Consolidates past visit notes, diagnostic summaries, and prescription histories into an accessible patient health timeline.
- **Active Medication Adherence**: Generates scheduled daily dose tracking with interactive logging for patients.
- **Crash-Resilient Charting**: Equips clinicians with a 30-second patient briefing HUD, prescription presets, and debounced local storage draft persistence.
- **Worker Observability**: Gives clinic administrators real-time visibility into background BullMQ email dispatch queues, Google Calendar synchronization, and Gemini AI reliability.

---

## Key Features

### Patient Experience
- **Doctor Directory and Availability**: Search and filter clinicians by medical specialty and explore real-time availability derived from working hours and scheduled leaves.
- **5-Minute Slot Hold**: Holds selected slots during intake checkout with a live countdown timer before final booking confirmation.
- **Smart Symptom Intake**: Captures onset pattern (Gradual vs. Sudden), 1–10 visual severity score, associated symptom tags, and baseline medications/allergies.
- **Red-Flag Emergency Interceptor**: Evaluates symptom inputs against life-threatening indicators (e.g., acute chest pressure, unilateral neurological deficits) and surfaces immediate emergency care advisories.
- **Longitudinal Health Timeline**: View chronological records of consultations, clinical diagnoses, and doctor-approved plain-language care plans with one-click follow-up booking bridges.
- **Medication Adherence Tracker**: Monitor daily prescribed doses, dietary instructions, and log taken/missed medications with an adherence scorecard.
- **Calendar Synchronization**: Sync confirmed appointments to Google Calendar via OAuth 2.0.
- **Notification Center**: In-app notifications for confirmations, schedule changes, and doctor leaves.

### Doctor Portal
- **Daily Queue Management**: Real-time overview of the day's scheduled consultations with visual triage status indicators.
- **30-Second Patient Briefing HUD**: Instant summary cards displaying chief complaints, triage urgency (Low/Medium/High), red-flag alerts, detected missing clinical context, and 3 suggested diagnostic probe questions.
- **Consultation and Prescription Recorder**: Record clinical findings, formal diagnoses, and recommended follow-up dates.
- **Crash-Resilient Auto-Saving**: Automatically saves consultation drafts locally to prevent data loss during browser interruptions.
- **Prescription Builder and Presets**: Fast-populate standard drug regimens (e.g., Amoxicillin, Paracetamol, Omeprazole, Cetirizine) with automated dose reminder generation.
- **AI-Powered Patient Summaries**: Translates clinical visit notes into clear, patient-friendly instructions prior to final submission.
- **Schedule Management**: Manage weekly recurring clinic hours and view approved leave history.

### Administrator Portal
- **Operational Analytics Dashboard**: Track active clinicians, registered patients, daily visit volumes, upcoming leaves, and weekly consultation distributions.
- **Clinician Onboarding**: Register new doctors with specialization details, custom appointment durations (20, 30, 45, 60 minutes), and default weekly working hours.
- **Leave Management and Conflict Detection**: Schedule clinician leaves with automated detection of overlapping patient appointments.
- **Conflict Resolution**: Cancels conflicting bookings and enqueues automated patient notification alerts.
- **System and Worker Telemetry HUD**: Live observability across BullMQ email notification queues (Sent, Pending, Retrying, Failed), Google Calendar sync states, and Gemini AI parsing success rates.
- **System Audit Log**: Immutable append-only audit trail capturing key administrative and clinical actions.

---

## User Roles

| Role | Access Level | Description and Capabilities |
| :--- | :--- | :--- |
| **PATIENT** | Patient Portal | Browse clinicians, book slots, submit structured symptoms, view health timeline, track medication adherence, reschedule/cancel bookings, sync Google Calendar. |
| **DOCTOR** | Doctor Portal | Manage daily queue, review AI triage briefs, conduct consultations with auto-save notes, issue prescriptions with quick presets, configure weekly schedule. |
| **ADMIN** | Admin Portal | Monitor clinic operations, onboard clinicians, manage leaves with conflict resolution, inspect background worker telemetry, review system audit logs. |

---

## System Architecture

CareSync is structured as an npm workspaces monorepo where **PostgreSQL serves as the single source of truth**, and all external services (Email, Google Calendar, LLM) operate as asynchronous, resilient dependencies.

```text
┌────────────────────────────────────────────────────────┐
│                   React 18 SPA (Vite)                  │
│       (Role-Based UI, Tailwind CSS, Clean Typography)  │
└──────────────────────────┬─────────────────────────────┘
                           │ REST API / JWT
                           ▼
┌────────────────────────────────────────────────────────┐
│              Express.js Backend API Server             │
│   (Rate Limiter, Auth & RBAC Middleware, Controllers)  │
└───────┬──────────────────┬──────────────────┬──────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │ Google Gemini│   │ Google OAuth │
│ (Prisma ORM) │   │  1.5 Flash   │   │ Calendar API │
└───────┬──────┘   └──────────────┘   └──────────────┘
        │
        ▼
┌──────────────┐       ┌───────────────────────────────┐
│ Redis Server │ ────► │    BullMQ Background Worker   │
│  (BullMQ)    │       │ (Resend Email Notifications)  │
└──────────────┘       └───────────────────────────────┘
```

### Architectural Guarantees
1. **Concurrency and Double-Booking Prevention**: Database-level unique constraint on `(doctorId, slotStart)` ensures no two appointments share the same time slot under concurrent requests.
2. **Idempotent Holds**: Appointment booking requests require an `idempotencyKey` to prevent duplicate reservations during network retries.
3. **Resilient AI Pipeline**: Google Gemini requests execute with structured Zod schema validation, timeouts, and safe fallback generation so AI disruptions never block core booking operations.
4. **Decoupled Background Processing**: Transactional notifications are queued via BullMQ with exponential backoff retry policies to protect API response latency.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 | Declarative single-page application |
| **Build Tool** | Vite 5 | Fast development and optimized production bundling |
| **Styling** | Tailwind CSS v4 | Responsive utility-based styling and design tokens |
| **Typography** | Inter, JetBrains Mono | Clean, accessible clinical typography |
| **Backend Framework** | Express 4 (Node.js) | REST API server |
| **Language** | TypeScript 5 | End-to-end type safety |
| **Database** | PostgreSQL | Relational persistence with ACID transactions |
| **ORM** | Prisma ORM 5 | Schema migrations, type-safe queries, and seeding |
| **Background Queues** | BullMQ and Redis | Asynchronous notification dispatch and job processing |
| **Generative AI** | Google Gemini 1.5 Flash | Pre-visit triage summaries and post-visit patient explanations |
| **Calendar Integration** | Google Calendar API (OAuth 2.0) | Automated appointment event synchronization |
| **Email Service** | Resend API | Transactional emails with local development fallback |
| **Authentication** | Dual JWT + Bcrypt | Secure access and refresh tokens with password hashing |
| **Schema Validation** | Zod | Request body and domain model validation |

---

## Project Structure

```text
Hospital_application/
├── apps/
│   ├── backend/                     # Express and Prisma Backend API
│   │   ├── prisma/
│   │   │   ├── migrations/          # PostgreSQL database migrations
│   │   │   ├── schema.prisma        # Prisma schema and relationship definitions
│   │   │   └── seed.ts              # Multi-scenario database seeder
│   │   ├── src/
│   │   │   ├── controllers/         # Request controllers
│   │   │   ├── lib/                 # Prisma client instance
│   │   │   ├── middlewares/         # Authentication, RBAC, and rate limiting
│   │   │   ├── queues/              # BullMQ queue producers and background workers
│   │   │   ├── routes/              # Express API route declarations
│   │   │   ├── services/            # Core business logic (Appointments, AI, Admin, etc.)
│   │   │   └── server.ts            # Server initialization and middleware configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                    # Vite and React Frontend Application
│       ├── src/
│       │   ├── components/          # Reusable UI components (LoginPage, Shared, Badges)
│       │   ├── data/                # API client and authentication helpers
│       │   ├── portals/             # PatientPortal, DoctorPortal, AdminPortal
│       │   ├── App.tsx              # Root session state and view router
│       │   ├── index.css            # Base styles and layout utilities
│       │   └── main.tsx             # React DOM entry point
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/                      # Shared types and validation schemas
│       ├── index.ts
│       └── package.json
│
├── .env.example                     # Environment configuration template
├── test_users.md                    # Seeded test accounts and credentials
├── package.json                     # Monorepo workspace configuration
└── README.md                        # Documentation
```

---

## Installation and Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14` or higher (local or hosted)
- **Redis**: `v6.0` or higher (local or hosted)

### Step 1: Clone Repository
```bash
git clone https://github.com/pritiverse/Hospital_application.git
cd Hospital_application
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Configure your PostgreSQL URL, Redis host, JWT secrets, and API keys.

### Step 4: Run Database Migrations and Seed Data
```bash
# Run database migrations
npm run db:migrate --workspace=apps/backend

# Generate Prisma Client
npm run db:generate --workspace=apps/backend

# Seed database with clinical test scenarios
npm run db:seed --workspace=apps/backend
```

---

## Environment Configuration

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/healthcare` |
| `DIRECT_URL` | Direct connection string for Prisma migrations | Yes | `postgresql://user:pass@localhost:5432/healthcare` |
| `PORT` | Backend HTTP port | No | `3001` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | No | `http://localhost:8500` |
| `JWT_ACCESS_SECRET` | Secret for signing short-lived JWT access tokens | Yes | `32-character-random-secret` |
| `JWT_REFRESH_SECRET` | Secret for signing long-lived JWT refresh tokens | Yes | `32-character-random-secret` |
| `REDIS_HOST` | Redis host for BullMQ workers | No | `localhost` |
| `REDIS_PORT` | Redis port for BullMQ workers | No | `6379` |
| `RESEND_API_KEY` | Resend API key for transactional emails | No | `re_your_api_key` |
| `GEMINI_API_KEY` | Google Gemini API key for clinical AI summaries | No | `your-gemini-key` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for Calendar sync | No | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for Calendar sync | No | `your-client-secret` |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect callback URL | No | `http://localhost:3001/api/calendar/callback` |

---

## Running the Application

### Development Mode

Start both backend and frontend development servers concurrently:
```bash
npm run dev
```

In a separate terminal, launch the background notification worker:
```bash
npm run dev:worker --workspace=apps/backend
```

Individual services can also be started independently:
```bash
npm run dev:backend   # Express API running on http://localhost:3001
npm run dev:frontend  # Vite React App running on http://localhost:8500
```

---

## Test Accounts and Credentials

The database seeder provisions realistic patient and clinician personas across multiple clinical specialties.

**Global Password for all test accounts:** `password`

| Role | Name | Email | Clinical Context |
| :--- | :--- | :--- | :--- |
| **Patient** | Sarah Mitchell | `patient@example.com` | Stage 1 Hypertension with active Lisinopril medication schedule and queue appointment today. |
| **Patient** | Alex Rivera | `alex@example.com` | Sports performance evaluation and post-workout orthostatic dizziness. |
| **Patient** | Mia Thompson | `mia@example.com` | Contact dermatitis and migraine with aura consultation records. |
| **Patient** | David Park *(Parent)* | `david@example.com` | Pediatric allergic asthma care plan and Albuterol prescription. |
| **Patient** | Fatima Al-Hassan | `fatima@example.com` | Type 2 Diabetes management and quarterly review with Metformin tracking. |
| **Patient** | Robert Chen | `robert@example.com` | Acute suspected myocardial infarction triggering high-urgency red-flag alerts. |
| **Doctor** | Dr. Sarah Chen, MD | `doctor@example.com` | Cardiology and Internal Medicine (Active today's patient queue). |
| **Doctor** | Dr. James Okafor, MD | `okafor@clinic.io` | Pediatrics and Adolescent Medicine. |
| **Doctor** | Dr. Marco Ricci, MD | `ricci@clinic.io` | Dermatology and Skin Allergy (Active symposium leave on file). |
| **Doctor** | Dr. Elena Vargas, MD | `vargas@clinic.io` | Neurology and Headache Specialist. |
| **Doctor** | Dr. Ananya Gupta, MD | `gupta@clinic.io` | General Practice and Preventive Medicine. |
| **Admin** | Operations Admin | `admin@example.com` | Full administrative, clinician management, and telemetry access. |

For detailed scenario descriptions and test flows, see [test_users.md](test_users.md).

---

## API Documentation

All API routes are prefixed with `/api`.

### Authentication
- `POST /api/auth/register` — Register a new patient or clinician account.
- `POST /api/auth/login` — Authenticate credentials and receive access/refresh tokens.
- `POST /api/auth/refresh` — Exchange refresh token for a new access token.

### Doctors and Availability
- `GET /api/doctors` — List all registered clinicians with specializations and next available slots.
- `GET /api/doctors/:id/slots?date=YYYY-MM-DD` — Compute open consultation slots for a specific date.
- `PUT /api/doctor/schedule` — Update clinician weekly working hours (`DOCTOR`).
- `GET /api/doctor/leaves` — Retrieve clinician personal leave history (`DOCTOR`).

### Appointments and Triage
- `POST /api/appointments` — Place a 5-minute temporary hold on a time slot (`PATIENT`).
- `POST /api/appointments/:id/confirm` — Confirm a held appointment (`PATIENT`).
- `GET /api/appointments` — Retrieve logged-in patient appointment history (`PATIENT`).
- `GET /api/appointments/today` — Retrieve today's consultation queue for the doctor (`DOCTOR`).
- `GET /api/appointments/:id` — Retrieve appointment details.
- `DELETE /api/appointments/:id` — Cancel an appointment.
- `PATCH /api/appointments/:id/reschedule` — Move an existing appointment to a new time slot.
- `POST /api/appointments/:id/symptoms` — Submit structured symptom intake and trigger AI triage.

### Longitudinal Care and Adherence
- `GET /api/patient/timeline` — Retrieve longitudinal patient care feed with diagnoses and follow-ups.
- `GET /api/patient/medications` — Retrieve active prescriptions and adherence scorecard.
- `PATCH /api/patient/medications/:id/adherence` — Log medication dose status (`TAKEN` / `MISSED`).

### Consultations and Visits
- `POST /api/visits` — Record clinical examination findings, diagnosis, and prescription items (`DOCTOR`).
- `POST /api/visits/:id/generate-summary` — Generate AI patient-friendly consultation summary.

### Google Calendar Integration
- `GET /api/calendar/connect` — Generate Google OAuth 2.0 authorization URL.
- `GET /api/calendar/callback` — Handle Google OAuth code exchange.
- `POST /api/appointments/:id/calendar-sync` — Synchronize appointment event to Google Calendar.

### Administrative Operations and Telemetry
- `GET /api/admin/stats` — Aggregate operational metrics and weekly appointment distribution (`ADMIN`).
- `GET /api/admin/doctors` — List all clinicians with schedule configurations (`ADMIN`).
- `POST /api/admin/doctors` — Onboard a new clinician (`ADMIN`).
- `GET /api/admin/leaves` — List all clinician leaves (`ADMIN`).
- `POST /api/admin/leaves/conflicts` — Preview conflicting appointments for a requested leave (`ADMIN`).
- `POST /api/admin/leaves` — Approve leave and automatically cancel/notify conflicting bookings (`ADMIN`).
- `GET /api/admin/telemetry` — Live metrics for BullMQ email jobs, Calendar syncs, and Gemini AI triage (`ADMIN`).
- `GET /api/admin/audit` — Retrieve immutable audit trail (`ADMIN`).

---

## Authentication and Authorization

- **Dual-Token Architecture**:
  - **Access Token**: Short-lived JWT containing user `id` and `role`.
  - **Refresh Token**: Long-lived JWT stored securely to renew expired access tokens.
- **Role-Based Access Control (RBAC)**:
  - `requireAuth` verifies JWT authenticity and attaches user context.
  - `requireRole(...roles)` ensures access is restricted to designated roles.
- **IDOR Protection**:
  - Patient resources (appointments, symptoms, medication logging) verify that the authenticated patient owns the target record.
- **Brute-Force Protection**:
  - `express-rate-limit` protects authentication endpoints against credential stuffing (max 20 attempts per 15 minutes per IP).

---

## Database Schema and Models

```text
┌───────────────┐       ┌──────────────────────┐
│     User      │──────►│ Patient / Doctor     │
└───────┬───────┘       └──────────┬───────────┘
        │                          │
        ▼                          ▼
┌───────────────┐       ┌──────────────────────┐
│   AuditLog    │       │     Appointment      │
└───────────────┘       └──────────┬───────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌───────────────┐       ┌──────────────────────┐   ┌──────────────────────┐
│    Symptom    │       │   PreVisitSummary    │   │        Visit         │
└───────────────┘       └──────────────────────┘   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │   PrescriptionItem   │
                                                   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │  MedicationReminder  │
                                                   └──────────────────────┘
```

### Core Schema Highlights
- **`Appointment`**: Contains unique index `@@unique([doctorId, slotStart], name: "doctor_slot_unique")` ensuring absolute concurrency safety.
- **`PreVisitSummary`**: Stores chief complaints, urgency rankings, red-flag alerts, and missing information gap detection arrays.
- **`Visit` and `PrescriptionItem`**: Captures clinical examination notes, formal ICD-10 diagnoses, and structured drug instructions.
- **`MedicationReminder`**: Manages scheduled dose reminder timestamps and adherence states (`PENDING`, `SENT`, `FAILED`).
- **`NotificationJob`**: Tracks asynchronous background email delivery states (`PENDING`, `PROCESSING`, `SENT`, `RETRY`, `FAILED_PERMANENTLY`).
- **`AuditLog`**: Append-only log recording critical administrative and clinical events.

---

## Core Application Workflows

### 1. Patient Booking and AI Triage Flow
```text
Patient selects Clinician & Date
      ↓
GET /api/doctors/:id/slots (Computed against WorkingHours & Leaves)
      ↓
Patient selects open time slot
      ↓
POST /api/appointments (Holds slot for 5 mins; prevents conflicts)
      ↓
Patient completes Smart Symptom Intake (Onset, Severity, Associated Symptoms)
      ↓
POST /api/appointments/:id/symptoms (Gemini 1.5 Flash generates clinical triage brief)
      ↓
POST /api/appointments/:id/confirm (Confirms booking; enqueues confirmation email)
```

### 2. Clinical Consultation and Medication Tracking Flow
```text
Doctor opens Today's Queue (GET /api/appointments/today)
      ↓
Doctor inspects 30-Second AI Briefing HUD (Urgency, Red Flags, Gaps, Questions)
      ↓
Doctor conducts Consultation with auto-saving notes and prescription presets
      ↓
POST /api/visits (Records Clinical Findings, Diagnosis, Prescriptions)
      ↓
Backend automatically executes:
  1. Generates plain-language patient summary via Gemini AI
  2. Generates scheduled MedicationReminder records across duration
  3. Updates Appointment status to COMPLETED
```

### 3. Admin Leave Management and Conflict Resolution
```text
Admin selects Clinician and Leave Date Range
      ↓
POST /api/admin/leaves/conflicts (Identifies overlapping confirmed bookings)
      ↓
Admin inspects conflict preview list
      ↓
POST /api/admin/leaves (Atomic Prisma Transaction):
  1. Creates DoctorLeave record
  2. Cancels conflicting appointments (CANCELLED_BY_LEAVE)
  3. Enqueues cancellation alert emails for affected patients
  4. Records action in AuditLog
```

---

## Error Handling and Reliability

- **Database Transactions**: Operations involving multiple state transitions (booking holds, visit submissions, leave cancellations) execute within atomic `prisma.$transaction` blocks.
- **Graceful AI Degradation**: If Google Gemini API is unavailable or returns an unexpected response, fallback summaries are generated seamlessly without interrupting clinical charting.
- **Automatic Hold Expiration**: Expired `HELD` slots are automatically released during slot calculation queries.
- **Resilient Background Retries**: Notification worker implements exponential backoff retries for transient SMTP or network failures.

---

## Google Calendar OAuth 2.0 Setup Guide

CareSync integrates with Google Calendar API to synchronize confirmed appointments directly into patient and clinician calendar feeds.

### Step 1: Create a Google Cloud Console Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Create Project** and name it `CareSync-Healthcare`.

### Step 2: Enable Google Calendar API
1. In the sidebar, open **APIs & Services** > **Library**.
2. Search for **Google Calendar API** and click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**.
2. Select User Type: **External** (or Internal for Google Workspace organizations).
3. Fill in the App Name (`CareSync`) and developer contact email.
4. Add the scope: `https://www.googleapis.com/auth/calendar.events`.
5. Under **Test Users**, add your test Gmail accounts.

### Step 4: Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
2. Application type: **Web application**.
3. Name: `CareSync Web Client`.
4. Authorized JavaScript origins: `http://localhost:8500` (and your production frontend domain).
5. Authorized redirect URIs: `http://localhost:3001/api/calendar/callback` (and your production backend callback URL).
6. Click **Create** and copy your **Client ID** and **Client Secret**.

### Step 5: Add Credentials to `.env`
Update your root `.env` file:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/callback
```

---

## LLM Prompt Engineering and Clinical Guidance

CareSync utilizes Google Gemini 1.5 Flash for pre-visit clinical triage and post-visit patient communications with strict schema validation.

### 1. Pre-Visit Triage Prompt (`previsit-v3`)

**System Prompt:**
```text
You are a clinical decision-support assistant helping doctors prepare for patient consultations.
Given a patient's symptom description, produce a structured pre-visit brief in JSON format.

Respond ONLY with valid JSON matching this schema:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "One sentence clinical framing of the primary complaint (max 200 chars)",
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"],
  "redFlags": ["Any red-flag symptoms if present, otherwise empty array"],
  "missingInformation": ["Key omitted diagnostic context e.g. radiation, fever, onset speed, or empty array"]
}
```

**Zod Validation Schema:**
```typescript
const PreVisitSchema = z.object({
  urgency: z.enum(['Low', 'Medium', 'High']),
  chiefComplaint: z.string().max(300),
  suggestedQuestions: z.array(z.string()).length(3),
  redFlags: z.array(z.string()).optional().default([]),
  missingInformation: z.array(z.string()).optional().default([]),
});
```

### 2. Post-Visit Patient Brief Prompt (`postvisit-v1`)

**System Prompt:**
```text
You are a clinical communications assistant. You summarize a doctor's clinical visit notes into clear, patient-friendly language.
Respond ONLY with valid JSON matching this schema:
{
  "summary": "Plain English summary of the consultation, diagnosis, and key takeaways for the patient (2-3 sentences)",
  "medicationSchedule": [
    { "medicine": "Medicine name", "instructions": "Plain English instructions on how and when to take it" }
  ],
  "followUp": "When or under what conditions to seek follow-up care"
}
```

### 3. Graceful Failure and Fallback Strategy
- **Timeouts**: Every Gemini API call is wrapped in a strict 10,000ms timeout.
- **Schema Validation**: If response parsing fails, `PreVisitSummary.status` is marked as `INVALID_SCHEMA` and a deterministic heuristic fallback summary is returned.
- **Consultation Continuity**: An LLM failure never blocks appointment confirmation or visit note persistence.

---

## Deliverables Matrix

| Deliverable | Location / URL | Description |
| :--- | :--- | :--- |
| **1. Complete Source Code** | `apps/backend/`, `apps/frontend/`, `packages/shared/` | Monorepo source code for React SPA, Express API, Prisma models, BullMQ queues, and domain types. |
| **2. Setup & Configuration** | `README.md`, `.env.example` | Setup guide, environment variables, API reference, DB schema, LLM prompts, and Google Calendar instructions. |
| **3. Hosted Application URL** | **[https://hospital-application-frontend.vercel.app](https://hospital-application-frontend.vercel.app/)** | Live cloud production deployment connected to Render backend, Supabase PostgreSQL, and Upstash Redis. |
| **4. System Design Write-Up** | [`system_design.md`](system_design.md) | Technical architecture document (<800 words) covering double-booking prevention, leave conflict resolution, slot holds, and notification failure resilience. |
| **5. Test User Credentials** | [`test_users.md`](test_users.md) | Directory of all pre-seeded patient, doctor, and admin personas with passwords and clinical test cases. |

---

## Testing and Quality Assurance

### Run Type Checking
```bash
# Backend type check
npm run lint --workspace=apps/backend

# Frontend production build validation
npm run build --workspace=apps/frontend
```

---

## Deployment Guidelines

### Monorepo Deployment Targets
- **Frontend (Vercel / Netlify / Cloudflare Pages)**:
  - Root directory: `apps/frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
- **Backend API (Render / Railway / AWS ECS)**:
  - Root directory: `apps/backend`
  - Build command: `npm run db:generate && tsc`
  - Start command: `node dist/server.js`
- **Background Worker (Render Worker / Railway)**:
  - Command: `node dist/queues/workers.js`
- **Database and Redis**:
  - PostgreSQL hosted on Supabase, Neon, or AWS RDS.
  - Redis hosted on Upstash or Redis Cloud.

---

## Known Limitations

1. **In-Memory Rate Limiting**: The default rate limiter uses memory storage suitable for single-node deployments. In multi-instance cluster environments, configure `rate-limit-redis`.
2. **Development OAuth Fallback**: When `GOOGLE_CLIENT_ID` is omitted in local environments, calendar sync generates simulated event IDs for testing.
3. **Development Email Fallback**: When `RESEND_API_KEY` is not provided, transactional emails are logged to the console.

---

## Future Roadmap

- [ ] **WebSockets / Server-Sent Events (SSE)**: Real-time doctor queue updates without polling.
- [ ] **Telehealth Video Integration**: WebRTC integration for remote patient-clinician video consultations.
- [ ] **Payment Processing**: Stripe / Razorpay integration for online consultation fee settlements.
- [ ] **Clinical Document Uploads**: Secure storage and parsing for lab reports and medical imagery.

---

## License

All rights reserved. CareSync Healthcare System.

# CareSync — Healthcare Appointment & Follow-Up Management System

CareSync is a full-stack, enterprise-grade healthcare management and scheduling platform built with **React**, **Node.js / Express**, **Prisma ORM**, **PostgreSQL**, **BullMQ**, and **Google Gemini Generative AI**. 

It streamlines patient-doctor workflows by combining double-booking-proof slot reservation, AI-powered pre-visit symptom triage, doctor consultation and prescription tracking, automated medication reminders, and administrative operations management into a unified, role-based application.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Database Schema & Models](#database-schema--models)
- [Core Application Workflows](#core-application-workflows)
- [Error Handling & Reliability](#error-handling--reliability)
- [Security Features](#security-features)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Deployment Guidelines](#deployment-guidelines)
- [Known Limitations](#known-limitations)
- [Future Roadmap](#future-roadmap)
- [License](#license)

---

## 🌟 Overview

Modern outpatient clinics often suffer from double-booking errors, disjointed symptom collection, lack of structured post-consultation follow-up, and manual leave-conflict resolution. 

**CareSync addresses these pain points through:**
- **Guaranteed Concurrency Control**: Strict database-level uniqueness constraints and short-term slot holding prevent double-bookings under concurrent user requests.
- **AI-Powered Clinical Decision Support**: Seamlessly analyzes raw patient symptom descriptions before consultations to highlight urgency, clinical framing, red-flag indicators, and suggested diagnostic questions.
- **End-to-End Visit Recording**: Doctors document diagnoses, clinical notes, and structured prescriptions, which automatically generate patient-friendly summaries and scheduled medication reminder queues.
- **Operational Leave & Conflict Management**: Administrators can manage clinic doctors, schedule leaves with automated conflict detection, and automatically notify affected patients.

---

## ✨ Key Features

### 👤 Patient Experience
- **Doctor Directory & Real-Time Availability**: Search and filter doctors by specialization, view profiles, and browse real-time available time slots computed from doctor working hours and scheduled leaves.
- **5-Minute Slot Hold Reservation**: Hold a slot for 5 minutes during intake checkout with a live countdown timer before confirmation.
- **Pre-Visit Symptom Intake**: Describe symptoms, severity level, and duration before the consultation.
- **AI-Generated Pre-Visit Brief**: Real-time feedback with clinical framing, urgency assessment, and health guidance.
- **Google Calendar Synchronization**: Synchronize confirmed appointments directly into Google Calendar via OAuth 2.0.
- **Appointment Management**: View upcoming, completed, and historical appointments with instant reschedule and cancellation capabilities.
- **Notification Inbox**: Receive automated updates for booking confirmations, doctor leave cancellations, and schedule adjustments.

### 🩺 Doctor Portal
- **Daily Queue Dashboard**: Real-time overview of today's scheduled consultations, patient statuses, and timing.
- **Clinical Pre-Visit Briefs**: View AI-generated summaries for each patient, including chief complaint, urgency level (Low/Medium/High), red flags, and 3 suggested consultation questions.
- **Consultation & Prescription Recorder**: Record clinical notes, diagnoses, follow-up dates, and structured prescription items (dosage, frequency, duration).
- **Automated Post-Visit Summaries**: AI translates complex clinical notes into plain-language patient summaries.
- **Automated Medication Reminders**: Automatically generates scheduled daily dose reminder records across prescription durations.
- **Working Hours & Availability Management**: Configure weekly schedule hours (start/end times per day of week) and view leave records.

### 🛡️ Administrator Portal
- **Operational Analytics Dashboard**: Monitor clinic metrics including active doctors, registered patients, today's visit counts, upcoming leaves, and weekly appointment distributions.
- **Doctor Onboarding**: Register new doctors with specialization details, appointment slot durations (30 min, 45 min, etc.), and default weekly working hours.
- **Leave Management & Conflict Preview**: Schedule doctor leave with an interactive conflict detection preview that lists all affected patient appointments before saving.
- **Automated Leave Conflict Resolution**: Automatically cancels conflicting appointments and queues patient alert notifications.
- **Notification Queue Monitor**: Track background BullMQ job health across Email, Calendar Sync, and AI generation (Sent, Retrying, Failed statuses).
- **System Audit Log**: Immutable record of all system events (appointments held/confirmed/cancelled, AI summaries generated, calendar syncs, visits recorded).

---

## 👥 User Roles

| Role | Access Level | Permissions & Capabilities |
|---|---|---|
| **PATIENT** | Patient Portal | Browse doctors, view real-time slots, hold & book appointments, submit symptoms, view personal appointments, reschedule, cancel, sync to Google Calendar, view notifications. |
| **DOCTOR** | Doctor Portal | View today's patient queue, inspect AI pre-visit clinical briefs, record consultation visits & prescriptions, trigger post-visit summaries, manage weekly working schedule, view leave history. |
| **ADMIN** | Admin Portal | View clinic analytics, onboard new doctors, schedule doctor leaves with conflict detection previews, monitor BullMQ notification queue health, inspect system audit logs. |

---

## 🏗️ System Architecture

CareSync is structured as an npm workspaces monorepo with an architectural principle: **PostgreSQL is the single source of truth; all external services (Email, Google Calendar, LLM) are asynchronous, resilient side-effects.**

```text
┌────────────────────────────────────────────────────────┐
│                   React 18 SPA (Vite)                  │
│       (Glassmorphic Design System, Tailwind CSS v4)    │
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

### Core Architecture Highlights
1. **Double-Booking Prevention**: Database-enforced partial unique constraint on `(doctorId, slotStart)` ensures no two active appointments can share the same time slot, even under high concurrency.
2. **Idempotent Holds**: Booking requests require an `idempotencyKey` to prevent double-charging or duplicate hold creations upon network retries.
3. **Resilient AI Pipeline**: The Google Gemini API is called with a strict 10-second timeout, JSON schema validation, and automatic fallbacks so external AI latency never blocks booking commits.
4. **Decoupled Notification Worker**: Transactional emails are dispatched through Redis-backed BullMQ queues with retry backoff policies, preventing third-party SMTP latencies from impacting API response times.

---

## 💻 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 | Declarative single-page application |
| **Build Tool** | Vite 5 | Fast development server and optimized production bundling |
| **Styling** | Tailwind CSS v4 | Utility-first responsive styling and design tokens |
| **Typography** | Outfit, Inter, JetBrains Mono | Modern typography via Google Fonts |
| **Backend Framework** | Express 4 (Node.js) | REST API server |
| **Language** | TypeScript 5 | End-to-end type safety |
| **Database** | PostgreSQL | Relational persistence with ACID transactions |
| **ORM** | Prisma ORM 5 | Type-safe database queries, schema migrations, and seeding |
| **Job Queue** | BullMQ & Redis | Asynchronous email and background notification processing |
| **AI / LLM** | Google Gemini 1.5 Flash | Pre-visit clinical triage briefs & post-visit patient summaries |
| **Calendar** | Google Calendar API (OAuth 2.0) | Appointment synchronization |
| **Email Service** | Resend API | Transactional notification emails (with local mock fallback) |
| **Authentication** | Dual JWT + Bcrypt | Access & refresh tokens with bcrypt password hashing |
| **Validation** | Zod | Request body validation and shared domain schemas |
| **Testing** | Playwright | Multi-device responsive end-to-end UI testing |

---

## 📁 Project Structure

```text
Hospital_application/
├── apps/
│   ├── backend/                     # Express & Prisma Backend API
│   │   ├── prisma/
│   │   │   ├── migrations/          # PostgreSQL database migrations
│   │   │   ├── schema.prisma        # Prisma data models & relations
│   │   │   └── seed.ts              # Database seeder with demo accounts
│   │   ├── src/
│   │   │   ├── controllers/         # Request controllers
│   │   │   ├── lib/                 # Prisma client singleton
│   │   │   ├── middlewares/         # Auth, RBAC, and request logger middlewares
│   │   │   ├── queues/              # BullMQ queue producers and background workers
│   │   │   ├── routes/              # Express API route declarations
│   │   │   ├── services/            # Business logic (Appointments, AI, Admin, etc.)
│   │   │   └── server.ts            # Express server initialization & CORS config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                    # Vite + React Single Page Application
│       ├── src/
│       │   ├── components/          # Reusable UI components (LoginPage, Shared, Badges)
│       │   ├── data/                # API client wrapper & mock fallbacks
│       │   ├── portals/             # Role-based portals (Patient, Doctor, Admin)
│       │   ├── App.tsx              # Root application router & session manager
│       │   ├── index.css            # Custom CSS utilities, glassmorphism & typography
│       │   └── main.tsx             # React entry point
│       ├── tests/                   # Playwright end-to-end UI audit tests
│       ├── index.html               # HTML5 application shell
│       ├── package.json
│       ├── playwright.config.ts     # Playwright multi-viewport configuration
│       ├── tsconfig.json
│       └── vite.config.ts           # Vite configuration
│
├── packages/
│   └── shared/                      # Shared types and Zod schemas
│       ├── index.ts                 # RoleEnum, AppointmentStatusEnum, AI schemas
│       └── package.json
│
├── .env.example                     # Environment variable template
├── .gitattributes                   # Line ending normalization
├── .gitignore                       # Git ignore rules
├── CONTRIBUTING.md                  # Contribution guidelines
├── package.json                     # Root monorepo workspace configuration
└── README.md                        # Project documentation
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14` or higher (local or hosted like Supabase / Neon)
- **Redis**: `v6.0` or higher (local or hosted like Upstash / Redis Cloud)

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
Update `.env` with your PostgreSQL database URL, Redis host, and API keys.

### Step 4: Run Database Migrations & Seed Data
```bash
# Run migrations
npm run db:migrate

# Generate Prisma Client
npm run db:generate

# Seed initial demo accounts and appointments
npm run db:seed
```

---

## ⚙️ Environment Configuration

| Variable | Purpose | Required | Default / Example |
|---|---|:---:|---|
| `DATABASE_URL` | PostgreSQL connection string (transaction pooler) | **Yes** | `postgresql://user:pass@localhost:5432/healthcare` |
| `DIRECT_URL` | Direct PostgreSQL connection string for Prisma migrations | **Yes** | `postgresql://user:pass@localhost:5432/healthcare` |
| `PORT` | Express backend port | No | `3001` |
| `FRONTEND_URL` | Allowed frontend origin for CORS policy | No | `http://localhost:8500` |
| `JWT_ACCESS_SECRET` | Secret used to sign short-lived JWT access tokens | **Yes** | `random-32-char-secret` |
| `JWT_REFRESH_SECRET` | Secret used to sign long-lived JWT refresh tokens | **Yes** | `random-32-char-secret` |
| `REDIS_HOST` | Redis server host for BullMQ queues | No | `localhost` |
| `REDIS_PORT` | Redis server port for BullMQ queues | No | `6379` |
| `REDIS_URL` | Optional full Redis connection string | No | `redis://localhost:6379` |
| `RESEND_API_KEY` | Resend API key for transactional email (mock fallback used if unset) | No | `re_your_api_key` |
| `GEMINI_API_KEY` | Google Gemini API key for clinical AI summaries | No | `your-gemini-key` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for Calendar sync | No | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for Calendar sync | No | `your-client-secret` |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL | No | `http://localhost:3001/api/calendar/callback` |

---

## 🖥️ Running the Application

### Development Mode

Run frontend and backend concurrently:
```bash
npm run dev
```

In a separate terminal window, start the background notification worker:
```bash
npm run dev:worker
```

Or start individual services independently:
```bash
npm run dev:backend   # Starts Express API at http://localhost:3001
npm run dev:frontend  # Starts Vite frontend at http://localhost:8500
```

### Pre-Configured Demo Accounts

After running `npm run db:seed`, you can log in with:

| Role | Email | Password | Details |
|---|---|---|---|
| **Patient** | `patient@example.com` | `password` | Sarah Mitchell (Pre-seeded appointment records) |
| **Doctor** | `doctor@example.com` | `password` | Dr. Sarah Chen (Cardiology, pre-seeded today's queue) |
| **Admin** | `admin@example.com` | `password` | Operations Admin (Full clinic management access) |

---

## 📚 API Documentation

All API endpoints are prefixed with `/api`.

### 1. Authentication Endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user account (Patient/Doctor/Admin) | Public |
| `POST` | `/api/auth/login` | Authenticate user & receive access/refresh tokens | Public (Rate Limited) |
| `POST` | `/api/auth/refresh` | Exchange refresh token for a new access token | Refresh Token |

### 2. Doctor Endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/api/doctors` | List all doctors with specialization & next available time | Public |
| `GET` | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Compute available booking slots for a given date | Public |
| `PUT` | `/api/doctor/schedule` | Update doctor's weekly working hours | `DOCTOR` |
| `GET` | `/api/doctor/leaves` | Retrieve doctor's personal leave records | `DOCTOR` |

### 3. Appointment Endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/api/appointments` | Hold an appointment slot for 5 minutes (`HELD` status) | `PATIENT` |
| `POST` | `/api/appointments/:id/confirm` | Confirm a held appointment (`CONFIRMED` status) | `PATIENT` |
| `GET` | `/api/appointments` | Get logged-in patient's appointment history | `PATIENT` |
| `GET` | `/api/appointments/today` | Get today's consultation queue for doctor | `DOCTOR` |
| `GET` | `/api/appointments/:id` | Get single appointment details | `PATIENT` / `DOCTOR` |
| `DELETE`| `/api/appointments/:id` | Cancel an appointment | `PATIENT` |
| `PATCH` | `/api/appointments/:id/reschedule` | Reschedule an appointment to a new slot | `PATIENT` |
| `POST` | `/api/appointments/:id/symptoms` | Submit symptom intake and trigger AI summary | `PATIENT` (IDOR Protected) |

### 4. Visit & Consultation Endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `POST` | `/api/visits` | Record clinical notes, diagnosis & prescriptions | `DOCTOR` |
| `POST` | `/api/visits/:id/generate-summary` | Generate post-visit patient brief via Gemini AI | `DOCTOR` / `ADMIN` |

### 5. Google Calendar Endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/api/calendar/connect` | Generate Google OAuth 2.0 authorization URL | Public |
| `GET` | `/api/calendar/callback` | Exchange OAuth code for tokens | Public |
| `POST` | `/api/appointments/:id/calendar-sync`| Trigger calendar sync for an appointment | `PATIENT` |

### 6. Admin Endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Aggregate dashboard statistics & weekly volume | `ADMIN` |
| `GET` | `/api/admin/doctors` | List all doctors with schedules | `ADMIN` |
| `POST` | `/api/admin/doctors` | Onboard and create a new doctor | `ADMIN` |
| `GET` | `/api/admin/leaves` | List all scheduled doctor leaves | `ADMIN` |
| `POST` | `/api/admin/leaves/conflicts` | Preview conflicting appointments before leave creation | `ADMIN` |
| `POST` | `/api/admin/leaves` | Schedule leave and cancel conflicting appointments | `ADMIN` |
| `GET` | `/api/admin/notifications` | View BullMQ notification job statuses | `ADMIN` |
| `GET` | `/api/admin/audit` | View immutable system audit log | `ADMIN` |

---

## 🔒 Authentication & Authorization

- **Dual-Token System**:
  - **Access Token**: Short-lived JWT (7 days in development) containing `id` and `role`.
  - **Refresh Token**: Long-lived JWT (30 days) used to silently refresh expired sessions without requiring credentials re-entry.
- **Role-Based Access Control (RBAC)**:
  - `requireAuth` middleware verifies JWT signatures and attaches the user identity to the Express request.
  - `requireRole(...roles)` ensures that only designated roles can access specific endpoints.
- **IDOR Protection**:
  - Appointment modifications (symptom submissions, cancellations, rescheduling) verify that the authenticated patient owns the record before proceeding.
- **Rate Limiting**:
  - `express-rate-limit` protects `/api/auth/login` and `/api/auth/register` against brute-force attacks (max 20 attempts per 15 minutes per IP).

---

## 🗄️ Database Schema & Models

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

### Key Models & Constraints
1. **`User`**: Base identity with email, password hash, role (`PATIENT`, `DOCTOR`, `ADMIN`).
2. **`DoctorWorkingHours`**: Weekly recurring availability schedule (Day 0–6, startTime, endTime).
3. **`DoctorLeave`**: Date ranges when doctor is unavailable.
4. **`Appointment`**: Core booking model.
   - **`@@unique([doctorId, slotStart], name: "doctor_slot_unique")`**: Database-level unique index preventing concurrent double-bookings.
   - Statuses: `HELD`, `CONFIRMED`, `COMPLETED`, `CANCELLED_BY_PATIENT`, `CANCELLED_BY_DOCTOR`, `CANCELLED_BY_LEAVE`, `RESCHEDULED`, `NO_SHOW`, `EXPIRED`.
5. **`Symptom` & `PreVisitSummary`**: Patient intake text and AI clinical triage brief.
6. **`Visit` & `PrescriptionItem`**: Clinical notes, diagnoses, and structured medication dosages.
7. **`MedicationReminder`**: Scheduled timestamps for patient daily medication compliance.
8. **`NotificationJob`**: BullMQ job tracking state (`PENDING`, `PROCESSING`, `SENT`, `RETRY`, `FAILED_PERMANENTLY`).
9. **`AuditLog`**: Append-only log of critical system transitions.

---

## 🔄 Core Application Workflows

### 1. Patient Booking & AI Triage Flow
```text
Patient selects Doctor & Date
      ↓
GET /api/doctors/:id/slots (Filtered against DoctorWorkingHours & DoctorLeave)
      ↓
Patient selects time slot
      ↓
POST /api/appointments (Holds slot for 5 mins; prevents conflicts)
      ↓
Patient submits Symptoms & Severity
      ↓
POST /api/appointments/:id/symptoms (Gemini 1.5 Flash generates clinical brief)
      ↓
POST /api/appointments/:id/confirm (Marks slot CONFIRMED; queues BullMQ email)
```

### 2. Doctor Consultation & Medication Follow-Up Flow
```text
Doctor opens Today's Queue (GET /api/appointments/today)
      ↓
Doctor inspects AI Pre-Visit Brief (Urgency, Red Flags, Diagnostic Questions)
      ↓
Doctor conducts Consultation
      ↓
POST /api/visits (Records Clinical Notes, Diagnosis, Prescriptions)
      ↓
Backend automatically generates:
  1. Post-Visit plain language patient brief via Gemini AI
  2. MedicationReminder records scheduled across prescription duration
  3. Updates Appointment status to COMPLETED
```

### 3. Admin Leave Scheduling & Conflict Resolution Flow
```text
Admin selects Doctor and Leave Date Range
      ↓
POST /api/admin/leaves/conflicts (Queries overlapping confirmed appointments)
      ↓
Admin inspects conflict preview list
      ↓
POST /api/admin/leaves (Atomic Prisma Transaction):
  1. Creates DoctorLeave record
  2. Cancels conflicting appointments (CANCELLED_BY_LEAVE)
  3. Enqueues BullMQ cancellation alert emails for affected patients
  4. Records action in AuditLog
```

---

## 🛡️ Error Handling & Reliability

- **Transactional Consistency**: Multi-step operations (slot booking, visit recording, leave cancellation) execute inside `prisma.$transaction` blocks with rollbacks on failure.
- **Graceful AI Degradation**: If Google Gemini API is unreachable or rate-limited, the system falls back to raw clinical notes without failing the consultation or booking.
- **Stale Hold Expiration**: When fetching slots, expired `HELD` appointments are automatically garbage-collected and transitioned to `EXPIRED`.
- **CORS Protection**: Access is strictly limited to authorized frontend origins in production mode.

---

## 🧪 Testing & Quality Assurance

CareSync includes an automated **Playwright** UI test suite that validates critical flows, form validations, empty states, and accessibility across multiple viewports:
- **Desktop** (1440x900)
- **Tablet** (768x900)
- **Mobile** (iPhone 12 / 375x667)

### Run Linting & Type Checking
```bash
npm run lint
```

### Run End-to-End Tests
Ensure local services are running, then execute:
```bash
npm run test:ui
```

---

## 🚢 Deployment Guidelines

### Monorepo Deployment Overview
- **Frontend (Vercel / Netlify / Cloudflare Pages)**:
  - Root directory: `apps/frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
- **Backend API (Render / Railway / AWS ECS)**:
  - Root directory: `apps/backend`
  - Build command: `npm run db:generate && tsc`
  - Start command: `node dist/server.js`
- **Background Worker (Render Background Worker / Railway)**:
  - Command: `node dist/queues/workers.js`
- **Database & Cache**:
  - PostgreSQL hosted on Supabase, Neon, or AWS RDS.
  - Redis hosted on Upstash or Redis Cloud.

---

## ⚠️ Known Limitations

1. **In-Memory Rate Limiting**: The current rate limiter uses memory storage suitable for single-node instances. In a distributed multi-instance deployment, configure `rate-limit-redis`.
2. **Mock OAuth Fallback**: When `GOOGLE_CLIENT_ID` is not supplied in development, Google Calendar sync returns simulated event IDs for local testing.
3. **Mock Email Fallback**: When `RESEND_API_KEY` is not provided, transactional emails are logged to the console instead of sending live emails.

---

## 🗺️ Future Roadmap

- [ ] **WebSockets / Server-Sent Events (SSE)**: Live real-time doctor queue updates without polling.
- [ ] **Integrated Telehealth Video**: WebRTC integration for remote patient-doctor video consultations.
- [ ] **Payment Gateway**: Stripe / Razorpay integration for appointment consultation fee processing.
- [ ] **Patient Medical Records Upload**: Secure attachment of PDF lab reports and prescription scans.

---

## 📄 License

No license has currently been specified. All rights reserved.

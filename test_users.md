# CareSync — Test User Directory & Credentials

All test accounts are pre-seeded in the database with rich clinical histories, longitudinal care timelines, daily medication adherence schedules, active doctor queues, and telemetry records.

**Global Password for All Accounts:** `password`

---

## Patient Accounts

| Name | Email | Password | Role / Demographics | Clinical Case & Scenario |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Mitchell** | `patient@example.com` | `password` | Female, 38 yrs | **Stage 1 Essential Hypertension & Exertional Tachycardia**<br>• Completed historical visit with Dr. Sarah Chen with plain-language summary.<br>• Active **My Medications** schedule for Lisinopril 10mg & Omega-3 with dose logging.<br>• Confirmed upcoming appointment in Dr. Chen's queue today. |
| **Alex Rivera** | `alex@example.com` | `password` | Male, 29 yrs | **Sports Performance & Orthostatic Dizziness**<br>• In Dr. Sarah Chen's queue today for post-run lightheadedness.<br>• Has a cancelled sports physical exam to demonstrate status handling. |
| **Mia Thompson** | `mia@example.com` | `password` | Female, 44 yrs | **Contact Dermatitis & Classical Migraine with Aura**<br>• Historical neurology consultation with Dr. Elena Vargas (Sumatriptan & Magnesium Glycinate).<br>• Active queue appointment today with Dr. Marco Ricci (Dermatology). |
| **David Park** | `david@example.com` | `password` | Male, 8 yrs *(Parent account)* | **Pediatric Allergic Asthma**<br>• Completed care consultation with Dr. James Okafor.<br>• Active Albuterol HFA spacer prescription with upcoming follow-up. |
| **Fatima Al-Hassan** | `fatima@example.com` | `password` | Female, 52 yrs | **Type 2 Diabetes Mellitus & Neuropathy Check**<br>• Quarterly glycemic review with Dr. Ananya Gupta.<br>• Metformin 850mg BID schedule & diabetic foot sensory check. |
| **Robert Chen** | `robert@example.com` | `password` | Male, 67 yrs | **Suspected Acute Coronary Syndrome (ACS)**<br>• Acute crushing chest pain radiating to left arm.<br>• Triggers **High-Urgency Red-Flag** banner in Dr. Sarah Chen's queue today. |

---

## Doctor Accounts

| Doctor Name | Email | Password | Specialization | Experience & Schedule |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Sarah Chen** | `doctor@example.com` | `password` | **Cardiology & Internal Medicine** | **15 Years Exp** · Mon–Sun (08:30–17:00)<br>• Has Sarah Mitchell (Medium Urgency), Alex Rivera (Low Urgency), and Robert Chen (High Urgency) in queue today.<br>• Features 30-Second AI Briefing HUD & crash-resilient auto-saving visit charting. |
| **Dr. James Okafor** | `okafor@clinic.io` | `password` | **Pediatrics & Adolescent Care** | **12 Years Exp** · Mon–Fri (09:00–16:30)<br>• Completed care records and inhaler guidance for David Park. |
| **Dr. Marco Ricci** | `ricci@clinic.io` | `password` | **Dermatology & Skin Allergies** | **10 Years Exp** · Mon/Wed/Fri (10:00–18:00)<br>• Has Mia Thompson in queue today for contact dermatitis.<br>• Approved symposium leave schedule on file. |
| **Dr. Elena Vargas** | `vargas@clinic.io` | `password` | **Neurology & Headache Specialist** | **18 Years Exp** · Tue/Thu/Sat (09:00–17:00)<br>• Classical migraine with aura care plan for Mia Thompson. |
| **Dr. Ananya Gupta** | `gupta@clinic.io` | `password` | **General Practice & Preventive Medicine** | **8 Years Exp** · Mon–Fri (08:00–16:00)<br>• Chronic disease management and glycemic review for Fatima Al-Hassan. |

---

## Operations Administrator Account

| Name | Email | Password | Role | Permissions & Features |
| :--- | :--- | :--- | :--- | :--- |
| **Operations Admin** | `admin@example.com` | `password` | `ADMIN` | **Full Administrative & Telemetry Access**<br>• Live worker health stats for BullMQ email jobs, Google Calendar syncs, and Gemini AI triage reliability.<br>• Manage Doctor profiles, working hours, and slot durations.<br>• Review doctor leave requests and audit logs. |

---

## Recommended Test Flows

### 1. Patient Experience (`patient@example.com`)
1. **Health Timeline**: Click **"Health Timeline"** from the sidebar or dashboard card to review previous clinical notes, diagnosis badges, plain-language summaries, and the **"Book Recommended Follow-up"** bridge.
2. **Medication Tracker**: Click **"My Medications"** to inspect scheduled Lisinopril and Omega-3 doses and tap doses to log adherence as Taken / Missed.
3. **Smart Symptom Intake**: Click **"Find Doctor"** or **"Book Appointment"** to test the new intake with onset pattern (Gradual vs. Sudden), 1–10 visual severity bar, and associated symptom toggles.

### 2. Clinical Consultation Flow (`doctor@example.com`)
1. **30-Second AI Briefing HUD**: Open **"Patient Queue"** and click on patients (e.g. *Sarah Mitchell* or *Robert Chen*) to review the triage urgency badges, red flags, missing clinical context, and diagnostic probe questions.
2. **Crash-Resilient Charting**: Click **"Start Consultation"** / **"Visit"**, type notes, and observe the live *"Draft auto-saved"* status.
3. **Quick Presets**: Tap `+ Amoxicillin (500mg)` or `+ Paracetamol (650mg)` to fast-populate prescription fields.

### 3. Background Telemetry & Observability (`admin@example.com`)
1. **Worker Telemetry**: Click **"Worker Telemetry"** from the navigation bar to inspect real-time metrics for the Email worker queue, Google Calendar sync, and Gemini 1.5 Flash triage reliability.
2. **Doctor Roster**: Click **"Manage Doctors"** to see live doctor working hours and onboard new clinicians.

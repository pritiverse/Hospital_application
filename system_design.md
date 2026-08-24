# CareSync — System Design Write-Up

This document outlines the architectural mechanisms in CareSync for concurrency safety, clinician leave resolution, temporary slot reservations, and resilient background notification handling.

---

## 1. Double-Booking Prevention and Concurrency Control

In outpatient clinical environments, concurrent booking attempts for the same physician slot can lead to race conditions if validation is executed solely in the application layer. CareSync enforces concurrency safety using a three-tier defense model:

```text
Concurrent Requests (Patient A & Patient B)
                     │
                     ▼
       ┌───────────────────────────┐
       │   Application Controller  │ (Validates working hours & leaves)
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │    Prisma Transaction     │ ($transaction isolation)
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │   PostgreSQL Unique Index │ @@unique([doctorId, slotStart])
       └───────────────────────────┘
```

1. **Database-Level Unique Index**: The `Appointment` table enforces a strict composite constraint:
   ```prisma
   @@unique([doctorId, slotStart], name: "doctor_slot_unique")
   ```
   If two requests attempt to reserve the same clinician slot concurrently, the database guarantees that exactly one transaction succeeds while the other fails with a unique constraint violation (`P2002`).

2. **Idempotency Key Enforcement**: Client booking requests require an `idempotencyKey` stored as a unique column in the `Appointment` model. Network retries with the same key safely return the existing reservation rather than generating duplicate entries.

3. **Status-Aware Slot Computation**: The slot generator (`GET /api/doctors/:id/slots`) excludes existing appointments with statuses `CONFIRMED`, `COMPLETED`, and active `HELD`.

---

## 2. Doctor Leave Conflict Handling

When a clinician is marked on leave, all overlapping patient bookings must be identified and cancelled without leaving orphaned records.

```text
Admin Submits Leave Request (startDate, endDate)
                     │
                     ▼
       ┌───────────────────────────┐
       │ Conflict Preview Endpoint │ (POST /api/admin/leaves/conflicts)
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │ Atomic Prisma Transaction │ (POST /api/admin/leaves)
       │ • Creates DoctorLeave     │
       │ • Updates Appointments to │
       │   CANCELLED_BY_LEAVE      │
       │ • Queues BullMQ Alerts    │
       │ • Writes AuditLog Record  │
       └───────────────────────────┘
```

1. **Pre-Flight Conflict Inspection**: Prior to approval, the system executes `POST /api/admin/leaves/conflicts`, querying all appointments where:
   ```sql
   doctorId = :id AND slotStart >= :leaveStart AND slotStart < :leaveEnd AND status IN ('CONFIRMED', 'HELD')
   ```
   The administrator reviews all affected patients before confirmation.

2. **Atomic Execution**: The leave creation runs within a single `prisma.$transaction`:
   - Persists the `DoctorLeave` record.
   - Batch-updates affected appointments to `CANCELLED_BY_LEAVE`.
   - Dispatches cancellation alert jobs to the BullMQ notification queue.
   - Appends an immutable record to `AuditLog`.

---

## 3. Slot Hold Mechanism and Expiration Lifecycle

To allow patients to complete symptom intake without being sniped by competing users, CareSync implements a 5-minute optimistic hold lifecycle:

```text
Patient Selects Slot ──► Status: HELD (holdExpiresAt = now + 5 mins)
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
Patient Confirms Within 5m             Hold Exceeds 5m Without Confirmation
          │                                           │
Status ──► CONFIRMED                   Lazy Cleanup: Status ──► EXPIRED
(Hold locked in database)              (Slot reclaimed for public booking)
```

1. **Hold Reservation**: Initiating a booking sets `status = HELD` and `holdExpiresAt = now() + 300,000ms`.
2. **Lazy and Proactive Cleanup**: Rather than relying solely on cron pollers, slot queries dynamically evaluate expiration:
   ```typescript
   if (status === 'HELD' && holdExpiresAt < new Date()) {
     // Slot is treated as open and asynchronously transitioned to EXPIRED
   }
   ```
3. **Checkout Finalization**: `POST /api/appointments/:id/confirm` validates that `holdExpiresAt > now()` before transitioning the status to `CONFIRMED`.

---

## 4. Notification Failure and Background Job Handling

To prevent third-party email (SMTP/Resend) or calendar latencies from impacting user responsiveness, all external side-effects are decoupled into asynchronous background queues:

```text
Core API Mutation (Booking / Cancellation / Visit)
                     │
                     ▼
       ┌───────────────────────────┐
       │   Redis BullMQ Queue      │ (NotificationJob status: PENDING)
       └─────────────┬─────────────┘
                     ▼
       ┌───────────────────────────┐
       │  BullMQ Worker Execution  │
       └──────┬─────────────┬──────┘
       Success│             │Failure
              ▼             ▼
       Status: SENT   Exponential Backoff (Attempts 1..5)
                            │
                            ▼
                      After 5 Failures: FAILED_PERMANENTLY
```

1. **Decoupled Job Dispatch**: API controllers record a `NotificationJob` row in PostgreSQL and enqueue a BullMQ job in Redis. The HTTP response returns immediately (<50ms).
2. **Exponential Backoff Retry Policy**: BullMQ workers execute with configurable retry policies:
   ```typescript
   { attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
   ```
3. **Dead-Letter Traceability**: If a job fails permanently, its state transitions to `FAILED_PERMANENTLY` with the exact error logged in `NotificationJob.lastError`.
4. **Telemetry Observability**: Administrators monitor queue health via `GET /api/admin/telemetry`, exposing real-time counts for `sent`, `pending`, `retrying`, and `failed` jobs alongside delivery health scores.

import { z } from 'zod';
import prisma from '../lib/prisma';

const PreVisitSchema = z.object({
  urgency: z.enum(['Low', 'Medium', 'High']),
  chiefComplaint: z.string().max(300),
  suggestedQuestions: z.array(z.string()).length(3),
  redFlags: z.array(z.string()).optional().default([]),
});

const PROMPT_VERSION = 'previsit-v2';

const SYSTEM_PROMPT = `You are a clinical decision-support assistant helping doctors prepare for patient consultations.
Given a patient's symptom description, produce a structured pre-visit brief in JSON format.

Respond ONLY with valid JSON matching this schema:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "One sentence clinical framing of the primary complaint (max 200 chars)",
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"],
  "redFlags": ["Any red-flag symptoms if present, otherwise empty array"]
}

Guidelines:
- urgency: Low = routine, Medium = needs attention, High = potentially serious
- chiefComplaint: clinical language, third-person ("Patient reports…")
- suggestedQuestions: 3 targeted questions the doctor should ask, specific to the symptoms
- redFlags: list any potentially serious symptoms mentioned; empty array if none`;

/** Call the real Gemini API. Falls back gracefully on failure. */
const callGemini = async (symptomText: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${SYSTEM_PROMPT}\n\nPatient symptom description:\n"${symptomText}"\n\nRespond only with the JSON object.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  // Strip markdown code fences if present
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
};

const withTimeout = <T>(promise: Promise<T>, ms: number) => {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

export async function generatePreVisitSummary(appointmentId: string, symptomText: string) {
  const record = await prisma.preVisitSummary.upsert({
    where: { appointmentId },
    update: { status: 'PENDING', promptVersion: PROMPT_VERSION, model: 'gemini-1.5-flash' },
    create: { appointmentId, status: 'PENDING', promptVersion: PROMPT_VERSION, model: 'gemini-1.5-flash' },
  });

  try {
    const raw = await withTimeout(callGemini(symptomText), 10000);
    const parsed = PreVisitSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      await prisma.preVisitSummary.update({
        where: { id: record.id },
        data: { status: 'INVALID_SCHEMA', rawResponse: raw, errorMessage: parsed.error.message },
      });
      return fallbackSummary();
    }

    await prisma.preVisitSummary.update({
      where: { id: record.id },
      data: {
        urgency: parsed.data.urgency,
        chiefComplaint: parsed.data.chiefComplaint,
        suggestedQuestions: parsed.data.suggestedQuestions,
        redFlags: parsed.data.redFlags,
        status: 'SUCCESS',
        rawResponse: raw,
        generatedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'AI_SUMMARY_GENERATED',
        entityType: 'PreVisitSummary',
        entityId: record.id,
        metadata: { status: 'SUCCESS', model: 'gemini-1.5-flash', promptVersion: PROMPT_VERSION },
      },
    });

    return parsed.data;
  } catch (err: any) {
    await prisma.preVisitSummary.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorMessage: String(err) },
    });
    return fallbackSummary();
  }
}

function fallbackSummary() {
  return { urgency: null, chiefComplaint: null, suggestedQuestions: [], redFlags: [], fallback: true };
}

export const PostVisitSchema = z.object({
  summary: z.string(),
  medicationSchedule: z.array(
    z.object({
      medicine: z.string(),
      instructions: z.string(),
    })
  ).optional().default([]),
  followUp: z.string().optional().default(''),
});

const POST_VISIT_PROMPT_VERSION = 'postvisit-v1';

const POST_VISIT_SYSTEM_PROMPT = `You are a clinical communications assistant. You summarize a doctor's clinical visit notes into clear, patient-friendly language.
Respond ONLY with valid JSON matching this schema:
{
  "summary": "Plain English summary of the consultation, diagnosis, and key takeaways for the patient (2-3 sentences)",
  "medicationSchedule": [
    { "medicine": "Medicine name", "instructions": "Plain English instructions on how and when to take it" }
  ],
  "followUp": "When or under what conditions to seek follow-up care"
}`;

const callGeminiPostVisit = async (clinicalNotes: string, diagnosis?: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${POST_VISIT_SYSTEM_PROMPT}\n\nDoctor's Clinical Notes:\n"${clinicalNotes}"\n\nDiagnosis: "${diagnosis || 'None'}"\n\nRespond only with the JSON object.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
};

export async function generatePostVisitSummary(visitId: string, clinicalNotes: string, diagnosis?: string) {
  try {
    const raw = await withTimeout(callGeminiPostVisit(clinicalNotes, diagnosis), 10000);
    const parsed = PostVisitSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      await prisma.visit.update({
        where: { id: visitId },
        data: { patientSummary: clinicalNotes, patientSummaryStatus: 'INVALID_SCHEMA' },
      });
      return { summary: clinicalNotes, fallback: true };
    }

    const summaryText = parsed.data.summary;
    await prisma.visit.update({
      where: { id: visitId },
      data: { patientSummary: summaryText, patientSummaryStatus: 'SUCCESS' },
    });

    await prisma.auditLog.create({
      data: {
        action: 'AI_POST_VISIT_SUMMARY_GENERATED',
        entityType: 'Visit',
        entityId: visitId,
        metadata: { status: 'SUCCESS', model: 'gemini-1.5-flash', promptVersion: POST_VISIT_PROMPT_VERSION },
      },
    });

    return parsed.data;
  } catch (err: any) {
    await prisma.visit.update({
      where: { id: visitId },
      data: { patientSummary: clinicalNotes, patientSummaryStatus: 'FAILED' },
    });
    return { summary: clinicalNotes, fallback: true };
  }
}


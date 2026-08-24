import { Request, Response } from 'express';
import { bookAppointment } from '../services/AppointmentService';

export const bookAppointmentController = async (req: Request, res: Response) => {
  try {
    const { doctorId, slotStart, idempotencyKey } = req.body;
    const patientId = req.user.id; // From auth middleware

    // Controllers do not contain business logic. They delegate to the Service layer.
    // This allows the Service layer to be unit-tested without mocking Express Request/Response objects.
    const appointment = await bookAppointment(patientId, doctorId, new Date(slotStart), idempotencyKey);
    
    res.status(201).json(appointment);
  } catch (error: any) {
    if (error.code === 'SLOT_CONFLICT') {
      res.status(409).json({ error: error.message, alternatives: error.alternatives });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

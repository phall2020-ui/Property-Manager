export interface Appointment {
  id: string;
  ticketId: string;
  proposedBy: string;
  proposedByRole: string;
  startAt: string;
  endAt?: string;
  notes?: string;
  status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposeAppointmentData {
  startAt: string;
  endAt?: string;
  notes?: string;
}

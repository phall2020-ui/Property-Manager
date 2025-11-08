import { z } from 'zod';

// Request Schemas
export const CreateTicketRequestSchema = z.object({
  propertyId: z.string().optional(),
  tenancyId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().optional(),
});

export const UpdateTicketStatusRequestSchema = z.object({
  to: z.string(),
});

export const ApproveTicketRequestSchema = z.object({
  idempotencyKey: z.string().optional(),
});

export const CreateQuoteRequestSchema = z.object({
  amount: z.number().min(0),
  notes: z.string().optional(),
});

export const CompleteTicketRequestSchema = z.object({
  completionNotes: z.string().optional(),
});

export const AssignTicketRequestSchema = z.object({
  contractorId: z.string(),
});

export const ProposeAppointmentRequestSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// Response Schemas
export const TicketSchema = z.object({
  id: z.string(),
  propertyId: z.string().nullable().optional(),
  tenancyId: z.string().nullable().optional(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().nullable().optional(),
  status: z.string(),
  assignedContractorId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TicketListResponseSchema = z.array(TicketSchema);

export const QuoteSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  amount: z.number(),
  notes: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AppointmentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['PROPOSED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TicketTimelineEventSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()),
  createdAt: z.string().datetime(),
});

export const TicketTimelineResponseSchema = z.array(TicketTimelineEventSchema);

// Export types
export type CreateTicketRequest = z.infer<typeof CreateTicketRequestSchema>;
export type UpdateTicketStatusRequest = z.infer<typeof UpdateTicketStatusRequestSchema>;
export type ApproveTicketRequest = z.infer<typeof ApproveTicketRequestSchema>;
export type CreateQuoteRequest = z.infer<typeof CreateQuoteRequestSchema>;
export type CompleteTicketRequest = z.infer<typeof CompleteTicketRequestSchema>;
export type AssignTicketRequest = z.infer<typeof AssignTicketRequestSchema>;
export type ProposeAppointmentRequest = z.infer<typeof ProposeAppointmentRequestSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type TicketListResponse = z.infer<typeof TicketListResponseSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;
export type TicketTimelineEvent = z.infer<typeof TicketTimelineEventSchema>;
export type TicketTimelineResponse = z.infer<typeof TicketTimelineResponseSchema>;

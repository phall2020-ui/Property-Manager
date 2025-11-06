import { z } from 'zod';

export const TicketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'AWAITING_QUOTE',
  'QUOTE_SUBMITTED',
  'APPROVED',
  'COMPLETED',
  'CLOSED',
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketSchema = z.object({
  id: z.string(),
  tenancyId: z.string(),
  reporterId: z.string(),
  assignedContractorId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Ticket = z.infer<typeof TicketSchema>;

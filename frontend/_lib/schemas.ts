import { z } from 'zod';

/**
 * Zod schemas for request and response DTOs used throughout the app. These
 * schemas provide validation on both client and server (via the edge API
 * routes in the app router) and ensure that TypeScript types are derived
 * directly from the validation rules.
 */

export const AddressSchema = z.object({
  addressLine1: z.string().min(1, { message: 'Address line 1 is required' }),
  addressLine2: z.string().optional(),
  city: z.string().min(1, { message: 'City is required' }),
  postcode: z.string().min(3, { message: 'Postcode is required' }),
});

export const CreatePropertySchema = AddressSchema;
export type CreatePropertyDTO = z.infer<typeof CreatePropertySchema>;

export const CreateTenancySchema = z.object({
  propertyId: z.string().min(1),
  tenantEmail: z.string().email({ message: 'Tenant email is required' }),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  rent: z.number().nonnegative(),
  depositScheme: z.string().min(1),
});
export type CreateTenancyDTO = z.infer<typeof CreateTenancySchema>;

export const CreateTicketSchema = z.object({
  propertyId: z.string().min(1),
  category: z.string().min(1, { message: 'Category is required' }),
  description: z.string().min(5, { message: 'Description is required' }),
  attachments: z.array(z.string().url()).optional(),
});
export type CreateTicketDTO = z.infer<typeof CreateTicketSchema>;

export const SubmitQuoteSchema = z.object({
  amount: z.number().nonnegative(),
  notes: z.string().optional(),
  eta: z.string().min(1),
});
export type SubmitQuoteDTO = z.infer<typeof SubmitQuoteSchema>;

export const ApproveQuoteSchema = z.object({ approved: z.boolean() });
export type ApproveQuoteDTO = z.infer<typeof ApproveQuoteSchema>;

/**
 * Generic API response wrapper used for TanStack Query; you can extend this
 * pattern to include pagination metadata.
 */
export const PaginatedResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    items: z.array(schema),
    total: z.number().optional(),
  });
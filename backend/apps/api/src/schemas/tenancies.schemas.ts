import { z } from 'zod';

// Request Schemas
export const CreateTenancyRequestSchema = z.object({
  propertyId: z.string(),
  tenantOrgId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  rentPcm: z.number().min(0),
  deposit: z.number().min(0),
});

export const UpdateTenancyRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  rentPcm: z.number().min(0).optional(),
  deposit: z.number().min(0).optional(),
});

export const TerminateTenancyRequestSchema = z.object({
  terminationDate: z.string().datetime(),
  reason: z.string().optional(),
  noticeGivenDate: z.string().datetime().optional(),
});

export const RenewTenancyRequestSchema = z.object({
  newEndDate: z.string().datetime(),
  newRentPcm: z.number().min(0).optional(),
});

export const RentIncreaseRequestSchema = z.object({
  newRentPcm: z.number().min(0),
  effectiveDate: z.string().datetime(),
  reason: z.string().optional(),
});

// Response Schemas
export const TenancySchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  tenantOrgId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  rentPcm: z.number(),
  deposit: z.number(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'EXPIRED', 'TERMINATED']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TenancyListResponseSchema = z.array(TenancySchema);

// Export types
export type CreateTenancyRequest = z.infer<typeof CreateTenancyRequestSchema>;
export type UpdateTenancyRequest = z.infer<typeof UpdateTenancyRequestSchema>;
export type TerminateTenancyRequest = z.infer<typeof TerminateTenancyRequestSchema>;
export type RenewTenancyRequest = z.infer<typeof RenewTenancyRequestSchema>;
export type RentIncreaseRequest = z.infer<typeof RentIncreaseRequestSchema>;
export type Tenancy = z.infer<typeof TenancySchema>;
export type TenancyListResponse = z.infer<typeof TenancyListResponseSchema>;

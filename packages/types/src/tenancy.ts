import { z } from 'zod';

export const TenancyStatusSchema = z.enum(['ACTIVE', 'PENDING', 'ENDED']);
export type TenancyStatus = z.infer<typeof TenancyStatusSchema>;

export const TenancySchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  tenantUserId: z.string(),
  startDate: z.date(),
  endDate: z.date().nullable(),
  monthlyRent: z.number(),
  status: TenancyStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Tenancy = z.infer<typeof TenancySchema>;

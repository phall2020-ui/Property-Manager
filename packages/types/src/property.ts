import { z } from 'zod';

export const PropertySchema = z.object({
  id: z.string(),
  address1: z.string(),
  address2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
  ownerOrgId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Property = z.infer<typeof PropertySchema>;

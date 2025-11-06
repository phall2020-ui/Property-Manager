import { z } from 'zod';

export const RoleSchema = z.enum(['LANDLORD', 'TENANT', 'CONTRACTOR', 'OPS']);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  landlordId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

import { z } from 'zod';

// Request Schemas
export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Response Schemas
export const UserOrganisationSchema = z.object({
  orgId: z.string(),
  orgName: z.string(),
  role: z.enum(['LANDLORD', 'TENANT', 'CONTRACTOR', 'OPS']),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  organisations: z.array(UserOrganisationSchema),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserSchema,
});

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
});

// Export types
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UserOrganisation = z.infer<typeof UserOrganisationSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

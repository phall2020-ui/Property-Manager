// Re-export backend schemas for frontend use
// This file mirrors the backend schemas for type safety and validation

import { z } from 'zod';

// ===== Auth Schemas =====
export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

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

// ===== Properties Schemas =====
export const CreatePropertyRequestSchema = z.object({
  addressLine1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  bedrooms: z.number().int().min(0).optional(),
  councilTaxBand: z.string().optional(),
});

export const UpdatePropertyRequestSchema = z.object({
  addressLine1: z.string().min(1).optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  bedrooms: z.number().int().min(0).optional(),
  councilTaxBand: z.string().optional(),
});

export const PropertySchema = z.object({
  id: z.string(),
  addressLine1: z.string(),
  address2: z.string().nullable().optional(),
  city: z.string(),
  postcode: z.string(),
  bedrooms: z.number().int().nullable().optional(),
  councilTaxBand: z.string().nullable().optional(),
  ownerOrgId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export const PropertyListResponseSchema = z.array(PropertySchema);

// ===== Tenancies Schemas =====
export const CreateTenancyRequestSchema = z.object({
  propertyId: z.string(),
  tenantOrgId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  rentPcm: z.number().min(0),
  deposit: z.number().min(0),
});

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

// ===== Tickets Schemas =====
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

// Export types
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UserOrganisation = z.infer<typeof UserOrganisationSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export type CreatePropertyRequest = z.infer<typeof CreatePropertyRequestSchema>;
export type UpdatePropertyRequest = z.infer<typeof UpdatePropertyRequestSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type PropertyListResponse = z.infer<typeof PropertyListResponseSchema>;

export type CreateTenancyRequest = z.infer<typeof CreateTenancyRequestSchema>;
export type Tenancy = z.infer<typeof TenancySchema>;
export type TenancyListResponse = z.infer<typeof TenancyListResponseSchema>;

export type CreateTicketRequest = z.infer<typeof CreateTicketRequestSchema>;
export type UpdateTicketStatusRequest = z.infer<typeof UpdateTicketStatusRequestSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type TicketListResponse = z.infer<typeof TicketListResponseSchema>;

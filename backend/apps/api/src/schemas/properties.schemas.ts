import { z } from 'zod';

// Request Schemas
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

export const ListPropertiesQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

export const DeletePropertyQuerySchema = z.object({
  force: z.boolean().optional(),
  purgeImages: z.boolean().optional(),
});

// Response Schemas
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

// Export types
export type CreatePropertyRequest = z.infer<typeof CreatePropertyRequestSchema>;
export type UpdatePropertyRequest = z.infer<typeof UpdatePropertyRequestSchema>;
export type ListPropertiesQuery = z.infer<typeof ListPropertiesQuerySchema>;
export type DeletePropertyQuery = z.infer<typeof DeletePropertyQuerySchema>;
export type Property = z.infer<typeof PropertySchema>;
export type PropertyListResponse = z.infer<typeof PropertyListResponseSchema>;

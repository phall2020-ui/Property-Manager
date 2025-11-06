import { z } from 'zod';

/**
 * Zod schemas for request and response DTOs used throughout the app. These
 * schemas provide validation on both client and server (via the edge API
 * routes in the app router) and ensure that TypeScript types are derived
 * directly from the validation rules.
 */

// ============================================================================
// UK-SPECIFIC VALIDATORS
// ============================================================================

/**
 * UK Postcode validation (basic pattern)
 * Accepts formats like: SW1A 1AA, EC1A 1BB, W1A 0AX, GIR 0AA
 * Enforces single space between inward and outward codes
 */
export const ukPostcode = z.string().regex(
  /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2})$/i,
  'Enter a valid UK postcode (e.g., SW1A 1AA)'
);

/**
 * UK Phone number validation (E.164 format)
 */
export const ukPhone = z.string().regex(
  /^\+44\d{10}$/,
  'Enter a valid UK phone number (e.g., +447700900000)'
).optional();

/**
 * Money amount (GBP)
 */
export const moneyAmount = z.coerce.number().min(0, 'Amount must be positive');

/**
 * Deposit validation with 5 weeks rent warning
 */
export const depositSchema = (rentAmount?: number, frequency?: string) => {
  const schema = moneyAmount;
  if (rentAmount && frequency === 'Monthly') {
    const weeklyRent = (rentAmount * 12) / 52;
    const maxDeposit = weeklyRent * 5;
    return schema.refine(
      (val) => val <= maxDeposit,
      `Deposit should not exceed £${maxDeposit.toFixed(2)} (5 weeks rent)`
    );
  }
  return schema;
};

// ============================================================================
// ADDRESS & PROPERTY
// ============================================================================

export const AddressSchema = z.object({
  address1: z.string().min(2, 'Address line 1 is required'),
  address2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  postcode: ukPostcode,
});

export const PropertyAttributesSchema = z.object({
  propertyType: z.enum(['House', 'Flat', 'HMO', 'Maisonette', 'Bungalow', 'Other']).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  furnished: z.enum(['Unfurnished', 'Part', 'Full']).optional(),
  epcRating: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Unknown']).optional(),
});

export const CreatePropertySchema = AddressSchema.merge(PropertyAttributesSchema);
export type CreatePropertyDTO = z.infer<typeof CreatePropertySchema>;

// ============================================================================
// TENANCY & LEGAL
// ============================================================================

export const TenancyDetailsSchema = z.object({
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
  rentAmount: moneyAmount,
  rentFrequency: z.enum(['Monthly', 'Weekly', 'Other']),
  rentDueDay: z.coerce.number().int().min(1).max(28),
}).refine(
  (data) => !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

export const DepositLegalSchema = z.object({
  depositAmount: moneyAmount,
  depositScheme: z.enum(['DPS', 'TDS', 'MyDeposits', 'None']),
  depositProtectedAt: z.string().optional(),
  prescribedInfoServedAt: z.string().optional(),
  howToRentServedAt: z.string().optional(),
  rightToRentCheckedAt: z.string().optional(),
});

export const ComplianceSchema = z.object({
  gasSafetyDueAt: z.string().optional(),
  eicrDueAt: z.string().optional(),
  epcExpiresAt: z.string().optional(),
  hmo: z.boolean().default(false),
  hmoLicenceNumber: z.string().optional(),
  hmoLicenceExpiresAt: z.string().optional(),
  selectiveLicence: z.boolean().default(false),
  selectiveLicenceExpiresAt: z.string().optional(),
  boilerServiceDueAt: z.string().optional(),
  smokeAlarmsCheckedAt: z.string().optional(),
  coAlarmsCheckedAt: z.string().optional(),
  legionellaAssessmentAt: z.string().optional(),
});

export const TenantSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  email: z.string().email('Valid email required'),
  phone: ukPhone,
});

export const CreateTenancySchema = z.object({
  propertyId: z.string().min(1),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
  rentAmount: moneyAmount,
  rentFrequency: z.enum(['Monthly', 'Weekly', 'Other']),
  rentDueDay: z.coerce.number().int().min(1).max(28),
  depositAmount: moneyAmount,
  depositScheme: z.enum(['DPS', 'TDS', 'MyDeposits', 'None']),
  depositProtectedAt: z.string().optional(),
  prescribedInfoServedAt: z.string().optional(),
  howToRentServedAt: z.string().optional(),
  rightToRentCheckedAt: z.string().optional(),
  gasSafetyDueAt: z.string().optional(),
  eicrDueAt: z.string().optional(),
  epcExpiresAt: z.string().optional(),
  hmo: z.boolean().default(false),
  hmoLicenceNumber: z.string().optional(),
  hmoLicenceExpiresAt: z.string().optional(),
  selectiveLicence: z.boolean().default(false),
  selectiveLicenceExpiresAt: z.string().optional(),
  boilerServiceDueAt: z.string().optional(),
  smokeAlarmsCheckedAt: z.string().optional(),
  coAlarmsCheckedAt: z.string().optional(),
  legionellaAssessmentAt: z.string().optional(),
  tenants: z.array(TenantSchema).min(1, 'At least one tenant required'),
}).refine(
  (data) => !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

export type CreateTenancyDTO = z.infer<typeof CreateTenancySchema>;
export type TenantDTO = z.infer<typeof TenantSchema>;

export const CreateTicketSchema = z.object({
  propertyId: z.string().min(1).optional(),
  tenancyId: z.string().min(1).optional(),
  title: z.string().min(3, { message: 'Title is required (min 3 characters)' }),
  category: z.string().min(1, { message: 'Category is required' }),
  description: z.string().min(10, { message: 'Description is required (min 10 characters)' }),
  priority: z.enum(['LOW', 'STANDARD', 'MEDIUM', 'HIGH']).default('STANDARD'),
  photos: z.array(z.string()).optional(),
}).refine(
  (data) => data.propertyId || data.tenancyId,
  { message: 'Either propertyId or tenancyId is required', path: ['propertyId'] }
);
export type CreateTicketDTO = z.infer<typeof CreateTicketSchema>;

export const UpdatePropertySchema = z.object({
  addressLine1: z.string().min(2, 'Address line 1 is required').optional(),
  address2: z.string().optional(),
  city: z.string().min(2, 'City is required').optional(),
  postcode: ukPostcode.optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  councilTaxBand: z.string().optional(),
  attributes: z.object({
    propertyType: z.enum(['House', 'Flat', 'HMO', 'Maisonette', 'Bungalow', 'Other']).optional(),
    furnished: z.enum(['Unfurnished', 'Part', 'Full']).optional(),
    epcRating: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Unknown']).optional(),
    propertyValue: z.coerce.number().min(0).optional(),
  }).optional(),
});
export type UpdatePropertyDTO = z.infer<typeof UpdatePropertySchema>;

export const SubmitQuoteSchema = z.object({
  amount: z.number().nonnegative(),
  notes: z.string().optional(),
  eta: z.string().min(1),
});
export type SubmitQuoteDTO = z.infer<typeof SubmitQuoteSchema>;

export const ApproveQuoteSchema = z.object({ approved: z.boolean() });
export type ApproveQuoteDTO = z.infer<typeof ApproveQuoteSchema>;

// ============================================================================
// DOCUMENTS
// ============================================================================

export const DocumentTypeEnum = z.enum([
  'EPC',
  'Gas Safety (CP12)',
  'EICR',
  'Tenancy Agreement',
  'Deposit Certificate',
  'Prescribed Information',
  'How to Rent',
  'Right to Rent',
  'HMO Licence',
  'Selective Licence',
  'Boiler Service',
  'Insurance',
  'Title Extract',
  'Other',
]);

export const UploadDocumentSchema = z.object({
  docType: DocumentTypeEnum,
  filename: z.string().min(1),
  url: z.string().url(),
  expiryDate: z.string().optional(),
});

export type UploadDocumentDTO = z.infer<typeof UploadDocumentSchema>;

// ============================================================================
// LANDLORD PROFILE
// ============================================================================

export const LandlordProfileSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: ukPhone,
  notifyEmail: z.boolean().default(true),
  notifySms: z.boolean().default(false),
});

export type LandlordProfileDTO = z.infer<typeof LandlordProfileSchema>;

/**
 * Generic API response wrapper used for TanStack Query; you can extend this
 * pattern to include pagination metadata.
 */
export const PaginatedResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    items: z.array(schema),
    total: z.number().optional(),
    nextCursor: z.string().optional(),
  });
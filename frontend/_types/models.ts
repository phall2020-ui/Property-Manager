/**
 * Shared TypeScript models that mirror the server models. These interfaces
 * should be kept in sync with the backend OpenAPI definitions. They are
 * consumed throughout the client for strong typing.
 */

export enum Role {
  LANDLORD = 'LANDLORD',
  TENANT = 'TENANT',
  CONTRACTOR = 'CONTRACTOR',
  OPS = 'OPS',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  QUOTED = 'QUOTED',
  IN_PROGRESS = 'IN_PROGRESS',
  NEEDS_APPROVAL = 'NEEDS_APPROVAL',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export interface Organisation {
  orgId: string;
  orgName: string;
  role: Role;
}

export interface User {
  id: string;
  name: string;  // Backend returns 'name' not 'displayName'
  email: string;
  organisations: Organisation[];
  createdAt?: string;
  // Computed property for backward compatibility
  role?: Role;
}

export interface Property {
  id: string;
  address1: string;
  addressLine1?: string; // Alias for backward compatibility
  address2?: string;
  addressLine2?: string; // Alias for backward compatibility
  city: string;
  postcode: string;
  bedrooms?: number;
  propertyType?: string;
  furnished?: string;
  epcRating?: string;
  landlordId?: string;
  ownerOrgId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tenancy {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rent: number;
  depositScheme: string;
}

export interface Document {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  uploadedAt: string;
}

export interface Ticket {
  id: string;
  propertyId: string;
  tenantId: string;
  contractorId?: string;
  status: TicketStatus;
  category: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  type: 'created' | 'status_changed' | 'quote_submitted' | 'approved' | 'completed' | 'other';
  at: string;
  description: string;
  user?: User;
}
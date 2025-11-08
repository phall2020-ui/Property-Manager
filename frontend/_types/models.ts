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
  TRIAGED = 'TRIAGED',
  IN_PROGRESS = 'IN_PROGRESS',
  NEEDS_APPROVAL = 'NEEDS_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
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
  landlordId: string;
  propertyId?: string;
  tenancyId?: string;
  title: string;
  category?: string;
  description: string;
  createdById: string;
  assignedToId?: string;
  priority: string;
  status: TicketStatus | string;
  attachments?: string | any[];
  createdAt: string;
  updatedAt: string;
  inProgressAt?: string;
  scheduledWindowStart?: string;
  scheduledWindowEnd?: string;
  noShowAt?: string;
  createdByRole?: string;
  property?: any;
  tenancy?: any;
  createdBy?: any;
  assignedTo?: any;
  quotes?: any[];
  quoteAmount?: number;
  quoteNotes?: string;
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
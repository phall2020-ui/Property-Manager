import { describe, it, expect } from 'vitest';
import {
  SignupRequestSchema,
  LoginRequestSchema,
  CreatePropertyRequestSchema,
  CreateTicketRequestSchema,
  PropertySchema,
} from '../schemas/api-schemas';

describe('Contract Schema Validation Examples', () => {
  describe('Auth Schemas - Passing Cases', () => {
    it('should validate correct signup request', () => {
      const validSignup = {
        email: 'user@example.com',
        password: 'password123',
        name: 'John Doe',
      };

      const result = SignupRequestSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should validate correct login request', () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = LoginRequestSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });
  });

  describe('Auth Schemas - Failing Cases', () => {
    it('should reject signup with invalid email', () => {
      const invalidSignup = {
        email: 'not-an-email',
        password: 'password123',
        name: 'John Doe',
      };

      const result = SignupRequestSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid email');
      }
    });

    it('should reject signup with short password', () => {
      const invalidSignup = {
        email: 'user@example.com',
        password: '12345', // Too short
        name: 'John Doe',
      };

      const result = SignupRequestSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 6');
      }
    });

    it('should reject signup with missing name', () => {
      const invalidSignup = {
        email: 'user@example.com',
        password: 'password123',
        // name is missing
      };

      const result = SignupRequestSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Required');
      }
    });
  });

  describe('Properties Schemas - Passing Cases', () => {
    it('should validate correct property creation request', () => {
      const validProperty = {
        addressLine1: '123 Main Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
      };

      const result = CreatePropertyRequestSchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    it('should validate property with optional fields', () => {
      const validProperty = {
        addressLine1: '456 Oak Avenue',
        address2: 'Apartment 5B',
        city: 'Manchester',
        postcode: 'M1 1AA',
        bedrooms: 3,
        councilTaxBand: 'D',
      };

      const result = CreatePropertyRequestSchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    it('should validate property response', () => {
      const propertyResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        addressLine1: '123 Main Street',
        address2: null,
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
        councilTaxBand: null,
        ownerOrgId: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        deletedAt: null,
      };

      const result = PropertySchema.safeParse(propertyResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Properties Schemas - Failing Cases', () => {
    it('should reject property with empty address', () => {
      const invalidProperty = {
        addressLine1: '', // Empty string
        city: 'London',
        postcode: 'SW1A 1AA',
      };

      const result = CreatePropertyRequestSchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 1');
      }
    });

    it('should reject property with negative bedrooms', () => {
      const invalidProperty = {
        addressLine1: '123 Main Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: -1, // Negative
      };

      const result = CreatePropertyRequestSchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('greater than or equal to 0');
      }
    });

    it('should reject property with missing required fields', () => {
      const invalidProperty = {
        addressLine1: '123 Main Street',
        // Missing city and postcode
      };

      const result = CreatePropertyRequestSchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tickets Schemas - Passing Cases', () => {
    it('should validate correct ticket creation request', () => {
      const validTicket = {
        title: 'Leaking Tap',
        description: 'The kitchen tap is leaking badly',
        priority: 'HIGH' as const,
        propertyId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CreateTicketRequestSchema.safeParse(validTicket);
      expect(result.success).toBe(true);
    });

    it('should validate ticket with minimal fields', () => {
      const validTicket = {
        title: 'Broken Window',
        description: 'Window needs repair',
        priority: 'LOW' as const,
      };

      const result = CreateTicketRequestSchema.safeParse(validTicket);
      expect(result.success).toBe(true);
    });
  });

  describe('Tickets Schemas - Failing Cases', () => {
    it('should reject ticket with empty title', () => {
      const invalidTicket = {
        title: '', // Empty
        description: 'Description',
        priority: 'MEDIUM',
      };

      const result = CreateTicketRequestSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 1');
      }
    });

    it('should reject ticket with invalid priority', () => {
      const invalidTicket = {
        title: 'Test Ticket',
        description: 'Description',
        priority: 'CRITICAL', // Invalid enum value
      };

      const result = CreateTicketRequestSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid enum value');
      }
    });

    it('should reject ticket with missing description', () => {
      const invalidTicket = {
        title: 'Test Ticket',
        priority: 'MEDIUM',
        // Missing description
      };

      const result = CreateTicketRequestSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Required');
      }
    });
  });

  describe('Complex Validation Examples', () => {
    it('should provide detailed error messages for multiple validation failures', () => {
      const invalidData = {
        email: 'not-an-email',
        password: '123', // Too short
        name: '', // Empty
      };

      const result = SignupRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(2);
        const errorMessages = result.error.errors.map(e => e.message);
        expect(errorMessages.some(msg => msg.includes('email'))).toBe(true);
        expect(errorMessages.some(msg => msg.includes('6'))).toBe(true);
      }
    });

    it('should validate nested objects correctly', () => {
      const propertyWithAllFields = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        addressLine1: '789 Park Lane',
        address2: 'Suite 100',
        city: 'Birmingham',
        postcode: 'B1 1AA',
        bedrooms: 4,
        councilTaxBand: 'E',
        ownerOrgId: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const result = PropertySchema.safeParse(propertyWithAllFields);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bedrooms).toBe(4);
        expect(result.data.councilTaxBand).toBe('E');
      }
    });
  });
});

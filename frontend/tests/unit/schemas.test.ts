import { describe, it, expect } from 'vitest';
import {
  ukPostcode,
  CreatePropertySchema,
  SubmitQuoteSchema,
  CreateTicketSchema,
} from '@/lib/schemas';

describe('Zod Schemas', () => {
  describe('UK Postcode Validation', () => {
    it('accepts valid UK postcodes', () => {
      const validPostcodes = [
        'SW1A 1AA',
        'EC1A 1BB',
        'W1A 0AX',
        'M1 1AE',
        'B33 8TH',
        'CR2 6XH',
        'DN55 1PT',
        'GIR 0AA',
      ];

      validPostcodes.forEach((postcode) => {
        const result = ukPostcode.safeParse(postcode);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid UK postcodes', () => {
      const invalidPostcodes = [
        'SW1A1AA', // Missing space
        'SW1A  1AA', // Double space
        'INVALID',
        '12345',
      ];

      invalidPostcodes.forEach((postcode) => {
        const result = ukPostcode.safeParse(postcode);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('CreatePropertySchema', () => {
    it('validates property with required fields', () => {
      const validProperty = {
        address1: '123 Main Street',
        city: 'London',
        postcode: 'SW1A 1AA',
      };

      const result = CreatePropertySchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    it('validates property with optional fields', () => {
      const validProperty = {
        address1: '123 Main Street',
        address2: 'Flat 2B',
        city: 'London',
        postcode: 'SW1A 1AA',
        propertyType: 'Flat',
        bedrooms: 2,
        furnished: 'Full',
        epcRating: 'B',
      };

      const result = CreatePropertySchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    it('rejects property with invalid postcode', () => {
      const invalidProperty = {
        address1: '123 Main Street',
        city: 'London',
        postcode: 'INVALID',
      };

      const result = CreatePropertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('postcode');
      }
    });

    it('rejects property missing required fields', () => {
      const invalidProperty = {
        address1: '123 Main Street',
        // Missing city and postcode
      };

      const result = CreatePropertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
    });
  });

  describe('SubmitQuoteSchema', () => {
    it('validates quote with all required fields', () => {
      const validQuote = {
        amount: 150.50,
        eta: '2024-12-31',
        notes: 'Will complete within 2 days',
      };

      const result = SubmitQuoteSchema.safeParse(validQuote);
      expect(result.success).toBe(true);
    });

    it('validates quote without optional notes', () => {
      const validQuote = {
        amount: 150.50,
        eta: '2024-12-31',
      };

      const result = SubmitQuoteSchema.safeParse(validQuote);
      expect(result.success).toBe(true);
    });

    it('rejects quote with negative amount', () => {
      const invalidQuote = {
        amount: -50,
        eta: '2024-12-31',
      };

      const result = SubmitQuoteSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('amount');
      }
    });

    it('rejects quote with zero amount', () => {
      const invalidQuote = {
        amount: 0,
        eta: '2024-12-31',
      };

      const result = SubmitQuoteSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('rejects quote missing required fields', () => {
      const invalidQuote = {
        amount: 150.50,
        // Missing eta
      };

      const result = SubmitQuoteSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateTicketSchema', () => {
    it('validates ticket with propertyId', () => {
      const validTicket = {
        propertyId: 'prop-123',
        title: 'Broken Boiler',
        category: 'Heating',
        description: 'The boiler is not working properly',
      };

      const result = CreateTicketSchema.safeParse(validTicket);
      expect(result.success).toBe(true);
    });

    it('validates ticket with tenancyId', () => {
      const validTicket = {
        tenancyId: 'ten-123',
        title: 'Broken Boiler',
        category: 'Heating',
        description: 'The boiler is not working properly',
      };

      const result = CreateTicketSchema.safeParse(validTicket);
      expect(result.success).toBe(true);
    });

    it('rejects ticket with short title', () => {
      const invalidTicket = {
        propertyId: 'prop-123',
        title: 'No',
        category: 'Heating',
        description: 'The boiler is not working properly',
      };

      const result = CreateTicketSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
    });

    it('rejects ticket with short description', () => {
      const invalidTicket = {
        propertyId: 'prop-123',
        title: 'Broken Boiler',
        category: 'Heating',
        description: 'Broken',
      };

      const result = CreateTicketSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
    });

    it('rejects ticket without propertyId or tenancyId', () => {
      const invalidTicket = {
        title: 'Broken Boiler',
        category: 'Heating',
        description: 'The boiler is not working properly',
      };

      const result = CreateTicketSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
    });
  });
});

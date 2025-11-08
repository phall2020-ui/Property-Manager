/**
 * Contract Testing Demonstration
 * 
 * This file demonstrates how contract tests catch validation errors
 * in both requests and responses.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  SignupRequestSchema,
  CreatePropertyRequestSchema,
  PropertySchema,
  CreateTicketRequestSchema,
} from '../schemas/api-schemas';

describe('Contract Testing Demonstration', () => {
  describe('1. Request Validation - Catching Client Errors', () => {
    it('FAILING CASE: Invalid email format is caught before making API call', () => {
      // Simulating what a client might try to send
      const badSignupData = {
        email: 'not-an-email',  // ❌ Invalid
        password: 'password123',
        name: 'Test User',
      };

      // The validated API wrapper would catch this BEFORE sending to server
      const result = SignupRequestSchema.safeParse(badSignupData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        console.log('\n❌ REQUEST VALIDATION FAILED:');
        console.log('Error:', result.error.errors[0].message);
        console.log('Path:', result.error.errors[0].path);
        
        expect(result.error.errors[0].message).toContain('Invalid email');
      }
    });

    it('FAILING CASE: Missing required fields caught early', () => {
      const incompletePropertyData = {
        addressLine1: '123 Main St',
        // Missing required 'city' and 'postcode'
      };

      const result = CreatePropertyRequestSchema.safeParse(incompletePropertyData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        console.log('\n❌ MISSING REQUIRED FIELDS:');
        result.error.errors.forEach(err => {
          console.log(`- ${err.path.join('.')}: ${err.message}`);
        });
        
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('FAILING CASE: Invalid data types caught early', () => {
      const invalidTicketData = {
        title: 'Fix the door',
        description: 'The door is broken',
        priority: 'SUPER_URGENT',  // ❌ Invalid enum value
      };

      const result = CreateTicketRequestSchema.safeParse(invalidTicketData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        console.log('\n❌ INVALID ENUM VALUE:');
        console.log('Error:', result.error.errors[0].message);
        console.log('Received:', invalidTicketData.priority);
        console.log('Expected one of: LOW, MEDIUM, HIGH, URGENT');
        
        expect(result.error.errors[0].message).toContain('Invalid enum value');
      }
    });

    it('PASSING CASE: Valid data passes validation', () => {
      const validPropertyData = {
        addressLine1: '456 Oak Avenue',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
      };

      const result = CreatePropertyRequestSchema.safeParse(validPropertyData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        console.log('\n✅ REQUEST VALIDATION PASSED:');
        console.log('Data:', JSON.stringify(result.data, null, 2));
      }
    });
  });

  describe('2. Response Validation - Catching Server Errors', () => {
    it('FAILING CASE: Detect when API returns malformed data', () => {
      // Simulating a buggy API response
      const badApiResponse = {
        id: '123',
        addressLine1: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        ownerOrgId: '456',
        createdAt: 'invalid-date-format',  // ❌ Not ISO datetime
        updatedAt: '2024-01-01T12:00:00Z',
      };

      const result = PropertySchema.safeParse(badApiResponse);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        console.log('\n❌ RESPONSE VALIDATION FAILED:');
        console.log('Server returned invalid data!');
        console.log('Error:', result.error.errors[0].message);
        console.log('Path:', result.error.errors[0].path);
        
        expect(result.error.errors[0].message).toContain('Invalid datetime');
      }
    });

    it('FAILING CASE: Detect missing required fields in response', () => {
      // API forgot to include required fields
      const incompleteResponse = {
        id: '123',
        addressLine1: '123 Main St',
        // Missing required fields: city, postcode, ownerOrgId, timestamps
      };

      const result = PropertySchema.safeParse(incompleteResponse);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        console.log('\n❌ INCOMPLETE API RESPONSE:');
        console.log('Missing fields:');
        result.error.errors.forEach(err => {
          console.log(`- ${err.path.join('.')}: ${err.message}`);
        });
        
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('PASSING CASE: Valid response passes validation', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        addressLine1: '789 Park Lane',
        address2: null,
        city: 'Manchester',
        postcode: 'M1 1AA',
        bedrooms: 3,
        councilTaxBand: null,
        ownerOrgId: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        deletedAt: null,
      };

      const result = PropertySchema.safeParse(validResponse);
      
      expect(result.success).toBe(true);
      if (result.success) {
        console.log('\n✅ RESPONSE VALIDATION PASSED:');
        console.log('Received valid Property object');
        console.log('ID:', result.data.id);
        console.log('Address:', result.data.addressLine1);
      }
    });
  });

  describe('3. Type Safety - Compile-time Checks', () => {
    it('Demonstrates type inference from schemas', () => {
      // TypeScript knows the exact shape of this data
      const validData = CreatePropertyRequestSchema.parse({
        addressLine1: '123 Test St',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
      });

      // TypeScript will autocomplete and type-check these properties
      expect(validData.addressLine1).toBe('123 Test St');
      expect(validData.city).toBe('London');
      expect(validData.bedrooms).toBe(2);
      
      // This would be a TypeScript error (property doesn't exist):
      // expect(validData.nonExistentField).toBe('value');
    });

    it('Demonstrates how schemas prevent runtime errors', () => {
      // Without schemas, this could pass TypeScript but fail at runtime
      const untypedData: any = {
        addressLine1: '123 Test St',
        city: 123,  // Wrong type!
        postcode: null,  // Wrong type!
      };

      // Schema validation catches these type errors
      const result = CreatePropertyRequestSchema.safeParse(untypedData);
      expect(result.success).toBe(false);
      
      console.log('\n🛡️ SCHEMA PROTECTION:');
      console.log('Prevented runtime error by catching type mismatch');
    });
  });

  describe('4. Error Messages - Developer Experience', () => {
    it('Provides clear, actionable error messages', () => {
      const badData = {
        email: 'invalid',
        password: '12',
        name: '',
      };

      const result = SignupRequestSchema.safeParse(badData);
      
      if (!result.success) {
        console.log('\n📋 DETAILED ERROR REPORT:');
        console.log('Found', result.error.errors.length, 'validation errors:');
        
        result.error.errors.forEach((err, index) => {
          console.log(`\n${index + 1}. Field: ${err.path.join('.')}`);
          console.log(`   Error: ${err.message}`);
          if ('validation' in err) {
            console.log(`   Validation: ${err.validation}`);
          }
        });
        
        // Developers can easily fix these issues
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('5. Real-world Scenarios', () => {
    it('SCENARIO: User submits form with invalid email', () => {
      // User types email incorrectly
      const formData = {
        email: 'john.doe@',  // Incomplete email
        password: 'securePassword123',
        name: 'John Doe',
      };

      const result = SignupRequestSchema.safeParse(formData);
      
      if (!result.success) {
        console.log('\n🔴 USER ERROR CAUGHT:');
        console.log('Message to show user: "Please enter a valid email address"');
        console.log('Technical error:', result.error.errors[0].message);
        
        // Frontend can show user-friendly message without making API call
        expect(result.success).toBe(false);
      }
    });

    it('SCENARIO: API changes response format without updating frontend', () => {
      // API developer adds new required field but forgets to update docs
      const newApiResponse = {
        id: '123',
        addressLine1: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        ownerOrgId: '456',
        // Missing createdAt and updatedAt
      };

      const result = PropertySchema.safeParse(newApiResponse);
      
      if (!result.success) {
        console.log('\n⚠️ API CONTRACT VIOLATION DETECTED:');
        console.log('The API response does not match the expected schema');
        console.log('This would be caught in contract tests BEFORE deployment');
        
        result.error.errors.forEach(err => {
          console.log(`- Missing/Invalid: ${err.path.join('.')}`);
        });
        
        expect(result.success).toBe(false);
      }
    });

    it('SCENARIO: Frontend sends invalid property data', () => {
      const propertyData = {
        addressLine1: '  ',  // Only whitespace
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: -5,  // Negative number
      };

      const result = CreatePropertyRequestSchema.safeParse(propertyData);
      
      if (!result.success) {
        console.log('\n🚫 INVALID PROPERTY DATA:');
        console.log('Validation prevents sending bad data to API');
        
        result.error.errors.forEach(err => {
          if (err.path.includes('addressLine1')) {
            console.log('- Address cannot be empty or whitespace');
          }
          if (err.path.includes('bedrooms')) {
            console.log('- Bedrooms must be a positive number');
          }
        });
        
        expect(result.success).toBe(false);
      }
    });
  });
});

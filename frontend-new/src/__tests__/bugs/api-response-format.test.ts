import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enhancedPropertiesApi, ticketsApi } from '../../lib/api';
import * as apiModule from '../../lib/api';

// Mock the base API
vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual('../../lib/api');
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('API Response Format Fixes', () => {
  describe('enhancedPropertiesApi.list', () => {
    it('BEFORE FIX: should fail when backend returns paginated object', async () => {
      // This documents the BUG - backend returns { data: [], total, page, pageSize }
      const paginatedResponse = {
        data: [
          {
            id: '1',
            name: 'Test Property',
            address: { line1: '123 Main St', city: 'London', postcode: 'SW1A 1AA' },
            monthlyRent: 1500,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      vi.mocked(apiModule.api.get).mockResolvedValue({ data: paginatedResponse });

      const result = await enhancedPropertiesApi.list();

      // AFTER FIX: Should extract the data array
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(paginatedResponse.data[0]);
    });

    it('should handle array response (legacy format)', async () => {
      const arrayResponse = [
        {
          id: '1',
          name: 'Test Property',
          address: { line1: '123 Main St', city: 'London', postcode: 'SW1A 1AA' },
          monthlyRent: 1500,
        },
      ];

      vi.mocked(apiModule.api.get).mockResolvedValue({ data: arrayResponse });

      const result = await enhancedPropertiesApi.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(arrayResponse[0]);
    });

    it('should handle null/undefined gracefully', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue({ data: null });

      const result = await enhancedPropertiesApi.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should fallback to mock data on error', async () => {
      vi.mocked(apiModule.api.get).mockRejectedValue(new Error('Network error'));

      const result = await enhancedPropertiesApi.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('ticketsApi.list', () => {
    it('should extract items array from paginated response', async () => {
      // Backend returns { items: [], total, page, page_size, has_next }
      const paginatedResponse = {
        items: [
          {
            id: '1',
            title: 'Test Ticket',
            description: 'Test description',
            status: 'OPEN',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      };

      vi.mocked(apiModule.api.get).mockResolvedValue({ data: paginatedResponse });

      const result = await ticketsApi.list();

      // Should extract the items array
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(paginatedResponse.items[0]);
    });

    it('should handle array response', async () => {
      const arrayResponse = [
        {
          id: '1',
          title: 'Test Ticket',
          status: 'OPEN',
        },
      ];

      vi.mocked(apiModule.api.get).mockResolvedValue({ data: arrayResponse });

      const result = await ticketsApi.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });
});

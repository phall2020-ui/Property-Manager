import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateAppointmentTimes,
  isBusinessHours,
  formatDateRange,
  generateICalContent,
} from '../../lib/date-utils';

describe('date-utils', () => {
  describe('validateAppointmentTimes', () => {
    beforeEach(() => {
      // Mock current time to a fixed date for consistent tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    it('should reject past dates', () => {
      const pastDate = new Date('2024-01-14T10:00:00Z');
      const result = validateAppointmentTimes(pastDate);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should accept future dates', () => {
      const futureDate = new Date('2024-01-16T10:00:00Z');
      const result = validateAppointmentTimes(futureDate);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject end time before start time', () => {
      const start = new Date('2024-01-16T10:00:00Z');
      const end = new Date('2024-01-16T09:00:00Z');
      const result = validateAppointmentTimes(start, end);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('after start');
    });

    it('should reject appointments shorter than 30 minutes', () => {
      const start = new Date('2024-01-16T10:00:00Z');
      const end = new Date('2024-01-16T10:15:00Z');
      const result = validateAppointmentTimes(start, end);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('30 minutes');
    });

    it('should accept valid time windows', () => {
      const start = new Date('2024-01-16T10:00:00Z');
      const end = new Date('2024-01-16T11:00:00Z');
      const result = validateAppointmentTimes(start, end);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('isBusinessHours', () => {
    it('should return true for weekday business hours', () => {
      const date = new Date('2024-01-15T14:00:00Z'); // Monday 2 PM
      expect(isBusinessHours(date)).toBe(true);
    });

    it('should return false for weekends', () => {
      const saturday = new Date('2024-01-13T14:00:00Z');
      const sunday = new Date('2024-01-14T14:00:00Z');
      
      expect(isBusinessHours(saturday)).toBe(false);
      expect(isBusinessHours(sunday)).toBe(false);
    });

    it('should return false for early morning', () => {
      const date = new Date('2024-01-15T07:00:00Z'); // Monday 7 AM
      expect(isBusinessHours(date)).toBe(false);
    });

    it('should return false for evening', () => {
      const date = new Date('2024-01-15T19:00:00Z'); // Monday 7 PM
      expect(isBusinessHours(date)).toBe(false);
    });
  });

  describe('formatDateRange', () => {
    it('should format a single date', () => {
      const date = '2024-01-15T14:30:00Z';
      const result = formatDateRange(date);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format a date range', () => {
      const start = '2024-01-15T14:30:00Z';
      const end = '2024-01-15T16:30:00Z';
      const result = formatDateRange(start, end);
      
      expect(result).toContain('-');
      expect(typeof result).toBe('string');
    });
  });

  describe('generateICalContent', () => {
    it('should generate valid iCal content', () => {
      const title = 'Test Appointment';
      const description = 'Test description';
      const start = new Date('2024-01-15T14:00:00Z');
      const end = new Date('2024-01-15T15:00:00Z');
      
      const result = generateICalContent(title, description, start, end);
      
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toContain('BEGIN:VEVENT');
      expect(result).toContain('END:VEVENT');
      expect(result).toContain('SUMMARY:Test Appointment');
      expect(result).toContain('DESCRIPTION:Test description');
    });

    it('should include location if provided', () => {
      const title = 'Test';
      const description = 'Test';
      const start = new Date('2024-01-15T14:00:00Z');
      const end = new Date('2024-01-15T15:00:00Z');
      const location = '123 Test St';
      
      const result = generateICalContent(title, description, start, end, location);
      
      expect(result).toContain('LOCATION:123 Test St');
    });
  });
});

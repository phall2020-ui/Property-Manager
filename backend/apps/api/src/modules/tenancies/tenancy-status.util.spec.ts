import {
  computeTenancyStatus,
  validateTenancyDates,
  canRenewTenancy,
  TenancyStatus,
} from './tenancy-status.util';

describe('Tenancy Status Utilities', () => {
  describe('computeTenancyStatus', () => {
    it('should return TERMINATED when terminatedAt is set', () => {
      const result = computeTenancyStatus({
        start: new Date('2025-01-01'),
        end: new Date('2026-01-01'),
        terminatedAt: new Date('2025-06-01'),
      });

      expect(result).toBe(TenancyStatus.TERMINATED);
    });

    it('should return SCHEDULED when start date is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const result = computeTenancyStatus({
        start: futureDate,
        end: null,
      });

      expect(result).toBe(TenancyStatus.SCHEDULED);
    });

    it('should return ACTIVE when tenancy has no end date and started', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      const result = computeTenancyStatus({
        start: pastDate,
        end: null,
      });

      expect(result).toBe(TenancyStatus.ACTIVE);
    });

    it('should return ENDED when end date has passed', () => {
      const result = computeTenancyStatus({
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      });

      expect(result).toBe(TenancyStatus.ENDED);
    });

    it('should return EXPIRING when within 60 days of end date', () => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30); // 30 days from now

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 300); // Started 300 days ago

      const result = computeTenancyStatus({
        start: startDate,
        end: endDate,
      });

      expect(result).toBe(TenancyStatus.EXPIRING);
    });

    it('should return ACTIVE when more than 60 days from end date', () => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 90); // 90 days from now

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30); // Started 30 days ago

      const result = computeTenancyStatus({
        start: startDate,
        end: endDate,
      });

      expect(result).toBe(TenancyStatus.ACTIVE);
    });

    it('should use custom expiring window days', () => {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 25); // 25 days from now

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      // With 30-day window
      const result = computeTenancyStatus(
        {
          start: startDate,
          end: endDate,
        },
        30,
      );

      expect(result).toBe(TenancyStatus.EXPIRING);
    });

    it('should return EXPIRING when end date equals today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);

      const result = computeTenancyStatus({
        start: startDate,
        end: today,
      });

      // On the end date, within 60 days (0 days), so EXPIRING
      expect(result).toBe(TenancyStatus.EXPIRING);
    });
  });

  describe('validateTenancyDates', () => {
    it('should return valid=true for correct date range', () => {
      const result = validateTenancyDates(
        new Date('2025-01-01'),
        new Date('2026-01-01'),
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid=true when end date is null', () => {
      const result = validateTenancyDates(new Date('2025-01-01'), null);

      expect(result.valid).toBe(true);
    });

    it('should return valid=false when start date is after end date', () => {
      const result = validateTenancyDates(
        new Date('2026-01-01'),
        new Date('2025-01-01'),
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });

    it('should return valid=false when start date equals end date', () => {
      const date = new Date('2025-01-01');
      const result = validateTenancyDates(date, date);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });
  });

  describe('canRenewTenancy', () => {
    it('should allow renewal of ACTIVE tenancy with end date', () => {
      const result = canRenewTenancy(TenancyStatus.ACTIVE, new Date('2026-01-01'));

      expect(result.can).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow renewal of EXPIRING tenancy', () => {
      const result = canRenewTenancy(TenancyStatus.EXPIRING, new Date('2026-01-01'));

      expect(result.can).toBe(true);
    });

    it('should allow renewal of ENDED tenancy', () => {
      const result = canRenewTenancy(TenancyStatus.ENDED, new Date('2025-01-01'));

      expect(result.can).toBe(true);
    });

    it('should not allow renewal of TERMINATED tenancy', () => {
      const result = canRenewTenancy(TenancyStatus.TERMINATED, new Date('2026-01-01'));

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Cannot renew a terminated tenancy');
    });

    it('should not allow renewal without end date', () => {
      const result = canRenewTenancy(TenancyStatus.ACTIVE, null);

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Cannot renew tenancy without an end date');
    });

    it('should not allow renewal of SCHEDULED tenancy', () => {
      const result = canRenewTenancy(TenancyStatus.SCHEDULED, new Date('2026-01-01'));

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Tenancy is not in a renewable state');
    });

    it('should not allow renewal of PENDING tenancy', () => {
      const result = canRenewTenancy(TenancyStatus.PENDING, new Date('2026-01-01'));

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Tenancy is not in a renewable state');
    });
  });
});

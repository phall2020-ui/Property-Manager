/**
 * Tenancy status computation utilities
 * Pure functions for determining tenancy status based on dates
 */

export enum TenancyStatus {
  SCHEDULED = 'SCHEDULED',   // startDate > today
  ACTIVE = 'ACTIVE',         // today between startDate and endDate
  EXPIRING = 'EXPIRING',     // within configurable window (e.g., 60 days to end)
  TERMINATED = 'TERMINATED', // terminated early
  ENDED = 'ENDED',           // natural end (endDate < today, not renewed)
  PENDING = 'PENDING',       // legacy status
}

interface TenancyStatusInput {
  start: Date;
  end?: Date | null;
  terminatedAt?: Date | null;
}

/**
 * Compute tenancy status based on dates
 * @param tenancy Tenancy dates
 * @param expiringWindowDays Days before end date to mark as EXPIRING (default: 60)
 * @returns TenancyStatus
 */
export function computeTenancyStatus(
  tenancy: TenancyStatusInput,
  expiringWindowDays = 60,
): TenancyStatus {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // If terminated, always TERMINATED
  if (tenancy.terminatedAt) {
    return TenancyStatus.TERMINATED;
  }

  const startDate = new Date(tenancy.start);
  const startDay = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );

  // If start date is in the future, SCHEDULED
  if (startDay > today) {
    return TenancyStatus.SCHEDULED;
  }

  // If no end date, must be ACTIVE (ongoing)
  if (!tenancy.end) {
    return TenancyStatus.ACTIVE;
  }

  const endDate = new Date(tenancy.end);
  const endDay = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  // If end date has passed, ENDED
  if (endDay < today) {
    return TenancyStatus.ENDED;
  }

  // Check if within expiring window
  const daysUntilEnd = Math.floor(
    (endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilEnd <= expiringWindowDays) {
    return TenancyStatus.EXPIRING;
  }

  // Otherwise, ACTIVE
  return TenancyStatus.ACTIVE;
}

/**
 * Validate date ranges for tenancy
 */
export function validateTenancyDates(
  startDate: Date,
  endDate?: Date | null,
): { valid: boolean; error?: string } {
  if (endDate && startDate >= endDate) {
    return {
      valid: false,
      error: 'Start date must be before end date',
    };
  }
  return { valid: true };
}

/**
 * Check if a tenancy can be renewed
 */
export function canRenewTenancy(
  status: string,
  endDate?: Date | null,
): { can: boolean; reason?: string } {
  if (status === TenancyStatus.TERMINATED) {
    return {
      can: false,
      reason: 'Cannot renew a terminated tenancy',
    };
  }

  if (status === TenancyStatus.ENDED) {
    // Can still renew an ended tenancy if not too far past end date
    return { can: true };
  }

  if (!endDate) {
    return {
      can: false,
      reason: 'Cannot renew tenancy without an end date',
    };
  }

  // Can renew if ACTIVE or EXPIRING
  if (
    status === TenancyStatus.ACTIVE ||
    status === TenancyStatus.EXPIRING ||
    status === TenancyStatus.ENDED
  ) {
    return { can: true };
  }

  return {
    can: false,
    reason: 'Tenancy is not in a renewable state',
  };
}

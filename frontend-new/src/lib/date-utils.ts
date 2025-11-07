/**
 * Format a date to ISO 8601 string in Europe/London timezone
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO 8601 string to Date object
 */
export function parseAPIDate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Format date for display in Europe/London timezone
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  });
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date | string, end?: Date | string): string {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = end ? (typeof end === 'string' ? new Date(end) : end) : null;

  const startStr = startDate.toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  });

  if (!endDate) {
    return startStr;
  }

  const endStr = endDate.toLocaleString('en-GB', {
    timeStyle: 'short',
    timeZone: 'Europe/London',
  });

  return `${startStr} - ${endStr}`;
}

/**
 * Validate appointment times
 */
export function validateAppointmentTimes(
  start: Date,
  end?: Date
): { valid: boolean; error?: string } {
  const now = new Date();
  const minBuffer = 5 * 60 * 1000; // 5 minutes
  
  // Check if start is in the future
  if (start.getTime() <= now.getTime() - minBuffer) {
    return { valid: false, error: 'Appointment must be scheduled in the future' };
  }

  // If end is provided, check if it's after start
  if (end) {
    const duration = end.getTime() - start.getTime();
    const minDuration = 30 * 60 * 1000; // 30 minutes
    
    if (duration <= 0) {
      return { valid: false, error: 'End time must be after start time' };
    }
    
    if (duration < minDuration) {
      return { valid: false, error: 'Appointment must be at least 30 minutes long' };
    }
  }

  return { valid: true };
}

/**
 * Check if date is during business hours (9 AM - 6 PM)
 */
export function isBusinessHours(date: Date): boolean {
  const hours = date.getHours();
  const day = date.getDay();
  
  // Weekend check
  if (day === 0 || day === 6) {
    return false;
  }
  
  // Business hours: 9 AM - 6 PM
  return hours >= 9 && hours < 18;
}

/**
 * Get the timezone abbreviation for Europe/London
 */
export function getTimezoneAbbr(date: Date): string {
  const tzString = date.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'short',
  });
  
  const match = tzString.match(/\b([A-Z]{3,4})\b/);
  return match ? match[1] : 'GMT';
}

/**
 * Generate iCal content for an appointment
 */
export function generateICalContent(
  title: string,
  description: string,
  start: Date,
  end: Date,
  location?: string
): string {
  const formatICalDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const now = new Date();
  const uid = `${now.getTime()}@property-manager.local`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Property Manager//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(start)}`,
    `DTEND:${formatICalDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

/**
 * Download iCal file
 */
export function downloadICalFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function annualisedRentGBP(monthlyRent?: number): number {
  return monthlyRent ? monthlyRent * 12 : 0;
}

export function grossYieldPct(monthlyRent?: number, estimatedValue?: number | null): number | null {
  if (!monthlyRent || !estimatedValue || estimatedValue <= 0) return null;
  return (annualisedRentGBP(monthlyRent) / estimatedValue) * 100;
}

export function fmtGBP(v?: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(v);
}

export function pct(v?: number | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(0)}%`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

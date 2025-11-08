import { useState, useMemo, useEffect } from 'react';
import type { Property } from '../../lib/types';
import { grossYieldPct } from '../../lib/calculations';

interface PropertyFiltersProps {
  all: Property[];
  onChange: (filtered: Property[]) => void;
}

export default function PropertyFilters({ all, onChange }: PropertyFiltersProps) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'All' | 'Occupied' | 'Vacant' | 'Let Agreed'>('All');
  const [minYield, setMinYield] = useState<number>(0);

  const filtered = useMemo(() => {
    // Ensure all is an array
    if (!Array.isArray(all)) {
      return [];
    }
    return all.filter((p) => {
      // Handle both address formats: { address: { line1, postcode } } or { addressLine1, postcode }
      const addressLine1 = p.address?.line1 || (p as any).addressLine1 || (p as any).address1 || '';
      const postcode = p.address?.postcode || (p as any).postcode || '';
      const searchText = `${p.name || ''} ${addressLine1} ${postcode}`.toLowerCase();
      const matchQ = q ? searchText.includes(q.toLowerCase()) : true;
      const matchStatus = status === 'All' ? true : p.status === status;
      const y = grossYieldPct(p.monthlyRent, p.estimatedValue) ?? 0;
      const matchYield = y >= minYield || !minYield;
      return matchQ && matchStatus && matchYield;
    });
  }, [all, q, status, minYield]);

  useEffect(() => {
    onChange(filtered);
  }, [filtered, onChange]);

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search address or name"
        className="rounded-lg border border-brand-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as typeof status)}
        className="rounded-lg border border-brand-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
      >
        <option>All</option>
        <option>Occupied</option>
        <option>Vacant</option>
        <option>Let Agreed</option>
      </select>
      <input
        type="number"
        min={0}
        step={0.5}
        value={minYield}
        onChange={(e) => setMinYield(Number(e.target.value))}
        className="rounded-lg border border-brand-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
        placeholder="Min Gross Yield %"
      />
    </div>
  );
}

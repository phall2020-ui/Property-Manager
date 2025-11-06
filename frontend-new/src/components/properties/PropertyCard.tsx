import { Link } from 'react-router-dom';
import type { Property } from '../../lib/types';
import { fmtGBP, grossYieldPct } from '../../lib/calculations';
import { MapPin } from 'lucide-react';

interface PropertyCardProps {
  p: Property;
}

export default function PropertyCard({ p }: PropertyCardProps) {
  const yieldPct = grossYieldPct(p.monthlyRent, p.estimatedValue);
  
  const statusColors = {
    Occupied: 'bg-brand-teal/50 text-green-900',
    Vacant: 'bg-brand-peach/50 text-red-900',
    'Let Agreed': 'bg-brand-blue/50 text-blue-900',
  };

  return (
    <Link
      to={`/properties/${p.id}`}
      className="block rounded-xl bg-white p-6 shadow-card hover:shadow-md transition-all hover:scale-105"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-brand-text">{p.name || p.address.line1}</h3>
          <div className="flex items-center text-sm text-brand-subtle mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{p.address.line1}, {p.address.postcode}</span>
          </div>
        </div>
        {p.status && (
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusColors[p.status]}`}>
            {p.status}
          </span>
        )}
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div>
          <div className="text-xs text-brand-subtle">Monthly Rent</div>
          <div className="font-semibold text-brand-text mt-1">{fmtGBP(p.monthlyRent)}</div>
        </div>
        <div>
          <div className="text-xs text-brand-subtle">Gross Yield</div>
          <div className="font-semibold text-brand-text mt-1">
            {yieldPct == null ? '—' : `${yieldPct.toFixed(1)}%`}
          </div>
        </div>
        <div>
          <div className="text-xs text-brand-subtle">Occupancy</div>
          <div className="font-semibold text-brand-text mt-1">
            {p.occupancyRate == null ? '—' : `${Math.round(p.occupancyRate * 100)}%`}
          </div>
        </div>
      </div>
    </Link>
  );
}

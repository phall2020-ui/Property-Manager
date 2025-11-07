interface KPIStatCardProps {
  label: string;
  count: number;
  color: 'green' | 'amber' | 'red' | 'gray';
  onClick?: () => void;
}

const colorConfig = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    count: 'text-green-600',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    count: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    count: 'text-red-600',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-900',
    count: 'text-gray-600',
  },
};

export default function KPIStatCard({ label, count, color, onClick }: KPIStatCardProps) {
  const config = colorConfig[color];
  const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-lg p-4 ${interactive}`}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.text}`}>{label}</span>
        <span className={`text-3xl font-bold ${config.count} mt-2`}>{count}</span>
      </div>
    </div>
  );
}

interface ComplianceStatusChipProps {
  status: 'OK' | 'DUE_SOON' | 'OVERDUE' | 'MISSING';
}

const statusConfig = {
  OK: {
    label: 'OK',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    dotColor: 'bg-green-500',
  },
  DUE_SOON: {
    label: 'Due soon',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  OVERDUE: {
    label: 'Overdue',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
  },
  MISSING: {
    label: 'Missing',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    dotColor: 'bg-gray-500',
  },
};

export default function ComplianceStatusChip({ status }: ComplianceStatusChipProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
      {config.label}
    </span>
  );
}

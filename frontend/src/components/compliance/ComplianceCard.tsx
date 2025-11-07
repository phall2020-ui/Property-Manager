import ComplianceStatusChip from './ComplianceStatusChip';

interface ComplianceCardProps {
  type: string;
  status: 'OK' | 'DUE_SOON' | 'OVERDUE' | 'MISSING';
  dueDate?: string | null;
  hasEvidence: boolean;
  onUpload?: () => void;
  onMarkDone?: () => void;
}

const typeIcons: Record<string, string> = {
  'Gas Safety': '🔥',
  'EICR': '⚡',
  'EPC': '🍃',
  'Boiler Service': '💧',
  'Smoke Alarms': '🔔',
  'CO Alarms': '⚠️',
  'HMO Licence': '📋',
  'Deposit Protection': '💷',
  'How to Rent': '📖',
  'Right to Rent': '✓',
  'Legionella': '💧',
};

export default function ComplianceCard({
  type,
  status,
  dueDate,
  hasEvidence,
  onUpload,
  onMarkDone,
}: ComplianceCardProps) {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-GB');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcons[type] || '📄'}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{type}</h3>
            {dueDate && (
              <p className="text-sm text-gray-600 mt-1">
                Due: {formatDate(dueDate)}
              </p>
            )}
          </div>
        </div>
        <ComplianceStatusChip status={status} />
      </div>

      <div className="mb-4">
        {hasEvidence ? (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <span>✓</span> Evidence uploaded
          </p>
        ) : (
          <p className="text-sm text-gray-500">No evidence uploaded</p>
        )}
      </div>

      <div className="flex gap-2">
        {onUpload && (
          <button
            onClick={onUpload}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload
          </button>
        )}
        {onMarkDone && (
          <button
            onClick={onMarkDone}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Mark Done
          </button>
        )}
      </div>
    </div>
  );
}

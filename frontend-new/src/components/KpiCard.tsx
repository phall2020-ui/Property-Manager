interface KpiCardProps {
  title: string;
  value: string | number;
  tone?: 'blue' | 'teal' | 'peach';
  icon?: React.ReactNode;
}

export default function KpiCard({ title, value, tone = 'blue', icon }: KpiCardProps) {
  const bgColors = {
    blue: 'bg-brand-blue/20',
    teal: 'bg-brand-teal/20',
    peach: 'bg-brand-peach/20',
  };

  return (
    <div className={`rounded-xl ${bgColors[tone]} p-6 shadow-card transition-transform hover:scale-105`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-brand-subtle">{title}</p>
          <p className="mt-2 text-3xl font-bold text-brand-text">{value}</p>
        </div>
        {icon && <div className="text-brand-subtle opacity-50">{icon}</div>}
      </div>
    </div>
  );
}

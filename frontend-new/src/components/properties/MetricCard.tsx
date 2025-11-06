interface MetricCardProps {
  label: string;
  value: React.ReactNode;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-card hover:shadow-md transition-shadow">
      <div className="text-sm text-brand-subtle">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-brand-text">{value}</div>
    </div>
  );
}

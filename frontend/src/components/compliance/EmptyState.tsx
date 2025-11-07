interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
}

export default function EmptyState({ 
  title = "All items are compliant", 
  message = "Great job — all certificates are valid.",
  icon = "🎉"
}: EmptyStateProps) {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-12 text-center">
      <div className="max-w-md mx-auto">
        <span className="text-6xl mb-4 block animate-bounce">{icon}</span>
        <h3 className="text-xl font-semibold text-green-900 mb-2">{title}</h3>
        <p className="text-green-700">{message}</p>
      </div>
    </div>
  );
}

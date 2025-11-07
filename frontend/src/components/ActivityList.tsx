import { Activity } from 'lucide-react';
import type { ActivityItem } from '../lib/types';

interface ActivityListProps {
  items: ActivityItem[];
}

export default function ActivityList({ items }: ActivityListProps) {
  return (
    <div className="rounded-xl bg-brand-panel p-6 shadow-card">
      <div className="flex items-center mb-4">
        <Activity className="h-5 w-5 text-brand-subtle mr-2" />
        <h3 className="text-lg font-medium text-brand-text">Recent Activity</h3>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-brand-subtle">No recent activity</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="h-2 w-2 rounded-full bg-brand-blue mt-2 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-brand-text">{item.text}</p>
                {item.date && (
                  <p className="text-xs text-brand-subtle mt-1">
                    {new Date(item.date).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

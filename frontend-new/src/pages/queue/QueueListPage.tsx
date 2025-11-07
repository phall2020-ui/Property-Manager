import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import TableSkeleton from '../../components/skeletons/TableSkeleton';
import { queueApi } from '../../lib/api';

interface QueueItem {
  id: string;
  queue: string;
  name: string;
  status: string;
  priority: number;
  createdAt: string;
  processedAt?: string;
  data?: Record<string, unknown>;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export default function QueueListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  const { data: queueItems, isLoading, error } = useQuery<QueueItem[]>({
    queryKey: ['queue'],
    queryFn: () => queueApi.list(),
  });

  const { data: stats } = useQuery<QueueStats>({
    queryKey: ['queue-stats'],
    queryFn: () => queueApi.getStats(),
    refetchInterval: 5000, // Refresh stats every 5 seconds
  });

  const filteredItems = useMemo(() => {
    if (!queueItems) return [];
    
    return queueItems.filter((item) => {
      const searchText = `${item.name} ${item.queue} ${item.id}`.toLowerCase();
      const matchesSearch = searchQuery ? searchText.includes(searchQuery.toLowerCase()) : true;
      const matchesQueue = queueFilter === 'All' ? true : item.queue === queueFilter;
      const matchesStatus = statusFilter === 'All' ? true : item.status === statusFilter;
      
      return matchesSearch && matchesQueue && matchesStatus;
    });
  }, [queueItems, searchQuery, queueFilter, statusFilter]);

  const uniqueQueues = useMemo(() => {
    if (!queueItems) return [];
    return Array.from(new Set(queueItems.map(item => item.queue)));
  }, [queueItems]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Queue Monitor</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white shadow rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Queue Monitor</h2>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading queue: {(error as Error).message}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'delayed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 10) return 'text-red-600 font-bold';
    if (priority >= 5) return 'text-orange-600 font-semibold';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Queue Monitor</h2>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Waiting</div>
            <div className="mt-1 text-3xl font-semibold text-yellow-600">{stats.waiting}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Active</div>
            <div className="mt-1 text-3xl font-semibold text-blue-600">{stats.active}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Completed</div>
            <div className="mt-1 text-3xl font-semibold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Failed</div>
            <div className="mt-1 text-3xl font-semibold text-red-600">{stats.failed}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-500">Delayed</div>
            <div className="mt-1 text-3xl font-semibold text-orange-600">{stats.delayed}</div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search queue items..."
          className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <select
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option>All</option>
          {uniqueQueues.map((queue) => (
            <option key={queue}>{queue}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option>All</option>
          <option>waiting</option>
          <option>active</option>
          <option>completed</option>
          <option>failed</option>
          <option>delayed</option>
        </select>
      </div>

      {filteredItems.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Queue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{item.queue}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{item.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.processedAt ? new Date(item.processedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-600">No queue items found matching your filters.</p>
        </div>
      )}
    </div>
  );
}

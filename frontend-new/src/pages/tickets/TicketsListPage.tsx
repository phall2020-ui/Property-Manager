import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../contexts/AuthContext';
import TableSkeleton from '../../components/skeletons/TableSkeleton';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  property?: {
    id: string;
    address1: string;
  };
}

interface TicketsResponse {
  items: Ticket[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

export default function TicketsListPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  
  const { data: ticketsData, isLoading, error } = useQuery<TicketsResponse>({
    queryKey: ['tickets'],
    queryFn: () => ticketsApi.list(),
  });

  // Extract tickets array from paginated response
  const tickets = ticketsData?.items || [];

  if (!user || !user.organisations || user.organisations.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>No organisation found for this user. Please contact support.</p>
        </div>
      </div>
    );
  }

  const primaryOrg = user.organisations[0];
  const isTenant = primaryOrg?.role === 'TENANT';

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter((ticket) => {
      const searchText = `${ticket.title} ${ticket.description} ${ticket.property?.address1 || ''}`.toLowerCase();
      const matchesSearch = searchQuery ? searchText.includes(searchQuery.toLowerCase()) : true;
      const matchesStatus = statusFilter === 'All' ? true : ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'All' ? true : ticket.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Maintenance Tickets</h2>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading tickets: {(error as Error).message}
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'ASSIGNED':
        return 'bg-purple-100 text-purple-800';
      case 'QUOTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-indigo-100 text-indigo-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Maintenance Tickets</h2>
        {isTenant && (
          <Link
            to="/tickets/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Report Issue
          </Link>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tickets..."
          className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option>All</option>
          <option>OPEN</option>
          <option>ASSIGNED</option>
          <option>QUOTED</option>
          <option>APPROVED</option>
          <option>IN_PROGRESS</option>
          <option>COMPLETED</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option>All</option>
          <option>URGENT</option>
          <option>HIGH</option>
          <option>MEDIUM</option>
          <option>LOW</option>
        </select>
      </div>

      {filteredTickets.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      {ticket.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                      {ticket.description}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ticket.property ? (
                      <Link
                        to={`/properties/${ticket.property.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {ticket.property.address1}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-600">
            {isTenant
              ? 'No tickets yet. Report an issue above.'
              : 'No maintenance tickets to display.'}
          </p>
        </div>
      )}
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import TableSkeleton from '../../components/skeletons/TableSkeleton';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    address1: string;
  };
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: ticket, isLoading, error } = useQuery<Ticket>({
    queryKey: ['tickets', id],
    queryFn: () => ticketsApi.getById(id!),
    enabled: !!id,
  });

  const primaryOrg = user?.organisations?.[0];
  const userRole = primaryOrg?.role || 'TENANT';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Loading Ticket...</h2>
        </div>
        <TableSkeleton rows={5} columns={2} />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading ticket: {error ? (error as Error).message : 'Ticket not found'}
        </div>
        <Link to="/tickets" className="text-blue-600 hover:text-blue-900">
          ← Back to Tickets
        </Link>
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
      case 'SCHEDULED':
        return 'bg-cyan-100 text-cyan-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/tickets" className="text-blue-600 hover:text-blue-900 text-sm mb-2 inline-block">
            ← Back to Tickets
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">{ticket.title}</h2>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority}
          </span>
          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
            {ticket.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Ticket Details Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900">{ticket.description}</dd>
          </div>
          {ticket.category && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900">{ticket.category}</dd>
            </div>
          )}
          {ticket.property && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Property</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <Link
                  to={`/properties/${ticket.property.id}`}
                  className="text-blue-600 hover:text-blue-900"
                >
                  {ticket.property.address1}
                </Link>
              </dd>
            </div>
          )}
          {ticket.createdBy && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Reported By</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {ticket.createdBy.name} ({ticket.createdBy.email})
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(ticket.createdAt).toLocaleString('en-GB', { 
                dateStyle: 'medium', 
                timeStyle: 'short',
                timeZone: 'Europe/London'
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(ticket.updatedAt).toLocaleString('en-GB', { 
                dateStyle: 'medium', 
                timeStyle: 'short',
                timeZone: 'Europe/London'
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Appointments Section - Placeholder for now */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
        <p className="text-sm text-gray-500">Appointment scheduling will be available here.</p>
        {/* TODO: Add AppointmentProposeForm, AppointmentConfirmBanner, AppointmentCard */}
      </div>

      {/* Attachments Section - Placeholder for now */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
        <p className="text-sm text-gray-500">File attachments will be available here.</p>
        {/* TODO: Add AttachmentUploader, AttachmentList */}
      </div>
    </div>
  );
}

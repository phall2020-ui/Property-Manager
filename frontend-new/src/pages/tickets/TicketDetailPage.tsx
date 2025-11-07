import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import TableSkeleton from '../../components/skeletons/TableSkeleton';
import AppointmentProposeForm from '../../components/appointments/AppointmentProposeForm';
import AppointmentConfirmBanner from '../../components/appointments/AppointmentConfirmBanner';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import MiniCalendar from '../../components/appointments/MiniCalendar';
import AttachmentUploader from '../../components/attachments/AttachmentUploader';
import AttachmentList from '../../components/attachments/AttachmentList';
import { Appointment } from '../../types/appointments';
import { Attachment } from '../../types/attachments';

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

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', id],
    queryFn: () => ticketsApi.getAppointments(id!),
    enabled: !!id,
  });

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ['attachments', id],
    queryFn: () => ticketsApi.getAttachments(id!),
    enabled: !!id,
  });

  const primaryOrg = user?.organisations?.[0];
  const userRole = primaryOrg?.role || 'TENANT';
  const isContractor = userRole === 'CONTRACTOR';
  const isLandlordOrTenant = userRole === 'LANDLORD' || userRole === 'TENANT';

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

      {/* Appointments Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
        
        {/* Show confirmation banner if there's a proposed appointment */}
        {isLandlordOrTenant && appointments.length > 0 && (
          <div className="mb-4">
            {appointments
              .filter(apt => apt.status === 'PROPOSED')
              .map(apt => (
                <AppointmentConfirmBanner
                  key={apt.id}
                  appointment={apt}
                  ticketId={id!}
                />
              ))}
          </div>
        )}

        {/* Show all appointments */}
        {appointments.length > 0 && (
          <div className="space-y-4 mb-6">
            {appointments.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                ticketTitle={ticket?.title || ''}
                ticketDescription={ticket?.description || ''}
                propertyAddress={ticket?.property?.address1}
              />
            ))}
          </div>
        )}

        {/* Show calendar for confirmed appointments */}
        {appointments.some(apt => apt.status === 'CONFIRMED') && (
          <div className="mb-6">
            <MiniCalendar appointments={appointments} />
          </div>
        )}

        {/* Contractor can propose appointments */}
        {isContractor && ticket?.status === 'APPROVED' && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Propose New Appointment</h4>
            <AppointmentProposeForm ticketId={id!} />
          </div>
        )}

        {/* Empty state */}
        {appointments.length === 0 && (
          <div className="text-center py-6">
            {isContractor && ticket?.status === 'APPROVED' ? (
              <p className="text-sm text-gray-600 mb-4">
                No appointments scheduled yet. Propose a time to visit the property.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                No appointments scheduled yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Attachments Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
        
        {/* Upload section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Upload Files</h4>
          <AttachmentUploader ticketId={id!} />
        </div>

        {/* Attachments list */}
        {attachments.length > 0 ? (
          <AttachmentList 
            ticketId={id!} 
            attachments={attachments}
            canDelete={true}
          />
        ) : (
          <div className="text-center py-6 text-sm text-gray-600">
            No attachments yet. Upload images or documents to share with the team.
          </div>
        )}
      </div>
    </div>
  );
}

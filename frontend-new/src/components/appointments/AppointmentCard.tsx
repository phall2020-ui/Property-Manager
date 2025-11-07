import { Appointment } from '../../types/appointments';
import { formatDateRange, downloadICalFile, generateICalContent } from '../../lib/date-utils';
import { Calendar, CheckCircle, Clock, Download, User } from 'lucide-react';

interface AppointmentCardProps {
  appointment: Appointment;
  ticketTitle: string;
  ticketDescription: string;
  propertyAddress?: string;
}

export default function AppointmentCard({ 
  appointment, 
  ticketTitle,
  ticketDescription,
  propertyAddress 
}: AppointmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROPOSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownloadICal = () => {
    if (!appointment.endAt) {
      // If no end time, default to 1 hour after start
      const start = new Date(appointment.startAt);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const content = generateICalContent(
        `Maintenance: ${ticketTitle}`,
        ticketDescription + (appointment.notes ? `\n\nNotes: ${appointment.notes}` : ''),
        start,
        end,
        propertyAddress
      );
      downloadICalFile(content, `appointment-${appointment.id}.ics`);
    } else {
      const content = generateICalContent(
        `Maintenance: ${ticketTitle}`,
        ticketDescription + (appointment.notes ? `\n\nNotes: ${appointment.notes}` : ''),
        new Date(appointment.startAt),
        new Date(appointment.endAt),
        propertyAddress
      );
      downloadICalFile(content, `appointment-${appointment.id}.ics`);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-900">
            {formatDateRange(appointment.startAt, appointment.endAt)}
          </span>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <User className="w-4 h-4" />
          <span>
            Proposed by {appointment.proposedByRole}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            Created {new Date(appointment.createdAt).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Europe/London',
            })}
          </span>
        </div>

        {appointment.status === 'CONFIRMED' && appointment.confirmedAt && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>
              Confirmed {new Date(appointment.confirmedAt).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Europe/London',
              })}
            </span>
          </div>
        )}

        {appointment.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-gray-700">{appointment.notes}</p>
          </div>
        )}
      </div>

      {appointment.status === 'CONFIRMED' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleDownloadICal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium"
          >
            <Download className="w-4 h-4" />
            Download iCal
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Add this appointment to your calendar (Europe/London timezone)
          </p>
        </div>
      )}
    </div>
  );
}

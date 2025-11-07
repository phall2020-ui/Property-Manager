import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../../lib/api';
import { formatDateRange } from '../../lib/date-utils';
import { Appointment } from '../../types/appointments';
import { Calendar, CheckCircle } from 'lucide-react';

interface AppointmentConfirmBannerProps {
  appointment: Appointment;
  ticketId: string;
}

export default function AppointmentConfirmBanner({ appointment, ticketId }: AppointmentConfirmBannerProps) {
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: () => ticketsApi.confirmAppointment(appointment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
    },
  });

  if (appointment.status !== 'PROPOSED') {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            Appointment Proposed
          </h4>
          <p className="text-sm text-blue-800 mb-2">
            {appointment.proposedByRole === 'CONTRACTOR' ? 'Contractor' : 'Team'} has proposed an appointment:
          </p>
          <div className="bg-white rounded-md p-3 mb-3">
            <p className="text-sm font-medium text-gray-900">
              {formatDateRange(appointment.startAt, appointment.endAt)}
            </p>
            {appointment.notes && (
              <p className="text-sm text-gray-600 mt-1">{appointment.notes}</p>
            )}
          </div>
          
          {confirmMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-3" role="alert">
              Failed to confirm appointment. Please try again.
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              {confirmMutation.isPending ? 'Confirming...' : 'Confirm Appointment'}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-white text-gray-700 text-sm border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
            >
              Request Change
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

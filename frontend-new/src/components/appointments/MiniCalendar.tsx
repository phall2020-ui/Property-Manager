import { Appointment } from '../../types/appointments';
import { formatDateRange } from '../../lib/date-utils';
import { Calendar, Clock } from 'lucide-react';

interface MiniCalendarProps {
  appointments: Appointment[];
}

export default function MiniCalendar({ appointments }: MiniCalendarProps) {
  const now = new Date();
  const confirmedAppointments = appointments.filter(apt => apt.status === 'CONFIRMED');
  const upcomingAppointments = confirmedAppointments.filter(
    apt => new Date(apt.startAt) >= now
  );

  if (upcomingAppointments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">No upcoming appointments</p>
      </div>
    );
  }

  // Sort by start date
  const sortedAppointments = [...upcomingAppointments].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
        <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Upcoming Appointments
        </h4>
      </div>
      
      <div className="divide-y divide-gray-200">
        {sortedAppointments.map((appointment) => (
          <div key={appointment.id} className="px-4 py-3 hover:bg-gray-50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs font-semibold text-blue-600 uppercase">
                    {new Date(appointment.startAt).toLocaleString('en-GB', {
                      month: 'short',
                      timeZone: 'Europe/London',
                    })}
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {new Date(appointment.startAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      timeZone: 'Europe/London',
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{formatDateRange(appointment.startAt, appointment.endAt)}</span>
                </div>
                {appointment.notes && (
                  <p className="text-xs text-gray-600 mt-1 truncate">{appointment.notes}</p>
                )}
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                  Confirmed
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600 border-t border-gray-200">
        Showing {sortedAppointments.length} upcoming {sortedAppointments.length === 1 ? 'appointment' : 'appointments'}
      </div>
    </div>
  );
}

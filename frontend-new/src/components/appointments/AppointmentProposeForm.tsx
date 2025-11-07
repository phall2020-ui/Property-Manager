import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../../lib/api';
import { validateAppointmentTimes, isBusinessHours, getTimezoneAbbr } from '../../lib/date-utils';
import { AlertCircle, Calendar, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface AppointmentProposeFormProps {
  ticketId: string;
  onSuccess?: () => void;
}

export default function AppointmentProposeForm({ ticketId, onSuccess }: AppointmentProposeFormProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const proposeMutation = useMutation({
    mutationFn: (data: { startAt: string; endAt?: string; notes?: string }) =>
      ticketsApi.proposeAppointment(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
      setStartDate('');
      setStartTime('');
      setEndTime('');
      setNotes('');
      setFormError('');
      toast.success('Appointment proposed successfully!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      const message = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message  // eslint-disable-line @typescript-eslint/no-explicit-any
        : 'Failed to propose appointment';
      setFormError(message);
      toast.error(message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!startDate || !startTime) {
      setFormError('Please provide start date and time');
      return;
    }

    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endTime ? new Date(`${startDate}T${endTime}`) : undefined;

    // Validate times
    const validation = validateAppointmentTimes(startDateTime, endDateTime);
    if (!validation.valid) {
      setFormError(validation.error || 'Invalid appointment times');
      return;
    }

    // Check business hours for hint
    const isBusinessHoursStart = isBusinessHours(startDateTime);
    if (!isBusinessHoursStart) {
      // Still allow, but just noting this for UX
    }

    proposeMutation.mutate({
      startAt: startDateTime.toISOString(),
      endAt: endDateTime?.toISOString(),
      notes: notes.trim() || undefined,
    });
  };

  // Check if selected time is during business hours
  const showBusinessHoursHint = () => {
    if (!startDate || !startTime) return false;
    const startDateTime = new Date(`${startDate}T${startTime}`);
    return !isBusinessHours(startDateTime);
  };

  const tzAbbr = getTimezoneAbbr(new Date());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
          <Calendar className="inline w-4 h-4 mr-1" />
          Start Date *
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-required="true"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
            <Clock className="inline w-4 h-4 mr-1" />
            Start Time * ({tzAbbr})
          </label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
            <Clock className="inline w-4 h-4 mr-1" />
            End Time ({tzAbbr})
          </label>
          <input
            type="time"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-gray-500 mt-1">Optional, min 30 minutes</p>
        </div>
      </div>

      {showBusinessHoursHint() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            Selected time is outside business hours (Mon-Fri, 9 AM - 6 PM). Consider scheduling during business hours for faster response.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional information about the appointment..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{formError}</span>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={proposeMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {proposeMutation.isPending ? 'Proposing...' : 'Propose Appointment'}
        </button>
      </div>
    </form>
  );
}

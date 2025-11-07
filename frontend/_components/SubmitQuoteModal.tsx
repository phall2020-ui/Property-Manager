'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { SubmitQuoteSchema, SubmitQuoteDTO } from '@/lib/schemas';

interface SubmitQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubmitQuoteDTO) => void;
  isSubmitting?: boolean;
  ticketTitle?: string;
}

/**
 * Modal for contractors to submit quotes on assigned jobs.
 * Features:
 * - Amount input with validation
 * - ETA date picker
 * - Notes/details textarea
 * - Form validation with Zod
 */
export function SubmitQuoteModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  ticketTitle,
}: SubmitQuoteModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SubmitQuoteDTO>({
    resolver: zodResolver(SubmitQuoteSchema),
  });

  const notesValue = watch('notes') || '';

  const handleFormSubmit = (data: SubmitQuoteDTO) => {
    onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Submit Quote" maxWidth="md">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {ticketTitle && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Job</p>
            <p className="font-medium text-gray-900 mt-1">{ticketTitle}</p>
          </div>
        )}

        <div>
          <Input
            label="Quote Amount (£)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount', { valueAsNumber: true })}
          />
        </div>

        <div>
          <Input
            label="Estimated Completion Date"
            type="date"
            error={errors.eta?.message}
            {...register('eta')}
          />
        </div>

        <div>
          <Textarea
            label="Notes (Optional)"
            rows={4}
            maxLength={300}
            placeholder="Additional details about the work to be done, materials needed, etc."
            error={errors.notes?.message}
            {...register('notes')}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">
              Maximum 300 characters
            </p>
            <p className="text-xs text-gray-500">
              {notesValue.length}/300
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Quote'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { AlertCircle } from 'lucide-react';

interface DeclineQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecline: (reason: string) => void;
  isSubmitting?: boolean;
  quoteAmount?: number;
  ticketTitle?: string;
  contractorName?: string;
}

/**
 * Modal for landlords to decline contractor quotes.
 * Features:
 * - Displays quote details
 * - Required reason field (important for contractor feedback)
 * - Warning styling to emphasise action
 */
export function DeclineQuoteModal({
  isOpen,
  onClose,
  onDecline,
  isSubmitting = false,
  quoteAmount,
  ticketTitle,
  contractorName,
}: DeclineQuoteModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ reason: string }>({
    defaultValues: { reason: '' },
  });

  const handleFormSubmit = (data: { reason: string }) => {
    if (!data.reason.trim()) {
      return;
    }
    onDecline(data.reason);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Decline Quote" maxWidth="md">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">You are about to decline this quote</p>
              <p className="text-sm text-amber-700 mt-1">
                Please provide a reason to help the contractor understand your decision.
              </p>
            </div>
          </div>
        </div>

        {/* Quote Details */}
        <div className="space-y-3">
          {ticketTitle && (
            <div>
              <p className="text-sm text-gray-600">Job</p>
              <p className="font-medium text-gray-900 mt-1">{ticketTitle}</p>
            </div>
          )}
          {contractorName && (
            <div>
              <p className="text-sm text-gray-600">Contractor</p>
              <p className="font-medium text-gray-900 mt-1">{contractorName}</p>
            </div>
          )}
          {quoteAmount !== undefined && (
            <div>
              <p className="text-sm text-gray-600">Quote Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                £{quoteAmount.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Reason (Required) */}
        <div>
          <Textarea
            label="Reason for Declining"
            rows={4}
            placeholder="Please explain why you are declining this quote (e.g., too expensive, need different approach, found alternative contractor...)"
            error={errors.reason?.message}
            {...register('reason', {
              required: 'Please provide a reason for declining',
              minLength: {
                value: 10,
                message: 'Please provide a more detailed reason (at least 10 characters)',
              },
            })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={isSubmitting}>
            {isSubmitting ? 'Declining...' : 'Decline Quote'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

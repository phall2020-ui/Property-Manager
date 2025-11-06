'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { CheckCircle } from 'lucide-react';

interface ApproveQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (notes?: string) => void;
  isSubmitting?: boolean;
  quoteAmount?: number;
  ticketTitle?: string;
  contractorName?: string;
}

/**
 * Modal for landlords to approve contractor quotes.
 * Features:
 * - Displays quote details
 * - Optional notes field
 * - Clear confirmation action
 */
export function ApproveQuoteModal({
  isOpen,
  onClose,
  onApprove,
  isSubmitting = false,
  quoteAmount,
  ticketTitle,
  contractorName,
}: ApproveQuoteModalProps) {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<{ notes?: string }>();

  const handleFormSubmit = (data: { notes?: string }) => {
    onApprove(data.notes);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Approve Quote" maxWidth="md">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Quote Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-900">You are about to approve this quote</p>
              <p className="text-sm text-green-700 mt-1">
                This will notify the contractor to begin work.
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

        {/* Optional Notes */}
        <div>
          <Textarea
            label="Notes (Optional)"
            rows={3}
            placeholder="Any additional instructions or comments for the contractor..."
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Approving...' : 'Approve Quote'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

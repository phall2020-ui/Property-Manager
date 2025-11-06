'use client';

import React from 'react';
import { TicketStatus } from '@/types/models';

interface StatusBadgeProps {
  status: TicketStatus | string;
  className?: string;
}

/**
 * StatusBadge component for displaying ticket statuses with appropriate colors
 * Maps ticket statuses to visual indicators following British English conventions
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    const statusUpper = status.toUpperCase();
    
    switch (statusUpper) {
      case 'OPEN':
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'QUOTED':
      case 'NEEDS_APPROVAL':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'APPROVED':
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED':
      case 'COMPLETED':
      case 'RESOLVED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusStyles(
        status
      )} ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}

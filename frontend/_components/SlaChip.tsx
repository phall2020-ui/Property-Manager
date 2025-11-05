"use client";

import React from 'react';
import { Badge } from './Badge';

interface SlaChipProps {
  slaDueAt: string;
}

/**
 * Computes the remaining time until an SLA due date and renders a coloured badge.
 * If the SLA is overdue the badge is red, if due within 24h it's yellow,
 * otherwise green. A tooltip shows the exact due date.
 */
export const SlaChip: React.FC<SlaChipProps> = ({ slaDueAt }) => {
  const due = new Date(slaDueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / 1000 / 60 / 60;
  let color: 'success' | 'warning' | 'danger' = 'success';
  if (diffHours < 0) color = 'danger';
  else if (diffHours <= 24) color = 'warning';
  return (
    <Badge color={color}>
      {diffHours < 0 ? 'Overdue' : `${Math.ceil(diffHours)}h`}
    </Badge>
  );
};
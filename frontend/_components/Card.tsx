"use client";

import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`rounded border border-gray-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
  );
};
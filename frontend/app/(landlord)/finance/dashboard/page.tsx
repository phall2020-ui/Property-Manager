"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics, getArrearsAging } from '@/_lib/financeClient';
import { DollarSign, FileText, AlertCircle, CreditCard, TrendingUp } from 'lucide-react';

export default function FinanceDashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: getDashboardMetrics,
  });

  const { data: aging, isLoading: agingLoading } = useQuery({
    queryKey: ['finance', 'arrears-aging'],
    queryFn: getArrearsAging,
  });

  if (metricsLoading || agingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading finance dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Money Dashboard</h1>
          <p className="text-gray-600 mt-1">Financial overview and key metrics</p>
        </div>
        <div className="space-x-2">
          <Link
            href="/finance/invoices"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            View All Invoices
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Rent Received MTD */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rent Received (MTD)</p>
              <p className="text-2xl font-bold text-green-600">
                £{metrics?.rentReceivedMTD.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outstanding Invoices</p>
              <p className="text-2xl font-bold text-orange-600">
                £{metrics?.outstandingInvoices.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-500">{metrics?.invoiceCount || 0} invoices</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Arrears Total */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Arrears</p>
              <p className="text-2xl font-bold text-red-600">
                £{metrics?.arrearsTotal.toFixed(2) || '0.00'}
              </p>
              <Link href="/finance/arrears" className="text-xs text-blue-600 hover:underline">
                View details →
              </Link>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Mandate Coverage */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mandate Coverage</p>
              <p className="text-2xl font-bold text-blue-600">
                {metrics?.mandateCoverage.toFixed(1) || '0.0'}%
              </p>
              <Link href="/finance/mandates" className="text-xs text-blue-600 hover:underline">
                Manage mandates →
              </Link>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/finance/rent-roll"
          className="block rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold">Rent Roll</h3>
              <p className="text-sm text-gray-600">Expected vs received rent</p>
            </div>
          </div>
        </Link>

        <Link
          href="/finance/arrears"
          className="block rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="font-semibold">Arrears & Collections</h3>
              <p className="text-sm text-gray-600">Manage overdue payments</p>
            </div>
          </div>
        </Link>

        <Link
          href="/finance/invoices"
          className="block rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold">Invoices</h3>
              <p className="text-sm text-gray-600">View and manage invoices</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Arrears Aging */}
      {aging && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Arrears Aging</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">0-30 days</p>
              <p className="text-2xl font-bold text-yellow-600">
                £{aging['0-30']?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">31-60 days</p>
              <p className="text-2xl font-bold text-orange-600">
                £{aging['31-60']?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">61-90 days</p>
              <p className="text-2xl font-bold text-red-500">
                £{aging['61-90']?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">90+ days</p>
              <p className="text-2xl font-bold text-red-700">
                £{aging['90+']?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

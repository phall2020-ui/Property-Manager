"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRentRoll, type RentRollItem } from '@/lib/financeClient';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function RentRollPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data, isLoading } = useQuery<RentRollItem[]>({
    queryKey: ['finance', 'rent-roll', month],
    queryFn: () => getRentRoll(month),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rent Roll</h1>
          <p className="text-gray-600 mt-1">Expected vs received rent by property</p>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Month:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Rent Roll Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading rent roll...</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No data for selected month</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Received
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Variance
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Mandate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((item) => {
                  const variance = item.variance;
                  const isPositive = variance >= 0;

                  return (
                    <tr key={item.tenancyId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.propertyAddress}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.tenantName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        £{item.expectedRent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        £{item.receivedRent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <div
                          className={`flex items-center justify-end ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          £{Math.abs(variance).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.hasMandate ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary Row */}
            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-700">Total for {month}:</span>
                <div className="space-x-8">
                  <span>
                    Expected: £
                    {data.reduce((sum, item) => sum + item.expectedRent, 0).toFixed(2)}
                  </span>
                  <span className="text-green-600">
                    Received: £
                    {data.reduce((sum, item) => sum + item.receivedRent, 0).toFixed(2)}
                  </span>
                  <span
                    className={
                      data.reduce((sum, item) => sum + item.variance, 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    Variance: £
                    {data.reduce((sum, item) => sum + item.variance, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

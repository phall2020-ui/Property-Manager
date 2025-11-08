import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DashboardMetrics {
  totalRent: number;
  collectedThisMonth: number;
  arrearsTotal: number;
  upcomingInvoices: number;
}

export interface RentRollEntry {
  propertyId: string;
  propertyAddress: string;
  tenancyId: string;
  tenantName: string;
  rentPcm: number;
  status: string;
  dueDate: string;
}

export interface Invoice {
  id: string;
  tenancyId: string;
  propertyId: string;
  amount: number;
  status: string;
  dueDate: string;
  issueDate: string;
  description?: string;
}

export interface InvoicesResponse {
  items: Invoice[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

export interface Payment {
  id: string;
  tenancyId: string;
  amount: number;
  status: string;
  receivedAt: string;
  method?: string;
}

export interface PaymentsResponse {
  items: Payment[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

export interface Arrears {
  tenancyId: string;
  propertyAddress: string;
  tenantName: string;
  amount: number;
  daysPastDue: number;
  bucket: string;
}

/**
 * Hook to fetch finance dashboard metrics
 */
export function useFinanceDashboard(options?: UseQueryOptions<DashboardMetrics>) {
  return useQuery<DashboardMetrics>({
    queryKey: ['finance', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/finance/dashboard');
      return response.data;
    },
    ...options,
  });
}

/**
 * Hook to fetch rent roll for a specific month
 */
export function useRentRoll(month?: string, options?: UseQueryOptions<RentRollEntry[]>) {
  return useQuery<RentRollEntry[]>({
    queryKey: ['finance', 'rent-roll', month],
    queryFn: async () => {
      const response = await api.get('/finance/rent-roll', {
        params: month ? { month } : undefined,
      });
      return response.data;
    },
    ...options,
  });
}

/**
 * Hook to fetch invoices with optional filters
 */
export function useInvoices(
  filters?: {
    propertyId?: string;
    tenancyId?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
  options?: UseQueryOptions<InvoicesResponse>
) {
  return useQuery<InvoicesResponse>({
    queryKey: ['finance', 'invoices', filters],
    queryFn: async () => {
      const response = await api.get('/finance/invoices', { params: filters });
      const data = response.data;
      // Normalize response format
      if (Array.isArray(data)) {
        return {
          items: data,
          page: 1,
          page_size: data.length,
          total: data.length,
          has_next: false,
        };
      }
      return data;
    },
    ...options,
  });
}

/**
 * Hook to fetch payments with optional filters
 */
export function usePayments(
  filters?: {
    propertyId?: string;
    tenancyId?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
  options?: UseQueryOptions<PaymentsResponse>
) {
  return useQuery<PaymentsResponse>({
    queryKey: ['finance', 'payments', filters],
    queryFn: async () => {
      const response = await api.get('/finance/payments', { params: filters });
      const data = response.data;
      // Normalize response format
      if (Array.isArray(data)) {
        return {
          items: data,
          page: 1,
          page_size: data.length,
          total: data.length,
          has_next: false,
        };
      }
      return data;
    },
    ...options,
  });
}

/**
 * Hook to fetch arrears list with optional bucket filter
 */
export function useArrears(bucket?: string, options?: UseQueryOptions<Arrears[]>) {
  return useQuery<Arrears[]>({
    queryKey: ['finance', 'arrears', bucket],
    queryFn: async () => {
      const response = await api.get('/finance/arrears', {
        params: bucket ? { bucket } : undefined,
      });
      return response.data;
    },
    ...options,
  });
}

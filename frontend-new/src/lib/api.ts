import axios from 'axios';
import type { Property } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Store new access token
        localStorage.setItem('accessToken', data.accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear token and redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  signup: async (data: { email: string; password: string; name: string }) => {
    try {
      const response = await api.post('/auth/signup', data);
      if (response.data && response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        return response.data;
      } else {
        throw new Error('Invalid response from server: missing access token');
      }
    } catch (error: unknown) {
      console.error('Signup API error:', error);
      throw error;
    }
  },

  login: async (data: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', data);
      if (response.data && response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        return response.data;
      } else {
        throw new Error('Invalid response from server: missing access token');
      }
    } catch (error: unknown) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      localStorage.removeItem('accessToken');
    }
  },

  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

// Properties API
export const propertiesApi = {
  list: async () => {
    const response = await api.get('/properties');
    return response.data;
  },

  create: async (data: {
    address1: string;
    address2?: string;
    city?: string;
    postcode: string;
    bedrooms?: number;
  }) => {
    const response = await api.post('/properties', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },
};

// Tenancies API
export const tenanciesApi = {
  list: async () => {
    const response = await api.get('/tenancies');
    return response.data;
  },

  create: async (data: {
    propertyId: string;
    tenantOrgId: string;
    startDate: string;
    endDate?: string;
    rentPcm: number;
    deposit: number;
  }) => {
    const response = await api.post('/tenancies', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/tenancies/${id}`);
    return response.data;
  },

  uploadDocument: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tenancies/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Tickets API
export const ticketsApi = {
  list: async () => {
    const response = await api.get('/tickets');
    // Backend returns paginated response: { items: [], total, page, page_size, has_next }
    // Extract the items array for compatibility with component
    const result = response.data;
    return Array.isArray(result) ? result : (result.items || result.data || []);
  },

  create: async (data: {
    propertyId?: string;
    tenancyId?: string;
    title: string;
    description: string;
    priority: string;
    category?: string;
  }) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, to: string) => {
    const response = await api.patch(`/tickets/${id}/status`, { to });
    return response.data;
  },

  getTimeline: async (id: string) => {
    const response = await api.get(`/tickets/${id}/timeline`);
    return response.data;
  },

  approve: async (id: string, idempotencyKey?: string) => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const response = await api.post(`/tickets/${id}/approve`, {}, { headers });
    return response.data;
  },

  createQuote: async (id: string, data: { amount: number; notes?: string }) => {
    const response = await api.post(`/tickets/${id}/quote`, data);
    return response.data;
  },

  approveQuote: async (quoteId: string) => {
    const response = await api.post(`/tickets/quotes/${quoteId}/approve`);
    return response.data;
  },

  complete: async (id: string, completionNotes?: string) => {
    const response = await api.post(`/tickets/${id}/complete`, { completionNotes });
    return response.data;
  },

  uploadAttachment: async (id: string, file: File, category?: 'before' | 'after' | 'other') => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) {
      formData.append('category', category);
    }
    const response = await api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAttachments: async (id: string) => {
    const response = await api.get(`/tickets/${id}/attachments`);
    return response.data;
  },

  deleteAttachment: async (ticketId: string, attachmentId: string) => {
    const response = await api.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
    return response.data;
  },

  proposeAppointment: async (id: string, data: { startAt: string; endAt?: string; notes?: string }) => {
    const response = await api.post(`/tickets/${id}/appointments`, data);
    return response.data;
  },

  getAppointments: async (id: string) => {
    const response = await api.get(`/tickets/${id}/appointments`);
    return response.data;
  },

  confirmAppointment: async (appointmentId: string) => {
    const response = await api.post(`/appointments/${appointmentId}/confirm`, {});
    return response.data;
  },

  getAppointment: async (appointmentId: string) => {
    const response = await api.get(`/appointments/${appointmentId}`);
    return response.data;
  },

  assign: async (id: string, contractorId: string) => {
    const response = await api.patch(`/tickets/${id}/assign`, { contractorId });
    return response.data;
  },
};

// Compliance API
export const complianceApi = {
  getPortfolioCompliance: async () => {
    const response = await api.get('/compliance/portfolio');
    return response.data;
  },

  getComplianceStats: async () => {
    const response = await api.get('/compliance/portfolio/stats');
    return response.data;
  },

  getPropertyCompliance: async (propertyId: string) => {
    const response = await api.get(`/compliance/property/${propertyId}`);
    return response.data;
  },
};

// Transform backend property format to frontend Property type
function transformProperty(backendProp: any): Property {
  // Handle both formats: backend format (addressLine1, address2, etc.) or already transformed
  if (backendProp.address && typeof backendProp.address === 'object') {
    // Already in frontend format
    return backendProp as Property;
  }
  
  // Transform from backend format
  return {
    id: backendProp.id,
    name: backendProp.name,
    address: {
      line1: backendProp.addressLine1 || backendProp.address1 || '',
      line2: backendProp.address2 || backendProp.addressLine2,
      city: backendProp.city,
      postcode: backendProp.postcode || '',
      country: backendProp.country,
    },
    lat: backendProp.lat,
    lng: backendProp.lng,
    units: backendProp.units,
    bedrooms: backendProp.bedrooms,
    bathrooms: backendProp.bathrooms,
    floorAreaM2: backendProp.floorAreaM2,
    monthlyRent: backendProp.monthlyRent,
    lastRentPaidAt: backendProp.lastRentPaidAt,
    annualInsurance: backendProp.annualInsurance,
    annualServiceCharge: backendProp.annualServiceCharge,
    estimatedValue: backendProp.estimatedValue,
    occupancyRate: backendProp.occupancyRate,
    status: backendProp.status,
  };
}

// Enhanced Properties API with extended data
export const enhancedPropertiesApi = {
  list: async () => {
    const response = await api.get('/properties');
    // Backend returns paginated response: { data: [], total, page, pageSize }
    // Extract the data array for compatibility with component
    const result = response.data;
    const properties = Array.isArray(result) ? result : (result.data || []);
    return properties.map(transformProperty);
  },

  getById: async (id: string) => {
    const response = await api.get(`/properties/${id}`);
    return transformProperty(response.data);
  },
};

// Jobs API
export const jobsApi = {
  list: async () => {
    const response = await api.get('/jobs');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
};

// Queue API  
export const queueApi = {
  list: async () => {
    const response = await api.get('/queue');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/queue/stats');
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  list: async (params?: { limit?: number; unreadOnly?: boolean }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (ids: string[]) => {
    const response = await api.post('/notifications/read', { ids });
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};

// Finance API
export const financeApi = {
  getDashboard: async () => {
    const response = await api.get('/finance/dashboard');
    return response.data;
  },

  listInvoices: async (params?: { propertyId?: string; tenancyId?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/finance/invoices', { params });
    return response.data;
  },

  getInvoice: async (id: string) => {
    const response = await api.get(`/finance/invoices/${id}`);
    return response.data;
  },

  listPayments: async (params?: { propertyId?: string; tenancyId?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/finance/payments', { params });
    return response.data;
  },

  getPayment: async (id: string) => {
    const response = await api.get(`/finance/payments/${id}`);
    return response.data;
  },

  getRentRoll: async (month?: string) => {
    const response = await api.get('/finance/rent-roll', { params: { month } });
    return response.data;
  },

  getArrears: async (bucket?: string) => {
    const response = await api.get('/finance/arrears', { params: { bucket } });
    return response.data;
  },

  getPropertyRentSummary: async (propertyId: string) => {
    const response = await api.get(`/finance/properties/${propertyId}/rent/summary`);
    return response.data;
  },

  getTenancyBalance: async (tenancyId: string) => {
    const response = await api.get(`/finance/tenancies/${tenancyId}/balance`);
    return response.data;
  },
};

// Tenant Finance API
export const tenantFinanceApi = {
  listInvoices: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/tenant/payments/invoices', { params });
    return response.data;
  },

  getInvoice: async (id: string) => {
    const response = await api.get(`/tenant/payments/invoices/${id}`);
    return response.data;
  },

  getReceipt: async (id: string) => {
    const response = await api.get(`/tenant/payments/receipts/${id}`);
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  signUpload: async (contentType: string) => {
    // Validate content type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (!allowedTypes.includes(contentType)) {
      throw new Error(`Content type ${contentType} is not allowed`);
    }
    
    const response = await api.post('/attachments/sign', { contentType });
    return response.data;
  },

  create: async (data: {
    filename: string;
    contentType: string;
    s3Key: string;
    entityType: string;
    entityId: string;
    expiryDate?: string;
  }) => {
    const response = await api.post('/documents', data);
    return response.data;
  },

  list: async (entityType: string, entityId: string) => {
    const response = await api.get(`/documents/${entityType}/${entityId}`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
};

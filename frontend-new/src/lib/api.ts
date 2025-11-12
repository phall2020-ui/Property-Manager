import { apiClient } from './api-client';
import type { Property } from './types';

// Re-export the centralized API client
export const api = apiClient;

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
    try {
      const response = await api.get('/properties');
      // Backend returns paginated response: { data: [], total, page, pageSize }
      // Extract the data array for compatibility with component
      const result = response.data;
      return Array.isArray(result) ? result : (result.data || []);
    } catch {
      // Fallback mock data for development
      console.warn('Using mock property data');
      return [
        {
          id: '1',
          name: '12A High St',
          address: { line1: '12A High St', city: 'London', postcode: 'EC1A 1BB' },
          lat: 51.5206,
          lng: -0.0986,
          monthlyRent: 1800,
          estimatedValue: 450000,
          occupancyRate: 0.98,
          status: 'Occupied',
          bedrooms: 2,
          bathrooms: 1,
          floorAreaM2: 70,
        },
        {
          id: '2',
          name: '2B Park Avenue',
          address: { line1: '2B Park Ave', city: 'London', postcode: 'W1K 2AB' },
          lat: 51.515,
          lng: -0.141,
          monthlyRent: 2400,
          estimatedValue: 650000,
          occupancyRate: 1,
          status: 'Occupied',
          bedrooms: 3,
          bathrooms: 2,
          floorAreaM2: 92,
        },
        {
          id: '3',
          name: 'Flat 7, Wharf',
          address: { line1: 'Flat 7 Wharf', city: 'London', postcode: 'E14 9SH' },
          lat: 51.505,
          lng: -0.02,
          monthlyRent: 1600,
          estimatedValue: 400000,
          occupancyRate: 0.9,
          status: 'Vacant',
          bedrooms: 1,
          bathrooms: 1,
          floorAreaM2: 55,
        },
        {
          id: '4',
          name: '45 Queen Street',
          address: { line1: '45 Queen Street', city: 'London', postcode: 'SW1A 2BX' },
          lat: 51.5074,
          lng: -0.1278,
          monthlyRent: 2100,
          estimatedValue: 550000,
          occupancyRate: 1,
          status: 'Let Agreed',
          bedrooms: 2,
          bathrooms: 2,
          floorAreaM2: 80,
        },
      ];
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return transformProperty(response.data);
    } catch {
      // Fallback to mock data
      const mockProperties = await enhancedPropertiesApi.list();
      return mockProperties.find((p: { id: string }) => p.id === id) || null;
    }
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

  getPreferences: async () => {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (data: {
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
    webhookEnabled?: boolean;
    webhookUrl?: string;
    notifyTicketCreated?: boolean;
    notifyTicketAssigned?: boolean;
    notifyQuoteSubmitted?: boolean;
    notifyQuoteApproved?: boolean;
    notifyTicketCompleted?: boolean;
  }) => {
    const response = await api.put('/notifications/preferences', data);
    return response.data;
  },
};

// Finance API
export const financeApi = {
  listInvoices: async () => {
    const response = await api.get('/finance/invoices');
    return response.data;
  },

  getInvoice: async (id: string) => {
    const response = await api.get(`/finance/invoices/${id}`);
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

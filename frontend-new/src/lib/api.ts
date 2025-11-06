import axios from 'axios';

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
    } catch (error: any) {
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
    } catch (error: any) {
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
    return response.data;
  },

  create: async (data: {
    propertyId?: string;
    tenancyId?: string;
    title: string;
    description: string;
    priority: string;
  }) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/tickets/${id}`);
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

  uploadAttachment: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

// Enhanced Properties API with extended data
export const enhancedPropertiesApi = {
  list: async () => {
    try {
      const response = await api.get('/properties');
      return response.data;
    } catch (error) {
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
      return response.data;
    } catch (error) {
      // Fallback to mock data
      const mockProperties = await enhancedPropertiesApi.list();
      return mockProperties.find((p: any) => p.id === id) || null;
    }
  },
};

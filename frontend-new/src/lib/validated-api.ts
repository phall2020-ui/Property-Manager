import axios, { AxiosResponse } from 'axios';
import { z } from 'zod';
import {
  SignupRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
  RefreshResponseSchema,
  CreatePropertyRequestSchema,
  UpdatePropertyRequestSchema,
  PropertySchema,
  PropertyListResponseSchema,
  CreateTenancyRequestSchema,
  TenancySchema,
  TenancyListResponseSchema,
  CreateTicketRequestSchema,
  UpdateTicketStatusRequestSchema,
  TicketSchema,
  TicketListResponseSchema,
  type SignupRequest,
  type LoginRequest,
  type AuthResponse,
  type RefreshResponse,
  type CreatePropertyRequest,
  type UpdatePropertyRequest,
  type Property,
  type PropertyListResponse,
  type CreateTenancyRequest,
  type Tenancy,
  type TenancyListResponse,
  type CreateTicketRequest,
  type UpdateTicketStatusRequest,
  type Ticket,
  type TicketListResponse,
} from '../schemas/api-schemas';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to validate request and response with Zod schemas
 */
async function validatedRequest<TRequest, TResponse>(
  requestPromise: Promise<AxiosResponse>,
  requestSchema: z.ZodSchema<TRequest> | null,
  responseSchema: z.ZodSchema<TResponse>,
  requestData?: TRequest
): Promise<TResponse> {
  // Validate request if schema and data provided
  if (requestSchema && requestData) {
    try {
      requestSchema.parse(requestData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Request validation failed:', error.errors);
        throw new Error(`Invalid request data: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
      throw error;
    }
  }

  // Make the request
  const response = await requestPromise;

  // Validate response
  try {
    return responseSchema.parse(response.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Response validation failed:', error.errors);
      console.error('Response data:', response.data);
      throw new Error(`Invalid response data: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

// ===== Validated Auth API =====
export const validatedAuthApi = {
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    return validatedRequest(
      api.post('/auth/signup', data),
      SignupRequestSchema,
      AuthResponseSchema,
      data
    ).then((response) => {
      localStorage.setItem('accessToken', response.accessToken);
      return response;
    });
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return validatedRequest(
      api.post('/auth/login', data),
      LoginRequestSchema,
      AuthResponseSchema,
      data
    ).then((response) => {
      localStorage.setItem('accessToken', response.accessToken);
      return response;
    });
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('accessToken');
    }
  },

  refresh: async (): Promise<RefreshResponse> => {
    return validatedRequest(
      api.post('/auth/refresh'),
      null,
      RefreshResponseSchema
    );
  },

  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

// ===== Validated Properties API =====
export const validatedPropertiesApi = {
  list: async (): Promise<PropertyListResponse> => {
    return validatedRequest(
      api.get('/properties'),
      null,
      PropertyListResponseSchema
    );
  },

  create: async (data: CreatePropertyRequest): Promise<Property> => {
    return validatedRequest(
      api.post('/properties', data),
      CreatePropertyRequestSchema,
      PropertySchema,
      data
    );
  },

  getById: async (id: string): Promise<Property> => {
    return validatedRequest(
      api.get(`/properties/${id}`),
      null,
      PropertySchema
    );
  },

  update: async (id: string, data: UpdatePropertyRequest): Promise<Property> => {
    return validatedRequest(
      api.patch(`/properties/${id}`, data),
      UpdatePropertyRequestSchema,
      PropertySchema,
      data
    );
  },
};

// ===== Validated Tenancies API =====
export const validatedTenanciesApi = {
  list: async (): Promise<TenancyListResponse> => {
    return validatedRequest(
      api.get('/tenancies'),
      null,
      TenancyListResponseSchema
    );
  },

  create: async (data: CreateTenancyRequest): Promise<Tenancy> => {
    return validatedRequest(
      api.post('/tenancies', data),
      CreateTenancyRequestSchema,
      TenancySchema,
      data
    );
  },

  getById: async (id: string): Promise<Tenancy> => {
    return validatedRequest(
      api.get(`/tenancies/${id}`),
      null,
      TenancySchema
    );
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

// ===== Validated Tickets API =====
export const validatedTicketsApi = {
  list: async (): Promise<TicketListResponse> => {
    return validatedRequest(
      api.get('/tickets'),
      null,
      TicketListResponseSchema
    );
  },

  create: async (data: CreateTicketRequest): Promise<Ticket> => {
    return validatedRequest(
      api.post('/tickets', data),
      CreateTicketRequestSchema,
      TicketSchema,
      data
    );
  },

  getById: async (id: string): Promise<Ticket> => {
    return validatedRequest(
      api.get(`/tickets/${id}`),
      null,
      TicketSchema
    );
  },

  updateStatus: async (id: string, data: UpdateTicketStatusRequest): Promise<Ticket> => {
    return validatedRequest(
      api.patch(`/tickets/${id}/status`, data),
      UpdateTicketStatusRequestSchema,
      TicketSchema,
      data
    );
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

// Export original unvalidated API for backward compatibility and non-validated endpoints
export { api };

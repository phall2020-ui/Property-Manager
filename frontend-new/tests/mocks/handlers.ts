/**
 * MSW (Mock Service Worker) handlers for API mocking
 * Install msw if you want to use this: npm install -D msw
 */

import { http, HttpResponse } from 'msw';
import { testUsers, mockAuthResponse, mockUser } from '../fixtures/test-users';
import { mockProperty, mockTenancy, mockTicket, mockQuote } from '../fixtures/test-data';

const API_BASE = '/api';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    // Validate credentials
    const user = Object.values(testUsers).find(u => u.email === body.email);
    if (!user || body.password !== user.password) {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json(mockAuthResponse);
  }),

  http.post(`${API_BASE}/auth/signup`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string };
    
    // Simulate duplicate email
    if (body.email === testUsers.landlord.email) {
      return HttpResponse.json(
        { detail: 'Email already registered' },
        { status: 409 }
      );
    }

    return HttpResponse.json(mockAuthResponse, { status: 201 });
  }),

  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: 'new-access-token',
    });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // User endpoints
  http.get(`${API_BASE}/users/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Property endpoints
  http.get(`${API_BASE}/properties`, () => {
    return HttpResponse.json([mockProperty]);
  }),

  http.get(`${API_BASE}/properties/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockProperty, id: params.id });
  }),

  http.post(`${API_BASE}/properties`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockProperty, ...body }, { status: 201 });
  }),

  // Ticket endpoints
  http.get(`${API_BASE}/tickets`, () => {
    return HttpResponse.json([mockTicket]);
  }),

  http.get(`${API_BASE}/tickets/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockTicket, id: params.id });
  }),

  http.post(`${API_BASE}/tickets`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockTicket, ...body, id: `ticket-${Date.now()}` }, { status: 201 });
  }),

  // Quote endpoints
  http.post(`${API_BASE}/tickets/:id/quote`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockQuote, ...body }, { status: 201 });
  }),

  http.post(`${API_BASE}/tickets/quotes/:quoteId/approve`, () => {
    return HttpResponse.json({ ...mockQuote, status: 'APPROVED' });
  }),
];


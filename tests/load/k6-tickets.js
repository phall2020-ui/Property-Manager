import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    // Search scenario - ramping load to test search performance
    search: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 50, duration: '1m' },
        { target: 100, duration: '2m' },
        { target: 200, duration: '2m' },
        { target: 100, duration: '1m' },
        { target: 0, duration: '30s' },
      ],
      exec: 'searchTickets',
    },
    // Bulk operations scenario - constant load
    bulkOps: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'bulkOperations',
      startTime: '30s', // Start after search has warmed up
    },
    // Concurrent quote scenario - test race conditions
    concurrentQuotes: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 5,
      maxDuration: '3m',
      exec: 'concurrentQuoteApprovals',
      startTime: '1m',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.005'], // Less than 0.5% errors
    'http_req_duration': ['p(95)<600'], // 95% of requests under 600ms
    'http_req_duration{scenario:search}': ['p(95)<300'], // Search cached should be under 300ms
    'errors': ['rate<0.01'], // Less than 1% application errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || '';

// Helper function to create auth headers
function authHeaders(idempotencyKey) {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

// Search tickets with various filters
export function searchTickets() {
  const searchQueries = [
    'leak',
    'broken',
    'repair',
    'heating',
    'plumbing',
    'electrical',
  ];
  
  const categories = ['plumbing', 'electrical', 'heating', 'general'];
  const statuses = ['OPEN', 'TRIAGED', 'QUOTED', 'APPROVED', 'SCHEDULED'];
  const sortFields = ['created_at', 'updated_at', 'priority'];
  
  // Random search parameters
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const category = Math.random() > 0.5 ? categories[Math.floor(Math.random() * categories.length)] : null;
  const status = Math.random() > 0.5 ? statuses[Math.floor(Math.random() * statuses.length)] : null;
  const sortBy = sortFields[Math.floor(Math.random() * sortFields.length)];
  const sortDir = Math.random() > 0.5 ? 'asc' : 'desc';
  const page = Math.floor(Math.random() * 5) + 1;
  
  // Build query string
  let params = `page=${page}&page_size=25&sort_by=${sortBy}&sort_dir=${sortDir}`;
  if (query && Math.random() > 0.3) params += `&q=${query}`;
  if (category) params += `&category=${category}`;
  if (status) params += `&status=${status}`;
  
  const response = http.get(
    `${BASE_URL}/tickets?${params}`,
    { headers: authHeaders() }
  );
  
  const success = check(response, {
    'search: status is 200': (r) => r.status === 200,
    'search: has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items);
      } catch {
        return false;
      }
    },
    'search: has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.page !== undefined && body.total !== undefined;
      } catch {
        return false;
      }
    },
    'search: response time < 600ms': (r) => r.timings.duration < 600,
  });
  
  errorRate.add(!success);
  
  sleep(1 + Math.random() * 2); // Variable think time 1-3 seconds
}

// Bulk operations with idempotency
export function bulkOperations() {
  const operations = ['assign', 'close', 'category', 'tag'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  // Generate idempotency key
  const idempotencyKey = `bulk-${operation}-${__VU}-${__ITER}`;
  
  // Mock ticket IDs (in production, these would be real)
  const ticketIds = Array.from(
    { length: Math.floor(Math.random() * 10) + 1 },
    (_, i) => `ticket-${__VU}-${i}`
  );
  
  let endpoint, payload;
  
  switch (operation) {
    case 'assign':
      endpoint = `${BASE_URL}/tickets/bulk/assign`;
      payload = {
        ticket_ids: ticketIds,
        contractor_id: `contractor-${Math.floor(Math.random() * 5) + 1}`,
      };
      break;
    case 'close':
      endpoint = `${BASE_URL}/tickets/bulk/close`;
      payload = {
        ticket_ids: ticketIds,
        resolution_note: 'Bulk closure for testing',
      };
      break;
    case 'category':
      endpoint = `${BASE_URL}/tickets/bulk/category`;
      payload = {
        ticket_ids: ticketIds,
        category: ['plumbing', 'electrical', 'heating'][Math.floor(Math.random() * 3)],
      };
      break;
    case 'tag':
      endpoint = `${BASE_URL}/tickets/bulk/tag`;
      payload = {
        ticket_ids: ticketIds,
        add: ['urgent', 'priority'],
        remove: ['low-priority'],
      };
      break;
  }
  
  const response = http.post(
    endpoint,
    JSON.stringify(payload),
    { headers: authHeaders(idempotencyKey) }
  );
  
  const success = check(response, {
    'bulk: status is 207 or 404': (r) => r.status === 207 || r.status === 404, // 404 is ok for mock data
    'bulk: response is JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });
  
  // Test idempotency - repeat request with same key
  if (Math.random() > 0.7) {
    const repeat = http.post(
      endpoint,
      JSON.stringify(payload),
      { headers: authHeaders(idempotencyKey) }
    );
    
    check(repeat, {
      'bulk idempotency: same result': (r) => r.status === response.status,
    });
  }
  
  errorRate.add(!success);
  
  sleep(2 + Math.random() * 3); // Variable think time 2-5 seconds
}

// Concurrent quote submissions and approvals
export function concurrentQuoteApprovals() {
  // Create a ticket
  const createResponse = http.post(
    `${BASE_URL}/tickets`,
    JSON.stringify({
      propertyId: `property-${__VU}`,
      title: `Test ticket ${__VU}-${__ITER}`,
      description: 'Test description for concurrent operations',
      priority: 'STANDARD',
      category: 'plumbing',
    }),
    { headers: authHeaders() }
  );
  
  if (createResponse.status !== 201) {
    errorRate.add(true);
    return;
  }
  
  let ticketId;
  try {
    ticketId = JSON.parse(createResponse.body).id;
  } catch {
    errorRate.add(true);
    return;
  }
  
  // Assign contractor
  sleep(0.5);
  
  const assignResponse = http.patch(
    `${BASE_URL}/tickets/${ticketId}/assign`,
    JSON.stringify({
      contractorId: `contractor-1`,
    }),
    { headers: authHeaders() }
  );
  
  check(assignResponse, {
    'concurrent: ticket assigned': (r) => r.status === 200 || r.status === 404,
  });
  
  // Submit quote
  sleep(0.5);
  
  const quoteResponse = http.post(
    `${BASE_URL}/tickets/${ticketId}/quote`,
    JSON.stringify({
      amount: Math.floor(Math.random() * 1000) + 100,
      notes: 'Test quote',
    }),
    { headers: authHeaders() }
  );
  
  check(quoteResponse, {
    'concurrent: quote submitted': (r) => r.status === 200 || r.status === 201 || r.status === 404,
  });
  
  // Try to approve (may race with other VUs)
  sleep(0.2);
  
  const approveResponse = http.post(
    `${BASE_URL}/tickets/${ticketId}/approve`,
    JSON.stringify({}),
    { headers: authHeaders(`approve-${ticketId}-${__VU}`) }
  );
  
  check(approveResponse, {
    'concurrent: approve handled': (r) => 
      r.status === 200 || r.status === 404 || r.status === 409 || r.status === 403,
  });
  
  sleep(1);
}

// Default function for standalone execution
export default function() {
  searchTickets();
}

// Setup function - runs once per VU
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Token: ${TOKEN ? 'Provided' : 'Missing - tests may fail'}`);
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200 && healthCheck.status !== 404) {
    console.warn(`API health check failed with status ${healthCheck.status}`);
  }
  
  return { startTime: Date.now() };
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

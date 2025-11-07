import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Search and filtering load
    search: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { target: 50, duration: '1m' },   // Ramp up to 50 req/s
        { target: 100, duration: '2m' },  // Ramp up to 100 req/s
        { target: 200, duration: '3m' },  // Peak at 200 req/s
        { target: 50, duration: '2m' },   // Ramp down
      ],
      exec: 'searchTickets',
    },

    // Scenario 2: Bulk operations
    bulkOps: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'bulkOperations',
    },

    // Scenario 3: Concurrent quote submission and approval
    concurrentQuotes: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { target: 20, duration: '1m' },
        { target: 40, duration: '2m' },
        { target: 20, duration: '1m' },
      ],
      exec: 'quoteRace',
    },

    // Scenario 4: Notification webhook fan-out
    notifications: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'notificationWebhooks',
    },
  },

  thresholds: {
    // Error rate should be less than 0.5%
    'errors': ['rate<0.005'],
    
    // HTTP request duration thresholds
    'http_req_duration': ['p(95)<600'], // 95th percentile under 600ms
    'http_req_duration{scenario:search}': ['p(95)<300'], // Search should be faster (cached)
    'http_req_duration{scenario:bulkOps}': ['p(95)<1000'], // Bulk ops can be slower
    
    // HTTP request failures should be minimal
    'http_req_failed': ['rate<0.005'],
    
    // Specific checks
    'checks': ['rate>0.95'], // 95% of checks should pass
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api';
const LANDLORD_TOKEN = __ENV.LANDLORD_TOKEN || 'test-landlord-token';
const OPS_TOKEN = __ENV.OPS_TOKEN || 'test-ops-token';
const CONTRACTOR_TOKEN = __ENV.CONTRACTOR_TOKEN || 'test-contractor-token';

// Sample data for testing
const searchQueries = ['leak', 'boiler', 'heating', 'plumbing', 'electrical', 'door', 'window', 'roof'];
const categories = ['plumbing', 'electrical', 'heating', 'general', 'carpentry'];
const statuses = ['OPEN', 'TRIAGED', 'QUOTED', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS'];

// Helper function to get random element from array
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to create headers with auth token
function authHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Scenario 1: Search and filter tickets
export function searchTickets() {
  const params = { headers: authHeaders(LANDLORD_TOKEN) };
  
  // Test different search patterns
  const testCases = [
    // Full-text search
    `${BASE_URL}/tickets?q=${randomElement(searchQueries)}&page=1&page_size=25`,
    
    // Category filter
    `${BASE_URL}/tickets?category=${randomElement(categories)}&page=1&page_size=25`,
    
    // Status filter
    `${BASE_URL}/tickets?status=${randomElement(statuses)}&page=1&page_size=25`,
    
    // Combined filters
    `${BASE_URL}/tickets?q=${randomElement(searchQueries)}&category=${randomElement(categories)}&status=${randomElement(statuses)}&page=1&page_size=25&sort_by=created_at&sort_dir=desc`,
    
    // Date range
    `${BASE_URL}/tickets?date_from=2024-01-01&date_to=2024-12-31&page=1&page_size=25`,
    
    // Pagination test
    `${BASE_URL}/tickets?page=${Math.floor(Math.random() * 5) + 1}&page_size=50`,
  ];
  
  const url = randomElement(testCases);
  const response = http.get(url, params);
  
  const success = check(response, {
    'search status is 200': (r) => r.status === 200,
    'search has items': (r) => JSON.parse(r.body).items !== undefined,
    'search has pagination': (r) => {
      const body = JSON.parse(r.body);
      return body.page !== undefined && body.page_size !== undefined && body.total !== undefined;
    },
    'search response time OK': (r) => r.timings.duration < 600,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  sleep(1);
}

// Scenario 2: Bulk operations with idempotency
export function bulkOperations() {
  const params = { 
    headers: {
      ...authHeaders(OPS_TOKEN),
      'Idempotency-Key': `bulk-${__ITER}-${Date.now()}`,
    },
  };
  
  // Test different bulk operations
  const operations = [
    {
      name: 'bulk assign',
      url: `${BASE_URL}/tickets/bulk/assign`,
      payload: {
        ticket_ids: ['t1', 't2', 't3'],
        contractor_id: 'c1',
      },
    },
    {
      name: 'bulk close',
      url: `${BASE_URL}/tickets/bulk/close`,
      payload: {
        ticket_ids: ['t4', 't5'],
        resolution_note: 'Bulk closure for testing',
      },
    },
    {
      name: 'bulk reassign',
      url: `${BASE_URL}/tickets/bulk/reassign`,
      payload: {
        ticket_ids: ['t6', 't7'],
        contractor_id: 'c2',
      },
    },
    {
      name: 'bulk tag',
      url: `${BASE_URL}/tickets/bulk/tag`,
      payload: {
        ticket_ids: ['t8', 't9'],
        add: ['urgent', 'high-priority'],
      },
    },
    {
      name: 'bulk category',
      url: `${BASE_URL}/tickets/bulk/category`,
      payload: {
        ticket_ids: ['t10', 't11'],
        category: 'plumbing',
      },
    },
  ];
  
  const operation = randomElement(operations);
  const response = http.post(
    operation.url,
    JSON.stringify(operation.payload),
    params
  );
  
  const success = check(response, {
    [`${operation.name} status is 200 or 207`]: (r) => r.status === 200 || r.status === 207,
    [`${operation.name} has ok array`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ok !== undefined;
      } catch (e) {
        return false;
      }
    },
    [`${operation.name} has failed array`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.failed !== undefined;
      } catch (e) {
        return false;
      }
    },
    [`${operation.name} response time OK`]: (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  sleep(2);
}

// Scenario 3: Concurrent quote submission and approval (race condition test)
export function quoteRace() {
  // First, get a ticket to quote
  const getTicketParams = { headers: authHeaders(CONTRACTOR_TOKEN) };
  const ticketsResponse = http.get(`${BASE_URL}/tickets?status=OPEN&page=1&page_size=10`, getTicketParams);
  
  if (ticketsResponse.status !== 200) {
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  const tickets = JSON.parse(ticketsResponse.body).items;
  if (tickets.length === 0) {
    sleep(1);
    return;
  }
  
  const ticket = randomElement(tickets);
  
  // Submit a quote (contractor)
  const quoteParams = { headers: authHeaders(CONTRACTOR_TOKEN) };
  const quotePayload = {
    amount: Math.floor(Math.random() * 500) + 100,
    notes: 'Load test quote',
  };
  
  const quoteResponse = http.post(
    `${BASE_URL}/tickets/${ticket.id}/quote`,
    JSON.stringify(quotePayload),
    quoteParams
  );
  
  check(quoteResponse, {
    'quote submitted': (r) => r.status === 200 || r.status === 201,
  });
  
  // Simulate landlord approval race
  if (quoteResponse.status === 200 || quoteResponse.status === 201) {
    sleep(0.5); // Small delay
    
    const approveParams = { 
      headers: {
        ...authHeaders(LANDLORD_TOKEN),
        'Idempotency-Key': `approve-${ticket.id}-${__ITER}`,
      },
    };
    
    const approveResponse = http.post(
      `${BASE_URL}/tickets/${ticket.id}/approve`,
      JSON.stringify({ idempotencyKey: `approve-${ticket.id}-${__ITER}` }),
      approveParams
    );
    
    check(approveResponse, {
      'quote approval processed': (r) => r.status === 200 || r.status === 409, // 409 if already approved
    });
  }
  
  sleep(1);
}

// Scenario 4: Notification webhook fan-out
export function notificationWebhooks() {
  // Create a ticket to trigger notifications
  const createParams = { headers: authHeaders(LANDLORD_TOKEN) };
  const ticketPayload = {
    title: `Load test ticket ${__ITER}`,
    description: 'Testing notification fan-out',
    priority: 'STANDARD',
    category: randomElement(categories),
    propertyId: 'test-property-id',
  };
  
  const createResponse = http.post(
    `${BASE_URL}/tickets`,
    JSON.stringify(ticketPayload),
    createParams
  );
  
  const success = check(createResponse, {
    'ticket created': (r) => r.status === 200 || r.status === 201,
    'creation response time OK': (r) => r.timings.duration < 500,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Wait for notifications to be processed
  sleep(2);
  
  // Check notification count (if endpoint exists)
  const notifParams = { headers: authHeaders(LANDLORD_TOKEN) };
  const notifResponse = http.get(`${BASE_URL}/notifications?limit=10`, notifParams);
  
  check(notifResponse, {
    'notifications retrieved': (r) => r.status === 200,
  });
  
  sleep(3);
}

// Default function (runs if no scenario specified)
export default function() {
  searchTickets();
}

// Setup function - runs once at start
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log('Make sure you have test data seeded in the database');
  return { startTime: new Date() };
}

// Teardown function - runs once at end
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

# Test Plan: Medium-Priority Delivery

## Overview

This document outlines the test plan for search/filters, notification routing, bulk operations, and load testing features implemented in the property management platform.

## Test Objectives

1. Verify search and filtering functionality with various parameter combinations
2. Validate bulk operations with partial failure handling
3. Test notification routing and delivery
4. Measure system performance under load
5. Verify concurrency safety and idempotency

## Test Scenarios

### 1. Search and Filtering

#### 1.1 Basic Search
**Objective**: Verify full-text search on tickets

**Test Cases**:
- Search by title keyword (q=leak)
- Search by description keyword (q=boiler)
- Search with minimum character validation (q=ab should work, q=a should fail)
- Search with special characters
- Case-insensitive search

**Expected Results**:
- Returns tickets matching search term in title or description
- Validates minimum 2 characters for search query
- Returns 400 error for queries less than 2 characters
- Search is case-insensitive

#### 1.2 Filtering
**Objective**: Verify individual filter parameters

**Test Cases**:
- Filter by ticket ID
- Filter by category (plumbing, electrical, etc.)
- Filter by contractor_id
- Filter by status
- Filter by date_from
- Filter by date_to
- Filter by date range (date_from + date_to)

**Expected Results**:
- Each filter returns only matching tickets
- Multiple filters can be combined (AND logic)
- Empty result set if no matches
- Invalid filter values return appropriate errors

#### 1.3 Pagination
**Objective**: Verify pagination parameters

**Test Cases**:
- Default pagination (page=1, page_size=25)
- Custom page and page_size
- page_size exceeding maximum (should cap at 100)
- Large page numbers (beyond available data)
- page_size=1 (edge case)

**Expected Results**:
- Returns correct page of results
- page_size capped at 100
- has_next correctly indicates if more pages exist
- total count accurate
- Empty page returns items=[] but maintains pagination info

#### 1.4 Sorting
**Objective**: Verify sort functionality

**Test Cases**:
- Default sort (created_at desc)
- Sort by created_at asc/desc
- Sort by updated_at asc/desc
- Sort by status
- Sort by priority
- Sort by category

**Expected Results**:
- Results sorted correctly by specified field
- Default sort is created_at desc
- Invalid sort fields ignored or return error

#### 1.5 Combined Queries
**Objective**: Verify multiple parameters work together

**Test Cases**:
- q + category + status
- q + date_from + date_to + sort
- All parameters combined
- Complex query: `q=leak&category=plumbing&date_from=2024-01-01&page=2&page_size=10&sort_by=created_at&sort_dir=asc`

**Expected Results**:
- All filters applied correctly (AND logic)
- Pagination works with filtered results
- Sorting applies to filtered results
- Performance remains acceptable (<600ms)

### 2. Bulk Operations

#### 2.1 Bulk Assign
**Objective**: Test bulk ticket assignment

**Test Cases**:
- Assign 1 ticket
- Assign 10 tickets
- Assign 50 tickets (maximum)
- Assign 51 tickets (should fail)
- Assign to non-existent contractor
- Assign already closed tickets
- Idempotency key prevents duplicate operations

**Expected Results**:
- Successful assignments in ok array
- Failures in failed array with error messages
- Maximum 50 tickets enforced
- Returns 207 Multi-Status for partial failures
- Idempotent operations

#### 2.2 Bulk Close
**Objective**: Test bulk ticket closure

**Test Cases**:
- Close multiple open tickets
- Close already closed tickets (should fail)
- Close with resolution note
- Close without resolution note
- Idempotency with same key

**Expected Results**:
- Open tickets closed successfully
- Already closed tickets in failed array
- Resolution note recorded in timeline
- Idempotent behavior

#### 2.3 Bulk Reassign
**Objective**: Test bulk ticket reassignment

**Test Cases**:
- Reassign multiple tickets
- Reassign closed tickets (should fail)
- Reassign to same contractor
- Reassign to non-existent contractor

**Expected Results**:
- Active tickets reassigned successfully
- Closed tickets fail reassignment
- Timeline records reassignment

#### 2.4 Bulk Tag
**Objective**: Test bulk tag management

**Test Cases**:
- Add tags to tickets without tags
- Add tags to tickets with existing tags
- Remove tags from tickets
- Add and remove tags in same operation
- Tag with empty arrays (should fail)

**Expected Results**:
- Tags added successfully
- Tags removed successfully
- Duplicate tags not added
- Timeline records tag changes

#### 2.5 Bulk Category
**Objective**: Test bulk category update

**Test Cases**:
- Update category for multiple tickets
- Update to same category
- Update with invalid category

**Expected Results**:
- Category updated successfully
- Timeline records category change
- Old and new category in audit log

#### 2.6 Role-Based Access
**Objective**: Verify only OPS can perform bulk operations

**Test Cases**:
- LANDLORD attempts bulk operation (should fail)
- TENANT attempts bulk operation (should fail)
- CONTRACTOR attempts bulk operation (should fail)
- OPS performs bulk operation (should succeed)

**Expected Results**:
- Non-OPS roles receive 403 Forbidden
- OPS role can execute all bulk operations

### 3. Notification Routing

#### 3.1 Event Routing
**Objective**: Verify events route to correct channels

**Test Cases**:
- ticket.created → landlord + ops (in-app + email)
- ticket.assigned → contractor + tenant (email + in-app)
- quote.submitted → landlord + ops
- quote.approved → contractor + tenant
- ticket.closed → tenant + landlord + ops

**Expected Results**:
- Correct roles receive notifications
- Correct channels used (email, in-app, webhook)
- No duplicate notifications

#### 3.2 Notification Delivery
**Objective**: Verify notification delivery mechanisms

**Test Cases**:
- In-app notifications created in database
- Email notifications queued
- Webhook notifications sent
- Retry logic for failed deliveries
- Exponential backoff on retries

**Expected Results**:
- Notifications delivered within 5 seconds (p95)
- Failed deliveries retry with backoff
- Maximum retry attempts respected
- Dead letter queue for persistent failures

#### 3.3 Idempotency
**Objective**: Verify notification deduplication

**Test Cases**:
- Same event_type + entity_id + version
- Different versions of same entity

**Expected Results**:
- Duplicate events don't create duplicate notifications
- Version changes allow new notifications

#### 3.4 User Preferences
**Objective**: Verify per-user notification preferences

**Test Cases**:
- User disables email notifications
- User disables in-app notifications
- User enables all channels
- Org-level defaults

**Expected Results**:
- User preferences override org defaults
- Disabled channels not used
- Critical notifications still delivered

### 4. Load Testing

#### 4.1 Search Performance
**Objective**: Measure search query performance under load

**Test Parameters**:
- 10-200 requests/second (ramping)
- 50-100 concurrent users
- 5 minute duration
- Varied search queries

**Success Criteria**:
- p95 response time < 300ms (cached)
- p95 response time < 600ms (cold)
- Error rate < 0.5%
- All database indexes utilized

**Metrics to Collect**:
- Response times (p50, p95, p99)
- Throughput (requests/second)
- Error rates
- Database query times
- Cache hit rates

#### 4.2 Bulk Operations Performance
**Objective**: Measure bulk operation performance

**Test Parameters**:
- 30 concurrent VUs
- 5 minute duration
- Varied bulk operation types
- 10-50 tickets per operation

**Success Criteria**:
- p95 response time < 1000ms
- Error rate < 0.5%
- Successful partial failure handling
- Idempotency maintained

**Metrics to Collect**:
- Response times per operation type
- Success/failure ratios
- Database transaction times
- Lock contention

#### 4.3 Concurrent Quote Races
**Objective**: Test race conditions in quote approval

**Test Parameters**:
- 20-40 concurrent users
- Simultaneous quote submissions
- Simultaneous approvals
- 3 minute duration

**Success Criteria**:
- No duplicate approvals
- Concurrency conflicts handled gracefully
- Updated_at checks prevent lost updates
- Error rate < 0.5%

**Metrics to Collect**:
- Concurrent operation conflicts
- Retry counts
- Success rates
- Response time distribution

#### 4.4 Notification Fan-Out
**Objective**: Test notification delivery at scale

**Test Parameters**:
- 10 concurrent users creating tickets
- 5 minute duration
- Each ticket notifies 3-5 users

**Success Criteria**:
- All notifications delivered within 5s (p95)
- No notification loss
- Webhook retries successful
- Error rate < 0.5%

**Metrics to Collect**:
- Notification delivery time
- Queue depth
- Retry counts
- Webhook success rates

#### 4.5 Concurrent Operations During Search
**Objective**: Test system stability with mixed load

**Test Parameters**:
- 100 req/s search queries
- 30 concurrent bulk operations
- 20 ticket creations/updates
- 5 minute duration

**Success Criteria**:
- Search performance maintained
- Bulk operations complete successfully
- No deadlocks or timeouts
- Error rate < 0.5%

**Metrics to Collect**:
- Per-scenario performance
- Database connection pool usage
- Lock wait times
- Overall system stability

### 5. Database Performance

#### 5.1 Index Utilization
**Objective**: Verify indexes are used effectively

**Test Cases**:
- EXPLAIN ANALYZE for common queries
- Index usage statistics
- Full table scans (should be minimal)

**Expected Results**:
- created_at index used for date filters
- category index used for category filters
- assignedToId index used for contractor filters
- Composite indexes used for combined filters
- No full table scans on large tables

#### 5.2 Query Performance
**Objective**: Verify query execution times

**Test Cases**:
- 1,000 tickets per landlord
- 10 landlords
- Various filter combinations

**Expected Results**:
- All queries complete < 600ms
- Most queries < 300ms with indexes
- COUNT queries optimized
- Pagination queries use LIMIT/OFFSET efficiently

## Test Execution

### Prerequisites
1. Backend API running on localhost:4000 or specified BASE_URL
2. Database seeded with test data:
   - 10 landlords
   - 1,000+ tickets per landlord
   - Various ticket states
   - Multiple contractors
3. Authentication tokens configured:
   - LANDLORD_TOKEN
   - OPS_TOKEN
   - CONTRACTOR_TOKEN
4. k6 installed (https://k6.io/docs/get-started/installation/)

### Running Load Tests

```bash
# Install k6 (if not already installed)
# macOS: brew install k6
# Ubuntu: sudo snap install k6

# Run all scenarios
k6 run tests/load/k6-tickets.js \
  --env BASE_URL=http://localhost:4000/api \
  --env LANDLORD_TOKEN=<token> \
  --env OPS_TOKEN=<token> \
  --env CONTRACTOR_TOKEN=<token>

# Run specific scenario
k6 run tests/load/k6-tickets.js --scenario search

# Generate HTML report
k6 run tests/load/k6-tickets.js --out json=results.json
# Then use: https://k6.io/docs/results-output/real-time/

# Run with custom thresholds
k6 run tests/load/k6-tickets.js \
  --threshold http_req_duration=p(95)<500 \
  --threshold errors=rate<0.001
```

### Running Unit Tests

```bash
cd backend
npm test -- tickets.service.spec.ts
```

### Running Integration Tests

```bash
cd backend
npm run test:e2e
```

## Test Results Template

### Search Performance
- **Date**: [YYYY-MM-DD]
- **Environment**: [dev/staging/prod]
- **Data Volume**: [number of tickets/landlords]

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| p95 response time (cached) | < 300ms | XXXms | ✅/❌ |
| p95 response time (cold) | < 600ms | XXXms | ✅/❌ |
| Error rate | < 0.5% | X.XX% | ✅/❌ |
| Throughput | 200 req/s | XXX req/s | ✅/❌ |

### Bulk Operations
- **Date**: [YYYY-MM-DD]
- **Operations Tested**: [assign, close, reassign, tag, category]

| Operation | Success Rate | p95 Response Time | Issues |
|-----------|-------------|-------------------|---------|
| bulk/assign | XX% | XXXms | None/[issue] |
| bulk/close | XX% | XXXms | None/[issue] |
| bulk/reassign | XX% | XXXms | None/[issue] |
| bulk/tag | XX% | XXXms | None/[issue] |
| bulk/category | XX% | XXXms | None/[issue] |

### Notification Delivery
- **Date**: [YYYY-MM-DD]
- **Events Tested**: [ticket.created, quote.submitted, etc.]

| Event Type | Delivery Rate | p95 Latency | Channel Failures |
|-----------|--------------|-------------|------------------|
| ticket.created | XX% | XXXms | X email, X webhook |
| ticket.assigned | XX% | XXXms | X email, X webhook |
| quote.submitted | XX% | XXXms | X email, X webhook |
| quote.approved | XX% | XXXms | X email, X webhook |

## Known Issues and Limitations

1. **SQLite**: Full-text search performance may be limited compared to PostgreSQL with pg_trgm
2. **Concurrency**: SQLite serializes writes, may see contention under high concurrent write load
3. **Caching**: No Redis cache in test environment, may affect search performance
4. **Test Data**: Need sufficient test data for realistic load testing

## Recommendations

1. Add Redis caching for search queries to meet <300ms target
2. Consider PostgreSQL with pg_trgm extension for better full-text search
3. Implement connection pooling for high-concurrency scenarios
4. Add rate limiting per endpoint
5. Monitor database connection pool exhaustion
6. Add circuit breakers for external webhook calls

## Appendix

### Sample curl Commands

**Search with filters**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/tickets?q=leak&category=plumbing&page=1&page_size=25&sort_by=created_at&sort_dir=desc"
```

**Bulk assign**:
```bash
curl -X POST -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{"ticket_ids":["t1","t2"],"contractor_id":"c1"}' \
  http://localhost:4000/api/tickets/bulk/assign
```

**Bulk close**:
```bash
curl -X POST -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Idempotency-Key: unique-key-456" \
  -H "Content-Type: application/json" \
  -d '{"ticket_ids":["t3","t4"],"resolution_note":"Completed"}' \
  http://localhost:4000/api/tickets/bulk/close
```

### Database Queries for Verification

**Check index usage**:
```sql
EXPLAIN QUERY PLAN 
SELECT * FROM Ticket 
WHERE landlordId = 'landlord-123' 
  AND category = 'plumbing' 
  AND createdAt > '2024-01-01'
ORDER BY createdAt DESC;
```

**Check ticket distribution**:
```sql
SELECT landlordId, COUNT(*) as ticket_count
FROM Ticket
GROUP BY landlordId
ORDER BY ticket_count DESC;
```

**Check state distribution**:
```sql
SELECT status, COUNT(*) as count
FROM Ticket
GROUP BY status;
```

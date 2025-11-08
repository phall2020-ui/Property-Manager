# Testing Quick Reference Guide

## 🚀 Quick Start

### Install Dependencies

```bash
# Frontend
cd frontend-new
npm install --save-dev @vitest/coverage-v8
npx playwright install --with-deps

# Backend
cd backend
npm install --save-dev jest-junit
npx prisma generate
```

### Run All Tests

```bash
# Using the helper script
./run-tests.sh all

# Or manually
cd frontend-new && npm test
cd ../backend && npm test
```

## 📋 Test Commands

### Frontend (frontend-new/)

| Command | Description |
|---------|-------------|
| `npm test` | Run unit tests (non-watch) |
| `npm run test:unit` | Same as `npm test` |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run E2E tests (headless) |
| `npm run test:ui` | Run E2E tests (headed browser) |
| `npm run test:e2e:ui` | Run E2E tests (interactive UI) |

### Backend

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (non-watch) |
| `npm run test:unit` | Same as `npm test` |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run E2E tests (if configured) |

## 📊 Coverage Reports

### View Coverage

```bash
# Frontend
open frontend-new/coverage/index.html

# Backend
open backend/coverage/index.html
```

### Coverage Thresholds

- **Lines:** 80%
- **Branches:** 80%
- **Functions:** 80%
- **Statements:** 80%

## 🎭 E2E Test Scenarios

### Available Test Suites

**Frontend E2E:**
- `tests/e2e/auth-flow.spec.ts` - Authentication flows
- `tests/e2e/ticket-crud.spec.ts` - Ticket CRUD operations
- `tests/e2e/rbac-access.spec.ts` - Role-based access control
- `tests/e2e/smoke.spec.ts` - Smoke tests
- `tests/e2e/ticket-workflow.spec.ts` - Complete ticket workflow
- `tests/e2e/multi-tenancy-isolation.spec.ts` - Multi-tenancy tests

**Backend E2E:**
- `test/auth.e2e-spec.ts` - Authentication endpoints
- `test/tickets-functional.e2e-spec.ts` - Ticket system functional tests
- `test/properties.e2e-spec.ts` - Property management
- `test/tenancies-lifecycle.e2e-spec.ts` - Tenancy lifecycle

### Run Specific E2E Tests

```bash
# Frontend - Run specific test file
cd frontend-new
npx playwright test tests/e2e/auth-flow.spec.ts

# Backend - Run specific test file
cd backend
npm test -- test/auth.e2e-spec.ts
```

## 🔧 Test Configuration Files

- **Frontend Vitest:** `frontend-new/vitest.config.ts`
- **Frontend Playwright:** `frontend-new/playwright.config.ts`
- **Backend Jest:** `backend/jest.config.js`

## 📁 Test Files Structure

```
frontend-new/
├── tests/
│   ├── fixtures/          # Test data fixtures
│   │   ├── test-users.ts
│   │   └── test-data.ts
│   ├── mocks/             # API mocks (MSW)
│   │   └── handlers.ts
│   ├── e2e/               # E2E test suites
│   │   ├── auth-flow.spec.ts
│   │   ├── ticket-crud.spec.ts
│   │   └── rbac-access.spec.ts
│   └── setup.ts           # Test setup
│
backend/
├── test/
│   ├── fixtures/          # Test data fixtures
│   │   └── test-data.ts
│   ├── mocks/             # External service mocks
│   │   └── external-services.ts
│   ├── auth/              # Auth service tests
│   │   └── auth.service.spec.ts
│   └── *.e2e-spec.ts      # E2E test files
```

## 🧪 Test Data

### Test Users (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Landlord | `landlord@example.com` | `password123` |
| Tenant | `tenant@example.com` | `password123` |
| Contractor | `contractor@example.com` | `password123` |
| Ops | `ops@example.com` | `password123` |

### Seed Database

```bash
cd backend
npm run seed
```

## 🐛 Troubleshooting

### Tests Fail with "Module not found"

```bash
# Frontend
cd frontend-new
npm install --save-dev @vitest/coverage-v8

# Backend
cd backend
npm install --save-dev jest-junit
```

### E2E Tests Timeout

1. Ensure backend is running: `cd backend && npm run dev`
2. Check database is seeded: `cd backend && npm run seed`
3. Increase timeout in `playwright.config.ts`

### Coverage Below Threshold

1. View coverage report to identify gaps
2. Add tests for uncovered code
3. Adjust threshold if needed (not recommended)

### Playwright Browsers Not Installed

```bash
cd frontend-new
npx playwright install --with-deps
```

## 📈 CI/CD

### GitHub Actions Workflow

The CI pipeline (`.github/workflows/ci.yml`) runs:

1. **Frontend Check** - Lint, typecheck, unit tests, coverage
2. **Backend Tests** - Unit tests with coverage (PostgreSQL + Redis)
3. **E2E Tests** - Playwright tests (Chrome, Firefox, Safari)
4. **Lighthouse CI** - Performance audits

### View CI Artifacts

1. Go to GitHub Actions tab
2. Select workflow run
3. Download artifacts:
   - `frontend-coverage` - Frontend coverage HTML
   - `backend-coverage` - Backend coverage HTML
   - `playwright-report` - E2E test HTML report
   - `playwright-test-results` - Screenshots/videos

## 📝 Writing New Tests

### Frontend Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Component } from '@/components/Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Backend Unit Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Service } from './service';

describe('Service', () => {
  let service: Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Service, /* mocks */],
    }).compile();
    service = module.get<Service>(Service);
  });

  it('should work', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from 'axe-playwright';

test('should work', async ({ page }) => {
  await page.goto('/');
  // ... test actions
  
  // Accessibility check
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## 🎯 Best Practices

1. **Write tests first** - TDD approach
2. **Test edge cases** - Invalid inputs, error handling
3. **Keep tests isolated** - No dependencies between tests
4. **Use fixtures** - Reusable test data
5. **Mock external services** - Don't hit real APIs in tests
6. **Check accessibility** - Include axe checks in E2E tests
7. **Maintain coverage** - Keep above 80% threshold

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [axe-core Documentation](https://www.deque.com/axe/core-documentation/)


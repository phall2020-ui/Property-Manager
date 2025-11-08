# Testing Setup Verification Checklist

Use this checklist to verify that the testing infrastructure is properly set up and working.

## ✅ Pre-Installation Checklist

- [ ] Node.js 18+ installed
- [ ] npm or yarn available
- [ ] Git repository cloned
- [ ] Project dependencies installed (`npm ci` in both frontend-new and backend)

## 📦 Dependency Installation

### Frontend Dependencies
```bash
cd frontend-new
npm install --save-dev @vitest/coverage-v8
npx playwright install --with-deps
```

**Verify:**
- [ ] `@vitest/coverage-v8` appears in `package.json` devDependencies
- [ ] Playwright browsers installed (check `node_modules/.cache/playwright`)

### Backend Dependencies
```bash
cd backend
npm install --save-dev jest-junit
npx prisma generate
```

**Verify:**
- [ ] `jest-junit` appears in `package.json` devDependencies
- [ ] Prisma client generated (`node_modules/.prisma/client` exists)

## 🔧 Configuration Verification

### Frontend Configuration

**Check `frontend-new/vitest.config.ts`:**
- [ ] Coverage provider set to 'v8'
- [ ] Coverage thresholds set to 80%
- [ ] JUnit reporter configured
- [ ] Output directory set to './test-results'

**Check `frontend-new/playwright.config.ts`:**
- [ ] Multi-browser projects configured (chromium, firefox, webkit)
- [ ] webServer configured for frontend and backend
- [ ] Artifact collection enabled (trace, video, screenshot)
- [ ] JUnit reporter configured

**Check `frontend-new/package.json`:**
- [ ] `test` script: `vitest --run`
- [ ] `test:unit` script: `vitest --run`
- [ ] `test:watch` script: `vitest`
- [ ] `test:coverage` script: `vitest --run --coverage`
- [ ] `test:e2e` script: `playwright test`
- [ ] `test:ui` script: `playwright test --headed`
- [ ] `test:e2e:ui` script: `playwright test --ui`

### Backend Configuration

**Check `backend/jest.config.js`:**
- [ ] Coverage thresholds set to 80%
- [ ] jest-junit reporter configured
- [ ] Output directory set to './test-results'
- [ ] Coverage reporters include 'html', 'json', 'lcov', 'junit'

**Check `backend/package.json`:**
- [ ] `test` script: `jest --watch=false`
- [ ] `test:unit` script: `jest --watch=false`
- [ ] `test:watch` script: `jest --watch`
- [ ] `test:coverage` script: `jest --coverage`
- [ ] `test:e2e` script: `jest --config jest-e2e.config.js`

## 🧪 Test Execution Verification

### Frontend Unit Tests

```bash
cd frontend-new
npm test
```

**Verify:**
- [ ] Tests run without errors
- [ ] Test output shows passing tests
- [ ] No module resolution errors
- [ ] Coverage report generated (if applicable)

### Frontend Coverage

```bash
cd frontend-new
npm run test:coverage
```

**Verify:**
- [ ] Coverage report generated in `coverage/` directory
- [ ] HTML report available at `coverage/index.html`
- [ ] Coverage meets 80% threshold (or shows warnings if below)
- [ ] JUnit XML generated in `test-results/junit.xml`

### Backend Unit Tests

```bash
cd backend
npm test
```

**Verify:**
- [ ] Tests run without errors
- [ ] Test output shows passing tests
- [ ] Database connection works (if tests require DB)
- [ ] No module resolution errors

### Backend Coverage

```bash
cd backend
npm run test:coverage
```

**Verify:**
- [ ] Coverage report generated in `coverage/` directory
- [ ] HTML report available at `coverage/index.html`
- [ ] Coverage meets 80% threshold (or shows warnings if below)
- [ ] JUnit XML generated in `test-results/junit.xml`

### E2E Tests

**Prerequisites:**
- [ ] Backend database seeded: `cd backend && npm run seed`
- [ ] Backend can start: `cd backend && npm run dev` (test in separate terminal)

```bash
cd frontend-new
npm run test:e2e
```

**Verify:**
- [ ] Tests run across all browsers (chromium, firefox, webkit)
- [ ] Playwright automatically starts frontend and backend servers
- [ ] Tests complete without critical errors
- [ ] HTML report generated in `playwright-report/`
- [ ] JUnit XML generated in `test-results/junit-e2e.xml`
- [ ] Artifacts (screenshots, videos) saved on failures

## 📁 File Structure Verification

### Frontend Test Files

**Check existence:**
- [ ] `frontend-new/tests/setup.ts`
- [ ] `frontend-new/tests/fixtures/test-users.ts`
- [ ] `frontend-new/tests/fixtures/test-data.ts`
- [ ] `frontend-new/tests/mocks/handlers.ts`
- [ ] `frontend-new/tests/e2e/auth-flow.spec.ts`
- [ ] `frontend-new/tests/e2e/ticket-crud.spec.ts`
- [ ] `frontend-new/tests/e2e/rbac-access.spec.ts`

### Backend Test Files

**Check existence:**
- [ ] `backend/test/fixtures/test-data.ts`
- [ ] `backend/test/mocks/external-services.ts`
- [ ] `backend/test/auth/auth.service.spec.ts`
- [ ] `backend/test/auth.e2e-spec.ts` (existing)
- [ ] `backend/test/tickets-functional.e2e-spec.ts` (existing)

## 🔍 Test Content Verification

### Frontend E2E Tests

**Check `auth-flow.spec.ts`:**
- [ ] Login page accessibility check
- [ ] Successful login test
- [ ] Invalid credentials test
- [ ] Form validation test
- [ ] Logout test
- [ ] Role-based redirects test

**Check `ticket-crud.spec.ts`:**
- [ ] Create ticket test
- [ ] Form validation test
- [ ] View ticket list test
- [ ] View ticket details test
- [ ] Filter/search test

**Check `rbac-access.spec.ts`:**
- [ ] Landlord route access
- [ ] Tenant route restrictions
- [ ] Contractor route access
- [ ] Ops route access
- [ ] Unauthenticated redirect

### Backend Unit Tests

**Check `auth.service.spec.ts`:**
- [ ] Signup test
- [ ] Login test
- [ ] Token refresh test
- [ ] Error handling tests

## 📊 Coverage Verification

### Check Coverage Reports

```bash
# Frontend
open frontend-new/coverage/index.html

# Backend
open backend/coverage/index.html
```

**Verify:**
- [ ] HTML reports open correctly
- [ ] Coverage percentages displayed
- [ ] File-by-file breakdown available
- [ ] Line-by-line coverage shown
- [ ] Threshold indicators visible

### Coverage Thresholds

**Verify thresholds are enforced:**
- [ ] Tests fail if coverage below 80% (or show warnings)
- [ ] Threshold applies to: lines, branches, functions, statements

## 🚀 CI/CD Verification

### GitHub Actions Workflow

**Check `.github/workflows/ci.yml`:**

**Frontend Check Job:**
- [ ] Runs lint
- [ ] Runs typecheck
- [ ] Runs unit tests
- [ ] Runs coverage
- [ ] Uploads coverage artifacts
- [ ] Uploads test results

**Backend Test Job:**
- [ ] Sets up PostgreSQL service
- [ ] Sets up Redis service
- [ ] Runs migrations
- [ ] Runs tests with coverage
- [ ] Uploads coverage artifacts
- [ ] Uploads test results

**E2E Test Job:**
- [ ] Installs Playwright browsers
- [ ] Builds frontend
- [ ] Sets up backend services
- [ ] Starts backend server
- [ ] Runs E2E tests
- [ ] Uploads Playwright report
- [ ] Uploads test artifacts

## 📝 Documentation Verification

**Check documentation files exist:**
- [ ] `README.md` - Testing section present
- [ ] `TESTING_SETUP_COMPLETE.md`
- [ ] `TEST_ENVIRONMENT_SETUP.md`
- [ ] `TESTING_QUICK_REFERENCE.md`
- [ ] `TESTING_IMPLEMENTATION_SUMMARY.md`
- [ ] `run-tests.sh` - Executable script

## 🎯 Final Verification

### Quick Test Run

```bash
# Using helper script
./run-tests.sh all
```

**Verify:**
- [ ] Script executes without errors
- [ ] Frontend tests run
- [ ] Backend tests run
- [ ] Appropriate output messages
- [ ] Success message at end

### Manual Test Run

```bash
# Frontend
cd frontend-new
npm test
npm run test:coverage

# Backend
cd backend
npm test
npm run test:coverage
```

**Verify:**
- [ ] All commands execute successfully
- [ ] No critical errors
- [ ] Reports generated

## 🐛 Troubleshooting

If any item fails:

1. **Dependencies missing:**
   - Re-run `npm install` in respective directory
   - Check `package.json` for correct dependencies

2. **Configuration errors:**
   - Verify config files match examples in documentation
   - Check for syntax errors in config files

3. **Test failures:**
   - Review test output for specific errors
   - Check if database is seeded (backend tests)
   - Verify environment variables are set

4. **Coverage below threshold:**
   - Review coverage report to identify gaps
   - Add tests for uncovered code
   - Consider adjusting threshold if appropriate

## ✅ Completion Status

Once all items are checked:

- [ ] All dependencies installed
- [ ] All configurations verified
- [ ] All tests run successfully
- [ ] Coverage reports generated
- [ ] Documentation reviewed
- [ ] CI/CD workflow verified

**Status:** ✅ **READY FOR USE**

---

**Next Steps:**
1. Run `./run-tests.sh all` to verify everything works
2. Review coverage reports
3. Add additional tests as needed
4. Push to GitHub to trigger CI/CD


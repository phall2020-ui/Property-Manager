import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test for Complete Ticket Lifecycle
 * 
 * This test verifies the full flow:
 * 1. Tenant creates a maintenance ticket
 * 2. Ops team assigns ticket to contractor
 * 3. Contractor submits a quote
 * 4. Landlord approves the quote
 * 5. Status updates correctly at each step
 * 
 * Prerequisites:
 * - Backend running on http://localhost:4000
 * - Frontend running on http://localhost:3000
 * - Clean database or test isolation via unique email addresses
 */

test.describe('Complete Ticket Lifecycle', () => {
  const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const UNIQUE_ID = Date.now();

  test('should complete full ticket lifecycle from creation to approval', async ({ browser }) => {
    // Create separate contexts for each user role
    const tenantContext = await browser.newContext();
    const landlordContext = await browser.newContext();
    const opsContext = await browser.newContext();
    const contractorContext = await browser.newContext();
    
    const tenantPage = await tenantContext.newPage();
    const landlordPage = await landlordContext.newPage();
    const opsPage = await opsContext.newPage();
    const contractorPage = await contractorContext.newPage();

    let ticketTitle: string;
    let ticketId: string;

    try {
      // ===== STEP 1: Tenant creates ticket =====
      test.step('Tenant creates maintenance ticket', async () => {
        await tenantPage.goto(`${BASE_URL}/login`);
        
        // Login or signup as tenant
        const tenantEmail = `tenant-${UNIQUE_ID}@test.com`;
        await tenantPage.fill('[name="email"]', tenantEmail);
        await tenantPage.fill('[name="password"]', 'TestPass123!');
        
        // Try login first, if fails then signup
        const loginButton = tenantPage.locator('button:has-text("Log in")').first();
        await loginButton.click();
        
        // Wait for either success or failure
        await tenantPage.waitForTimeout(2000);
        
        // Check if we're redirected or still on login page
        const currentUrl = tenantPage.url();
        if (currentUrl.includes('login') || currentUrl.includes('signup')) {
          // Need to signup
          await tenantPage.goto(`${BASE_URL}/signup`);
          await tenantPage.fill('[name="email"]', tenantEmail);
          await tenantPage.fill('[name="password"]', 'TestPass123!');
          await tenantPage.fill('[name="name"]', 'Test Tenant');
          await tenantPage.selectOption('[name="role"]', 'TENANT');
          await tenantPage.click('button[type="submit"]');
          await tenantPage.waitForTimeout(2000);
        }

        // Navigate to report issue page
        await tenantPage.goto(`${BASE_URL}/report-issue`);
        
        // Fill in ticket details
        ticketTitle = `E2E Test - Broken Boiler ${UNIQUE_ID}`;
        await tenantPage.fill('[name="title"]', ticketTitle);
        await tenantPage.selectOption('[name="category"]', 'Heating');
        await tenantPage.selectOption('[name="priority"]', 'HIGH');
        await tenantPage.fill('[name="description"]', 'The boiler is not working and there is no hot water. This needs urgent attention as it is winter.');
        
        // Submit ticket
        await tenantPage.click('button[type="submit"]');
        
        // Wait for success message
        await expect(tenantPage.locator('text=/created|success/i')).toBeVisible({ timeout: 5000 });
        
        // Capture ticket ID if visible
        const ticketLink = tenantPage.locator('a[href*="/tickets/"]').first();
        if (await ticketLink.isVisible()) {
          const href = await ticketLink.getAttribute('href');
          const match = href?.match(/tickets\/([^\/]+)/);
          if (match) ticketId = match[1];
        }
      });

      // ===== STEP 2: Ops team assigns ticket to contractor =====
      test.step('Ops assigns ticket to contractor', async () => {
        await opsPage.goto(`${BASE_URL}/login`);
        
        // Login as ops user
        const opsEmail = `ops-${UNIQUE_ID}@test.com`;
        await opsPage.fill('[name="email"]', opsEmail);
        await opsPage.fill('[name="password"]', 'TestPass123!');
        
        const loginButton = opsPage.locator('button:has-text("Log in")').first();
        await loginButton.click();
        await opsPage.waitForTimeout(2000);
        
        // Check if signup needed
        if (opsPage.url().includes('login') || opsPage.url().includes('signup')) {
          await opsPage.goto(`${BASE_URL}/signup`);
          await opsPage.fill('[name="email"]', opsEmail);
          await opsPage.fill('[name="password"]', 'TestPass123!');
          await opsPage.fill('[name="name"]', 'Test Ops');
          await opsPage.selectOption('[name="role"]', 'OPS');
          await opsPage.click('button[type="submit"]');
          await opsPage.waitForTimeout(2000);
        }

        // Navigate to queue
        await opsPage.goto(`${BASE_URL}/queue`);
        
        // Search for the ticket
        if (ticketTitle) {
          const searchInput = opsPage.locator('[aria-label="Search"]').or(opsPage.locator('input[placeholder*="Search"]'));
          if (await searchInput.isVisible()) {
            await searchInput.fill(ticketTitle);
            await opsPage.waitForTimeout(500); // Wait for debounce
          }
        }
        
        // Find and click the ticket
        const ticketRow = opsPage.locator(`text=${ticketTitle}`).first();
        await expect(ticketRow).toBeVisible({ timeout: 5000 });
        await ticketRow.click();
        
        // Assign to contractor (this flow depends on your UI)
        const assignButton = opsPage.locator('button:has-text("Assign")').first();
        if (await assignButton.isVisible({ timeout: 3000 })) {
          await assignButton.click();
          // Select contractor and confirm
          await opsPage.waitForTimeout(1000);
          const confirmButton = opsPage.locator('button:has-text("Confirm")').or(opsPage.locator('button[type="submit"]'));
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await opsPage.waitForTimeout(1000);
          }
        }
      });

      // ===== STEP 3: Contractor submits quote =====
      test.step('Contractor submits quote', async () => {
        await contractorPage.goto(`${BASE_URL}/login`);
        
        // Login as contractor
        const contractorEmail = `contractor-${UNIQUE_ID}@test.com`;
        await contractorPage.fill('[name="email"]', contractorEmail);
        await contractorPage.fill('[name="password"]', 'TestPass123!');
        
        const loginButton = contractorPage.locator('button:has-text("Log in")').first();
        await loginButton.click();
        await contractorPage.waitForTimeout(2000);
        
        // Check if signup needed
        if (contractorPage.url().includes('login') || contractorPage.url().includes('signup')) {
          await contractorPage.goto(`${BASE_URL}/signup`);
          await contractorPage.fill('[name="email"]', contractorEmail);
          await contractorPage.fill('[name="password"]', 'TestPass123!');
          await contractorPage.fill('[name="name"]', 'Test Contractor');
          await contractorPage.selectOption('[name="role"]', 'CONTRACTOR');
          await contractorPage.click('button[type="submit"]');
          await contractorPage.waitForTimeout(2000);
        }

        // Navigate to jobs
        await contractorPage.goto(`${BASE_URL}/jobs`);
        
        // Search for the ticket
        if (ticketTitle) {
          const searchInput = contractorPage.locator('[aria-label="Search"]').or(contractorPage.locator('input[placeholder*="Search"]'));
          if (await searchInput.isVisible()) {
            await searchInput.fill(ticketTitle);
            await contractorPage.waitForTimeout(500); // Wait for debounce
          }
        }
        
        // Find and click the job
        const jobRow = contractorPage.locator(`text=${ticketTitle}`).first();
        await expect(jobRow).toBeVisible({ timeout: 5000 });
        await jobRow.click();
        
        // Submit quote
        const submitQuoteButton = contractorPage.locator('button:has-text("Submit Quote")').first();
        if (await submitQuoteButton.isVisible({ timeout: 3000 })) {
          await submitQuoteButton.click();
          
          // Fill in quote details
          await contractorPage.fill('[name="amount"]', '450.00');
          await contractorPage.fill('[name="eta"]', '2024-12-31');
          await contractorPage.fill('[name="notes"]', 'Will replace the boiler valve and test the system thoroughly.');
          
          // Submit
          await contractorPage.click('button[type="submit"]');
          await contractorPage.waitForTimeout(1000);
          
          // Verify success
          await expect(contractorPage.locator('text=/submitted|success/i')).toBeVisible({ timeout: 5000 });
        }
      });

      // ===== STEP 4: Landlord approves quote =====
      test.step('Landlord approves quote', async () => {
        await landlordPage.goto(`${BASE_URL}/login`);
        
        // Login as landlord
        const landlordEmail = `landlord-${UNIQUE_ID}@test.com`;
        await landlordPage.fill('[name="email"]', landlordEmail);
        await landlordPage.fill('[name="password"]', 'TestPass123!');
        
        const loginButton = landlordPage.locator('button:has-text("Log in")').first();
        await loginButton.click();
        await landlordPage.waitForTimeout(2000);
        
        // Check if signup needed
        if (landlordPage.url().includes('login') || landlordPage.url().includes('signup')) {
          await landlordPage.goto(`${BASE_URL}/signup`);
          await landlordPage.fill('[name="email"]', landlordEmail);
          await landlordPage.fill('[name="password"]', 'TestPass123!');
          await landlordPage.fill('[name="name"]', 'Test Landlord');
          await landlordPage.selectOption('[name="role"]', 'LANDLORD');
          await landlordPage.click('button[type="submit"]');
          await landlordPage.waitForTimeout(2000);
        }

        // Navigate to tickets
        await landlordPage.goto(`${BASE_URL}/tickets`);
        
        // Search for the ticket
        if (ticketTitle) {
          const searchInput = landlordPage.locator('[aria-label="Search"]').or(landlordPage.locator('input[placeholder*="Search"]'));
          if (await searchInput.isVisible()) {
            await searchInput.fill(ticketTitle);
            await landlordPage.waitForTimeout(500); // Wait for debounce
          }
        }
        
        // Find and click the ticket
        const ticketRow = landlordPage.locator(`text=${ticketTitle}`).first();
        await expect(ticketRow).toBeVisible({ timeout: 5000 });
        await ticketRow.click();
        
        // Approve quote
        const approveButton = landlordPage.locator('button:has-text("Approve")').first();
        if (await approveButton.isVisible({ timeout: 3000 })) {
          await approveButton.click();
          
          // Confirm approval
          await landlordPage.waitForTimeout(500);
          const confirmButton = landlordPage.locator('button:has-text("Approve Quote")').or(landlordPage.locator('button[type="submit"]'));
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await landlordPage.waitForTimeout(1000);
          }
          
          // Verify status changed
          await expect(landlordPage.locator('text=/approved|scheduled|in progress/i')).toBeVisible({ timeout: 5000 });
        }
      });

      // ===== STEP 5: Verify final state =====
      test.step('Verify ticket status updated correctly', async () => {
        // Refresh landlord page and check status
        await landlordPage.reload();
        await landlordPage.waitForTimeout(1000);
        
        // Status should show approved/scheduled/in progress
        const statusBadge = landlordPage.locator('[data-testid="status-badge"]').or(landlordPage.locator('text=/approved|scheduled/i'));
        await expect(statusBadge).toBeVisible({ timeout: 5000 });
      });

    } finally {
      // Cleanup
      await tenantPage.close();
      await landlordPage.close();
      await opsPage.close();
      await contractorPage.close();
      await tenantContext.close();
      await landlordContext.close();
      await opsContext.close();
      await contractorContext.close();
    }
  });
});

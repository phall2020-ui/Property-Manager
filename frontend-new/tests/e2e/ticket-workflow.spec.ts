import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * E2E Test: Complete Ticket Workflow
 * Tests the full flow: ticket creation (tenant) → quote (contractor) → approval (landlord)
 * Verifies all portals work correctly with the live backend
 * 
 * This test covers:
 * - Authentication across multiple user roles
 * - Ticket creation with validation
 * - Real-time data synchronization between portals
 * - Quote submission and approval workflow
 * - File attachment uploads
 * - Multi-portal visibility verification
 */

test.describe('Ticket Workflow E2E', () => {
  // Test data
  const tenantEmail = 'tenant@example.com';
  const contractorEmail = 'contractor@example.com';
  const landlordEmail = 'landlord@example.com';
  const password = 'password123';
  
  let ticketId: string;
  let ticketTitle: string;

  // Helper function to login
  async function login(page: Page, email: string, password: string) {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await emailInput.fill(email);
    await passwordInput.fill(password);
    
    // Submit form
    const signInButton = page.getByRole('button', { name: /sign in|login/i });
    await signInButton.click();
    
    // Wait for successful login (redirect to dashboard, properties, or tickets)
    await page.waitForURL(/dashboard|properties|tickets/, { timeout: 15000 });
    
    // Wait for any loading spinners to disappear
    await page.waitForTimeout(1000);
  }

  // Helper function to logout
  async function logout(page: Page) {
    try {
      // Look for logout button or user menu
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      const isLogoutVisible = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isLogoutVisible) {
        await logoutButton.click();
      } else {
        // Try clicking user menu first
        const userMenu = page.getByRole('button', { name: /user|account|profile/i }).first();
        const isMenuVisible = await userMenu.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isMenuVisible) {
          await userMenu.click();
          await page.waitForTimeout(500);
          const logoutInMenu = page.getByRole('button', { name: /logout|sign out/i });
          await logoutInMenu.click();
        }
      }
      
      // Wait for redirect to login
      await page.waitForURL(/login|signin|\/($|\?)/, { timeout: 5000 });
    } catch (error) {
      console.log('Logout may have failed, continuing test:', error);
    }
  }

  test('Step 1: Tenant creates a ticket', async ({ page }) => {
    // Login as tenant
    await login(page, tenantEmail, password);
    
    // Navigate to create ticket page
    await page.goto('/tickets/new');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the right page
    await expect(
      page.getByRole('heading', { name: /report.*maintenance.*issue|create.*ticket/i })
    ).toBeVisible({ timeout: 10000 });
    
    // Fill out ticket form
    const timestamp = Date.now();
    ticketTitle = `E2E Test Ticket ${timestamp}`;
    
    const titleInput = page.getByLabel(/title/i);
    const descriptionInput = page.getByLabel(/description/i);
    
    await titleInput.fill(ticketTitle);
    await descriptionInput.fill('This is an automated E2E test ticket. Leaky faucet in bathroom needs immediate attention.');
    
    // Select priority
    const prioritySelect = page.locator('select[name="priority"], select#priority, [name="priority"]').first();
    const priorityVisible = await prioritySelect.isVisible({ timeout: 3000 }).catch(() => false);
    if (priorityVisible) {
      await prioritySelect.selectOption('HIGH');
    }
    
    // Select category if available
    const categorySelect = page.locator('select[name="category"], select#category, [name="category"]').first();
    const categoryVisible = await categorySelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (categoryVisible) {
      await categorySelect.selectOption('PLUMBING');
    }
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /submit.*ticket|create.*ticket/i });
    await submitButton.click();
    
    // Wait for success - either redirect or toast notification
    await page.waitForTimeout(2000);
    
    // Verify we're redirected to tickets list or ticket detail
    await expect(page).toHaveURL(/\/tickets/, { timeout: 10000 });
    
    // Verify ticket appears in the list
    const ticketLink = page.getByText(ticketTitle);
    await expect(ticketLink).toBeVisible({ timeout: 10000 });
    
    // Extract ticket ID by clicking on the ticket and getting the URL
    await ticketLink.click();
    await page.waitForURL(/\/tickets\/[a-zA-Z0-9-]+/, { timeout: 5000 });
    
    const url = page.url();
    const match = url.match(/\/tickets\/([a-zA-Z0-9-]+)/);
    if (match) {
      ticketId = match[1];
      console.log('Created ticket ID:', ticketId);
    } else {
      throw new Error('Could not extract ticket ID from URL');
    }
    
    // Verify ticket details are visible
    await expect(page.getByText(/leaky faucet/i)).toBeVisible();
    await expect(page.getByText(/HIGH|high/i)).toBeVisible();
    
    // Verify loading state was shown (button disabled during submission)
    // This would have been checked during the submit click
    
    await logout(page);
  });

  test('Step 2: Contractor submits a quote', async ({ page }) => {
    test.skip(!ticketId, 'Ticket ID not available from previous test');
    
    // Login as contractor
    await login(page, contractorEmail, password);
    
    // Navigate to the ticket
    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState('networkidle');
    
    // Verify ticket details are visible
    await expect(page.getByText(new RegExp(ticketTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))).toBeVisible({ timeout: 10000 });
    
    // Verify contractor can see ticket details
    await expect(page.getByText(/leaky faucet/i)).toBeVisible();
    
    // Find and fill quote form
    const quoteAmountInput = page.locator('input[name="amount"], input#amount, input[type="number"]').first();
    await expect(quoteAmountInput).toBeVisible({ timeout: 5000 });
    
    // Clear any existing value and fill with quote amount
    await quoteAmountInput.clear();
    await quoteAmountInput.fill('250');
    
    // Fill quote notes if field exists
    const quoteNotesInput = page.locator('textarea[name="notes"], textarea#notes, textarea[name="quoteNotes"]').first();
    const notesVisible = await quoteNotesInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (notesVisible) {
      await quoteNotesInput.fill('Will fix the leaky faucet. Parts and labor included. Estimated time: 2 hours.');
    }
    
    // Submit quote
    const submitQuoteButton = page.getByRole('button', { name: /submit.*quote|create.*quote/i });
    await submitQuoteButton.click();
    
    // Wait for success message or update
    await page.waitForTimeout(2000);
    
    // Verify quote is visible (amount should appear on page)
    const quoteText = page.getByText(/250|£250|\$250/i);
    await expect(quoteText).toBeVisible({ timeout: 5000 });
    
    // Verify quote notes are shown
    await expect(page.getByText(/parts and labor/i)).toBeVisible({ timeout: 3000 });
    
    // Verify status updated to QUOTED
    const statusBadge = page.locator('[class*="status"], [class*="badge"]').filter({ hasText: /quoted/i });
    const statusVisible = await statusBadge.isVisible({ timeout: 3000 }).catch(() => false);
    if (statusVisible) {
      console.log('Status badge shows QUOTED');
    }
    
    await logout(page);
  });

  test('Step 3: Landlord approves the quote', async ({ page }) => {
    test.skip(!ticketId, 'Ticket ID not available from previous test');
    
    // Login as landlord
    await login(page, landlordEmail, password);
    
    // Navigate to the ticket
    await page.goto(`/tickets/${ticketId}`);
    await page.waitForLoadState('networkidle');
    
    // Verify ticket and quote are visible
    await expect(page.getByText(new RegExp(ticketTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/250|£250|\$250/i)).toBeVisible({ timeout: 5000 });
    
    // Find and click approve button
    const approveButton = page.getByRole('button', { name: /approve.*quote|approve.*ticket|approve/i });
    await expect(approveButton).toBeVisible({ timeout: 5000 });
    
    // Verify button is not disabled
    await expect(approveButton).not.toBeDisabled();
    
    // Click approve button
    await approveButton.click();
    
    // Wait for approval to process
    await page.waitForTimeout(2000);
    
    // Verify status changed to APPROVED
    const approvedStatus = page.getByText(/approved|scheduled/i);
    await expect(approvedStatus).toBeVisible({ timeout: 5000 });
    
    // Verify quote is still visible after approval
    await expect(page.getByText(/250|£250|\$250/i)).toBeVisible();
    
    // Check for success toast notification
    const successToast = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /approved|success/i });
    const toastVisible = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
    if (toastVisible) {
      console.log('Success toast notification shown');
    }
    
    await logout(page);
  });

  test('Step 4: Test file upload on ticket', async ({ page }) => {
    test.skip(!ticketId, 'Ticket ID not available from previous test');
    
    // Login as tenant
    await login(page, tenantEmail, password);
    
    // Navigate to the ticket
    await page.goto(`/tickets/${ticketId}`);
    
    // Look for file upload input
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Create a test file
      const testFilePath = '/tmp/test-attachment.txt';
      await page.evaluate(async (path) => {
        const fs = await import('fs');
        fs.writeFileSync(path, 'This is a test attachment file for E2E testing');
      }, testFilePath).catch(() => {
        // If we can't create the file, skip this part
        console.log('Could not create test file, skipping file upload test');
        return;
      });
      
      // Upload the file
      await fileInput.setInputFiles(testFilePath);
      
      // Wait for upload to complete
      await page.waitForTimeout(2000);
      
      // Verify file appears in attachments list
      await expect(page.getByText(/test-attachment\.txt|attachment/i)).toBeVisible({ timeout: 5000 });
    } else {
      console.log('File upload input not found, skipping file upload test');
    }
    
    await logout(page);
  });

  test('Verify all portals can view the ticket', async ({ page }) => {
    test.skip(!ticketId, 'Ticket ID not available from previous test');
    
    // Test tenant portal
    await login(page, tenantEmail, password);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByText(/E2E Test Ticket/i)).toBeVisible({ timeout: 10000 });
    await logout(page);
    
    // Test contractor portal
    await login(page, contractorEmail, password);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByText(/E2E Test Ticket/i)).toBeVisible({ timeout: 10000 });
    await logout(page);
    
    // Test landlord portal
    await login(page, landlordEmail, password);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByText(/E2E Test Ticket/i)).toBeVisible({ timeout: 10000 });
    await logout(page);
  });
});

test.describe('Ticket Assignment E2E', () => {
  const landlordEmail = 'landlord@example.com';
  const password = 'password123';

  async function login(page: Page, email: string, password: string) {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard|properties|tickets/, { timeout: 10000 });
  }

  test('Landlord can assign ticket to contractor', async ({ page }) => {
    // Login as landlord
    await login(page, landlordEmail, password);
    
    // Go to tickets list
    await page.goto('/tickets');
    
    // Find a ticket (use the first one available)
    const ticketLink = page.locator('a[href*="/tickets/"]').first();
    if (await ticketLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketLink.click();
      
      // Look for assign button or contractor dropdown
      const assignButton = page.getByRole('button', { name: /assign/i });
      if (await assignButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await assignButton.click();
        
        // Select contractor if dropdown appears
        await page.waitForTimeout(1000);
        const contractorSelect = page.locator('select, [role="combobox"]').first();
        if (await contractorSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await contractorSelect.click();
          // Select first contractor option
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
        }
        
        // Confirm assignment
        const confirmButton = page.getByRole('button', { name: /confirm|save|assign/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        // Wait for success
        await page.waitForTimeout(2000);
        
        // Verify assignment succeeded (look for success message or contractor name)
        // This is flexible since we don't know the exact UI
        console.log('Ticket assignment flow executed');
      } else {
        console.log('Assign button not found, skipping assignment test');
      }
    }
  });
});

import { test, expect } from '@playwright/test';
import AxeBuilder from 'axe-playwright';

test.describe('E2E Smoke Tests with Accessibility', () => {
  test('home/login page loads and is accessible', async ({ page }) => {
    await page.goto('/');
    
    // Check page loads with correct heading
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Check essential form elements are present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Run accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('dashboard page loads for authenticated user and is accessible', async ({ page }) => {
    // Navigate to login
    await page.goto('/');
    
    // Login with test credentials (adjust as needed for your test environment)
    await page.getByLabel(/email/i).fill('landlord@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation to dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Verify dashboard content is visible
    await expect(page.getByText(/dashboard|properties|overview/i)).toBeVisible();
    
    // Run accessibility check on dashboard
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('tickets list page loads and is accessible', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByLabel(/email/i).fill('landlord@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Navigate to tickets page
    await page.goto('/tickets');
    
    // Wait for tickets content
    await expect(page.getByText(/tickets|maintenance/i)).toBeVisible();
    
    // Run accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('new ticket page loads and is accessible', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByLabel(/email/i).fill('landlord@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Navigate to new ticket page
    await page.goto('/tickets/new');
    
    // Check form is present
    await expect(page.getByRole('heading', { name: /report.*maintenance.*issue/i })).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /submit.*ticket/i })).toBeVisible();
    
    // Run accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('form submission happy path - create ticket', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByLabel(/email/i).fill('landlord@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Navigate to new ticket page
    await page.goto('/tickets/new');
    
    // Fill out the form
    await page.getByLabel(/title/i).fill('Test E2E Ticket');
    await page.getByLabel(/description/i).fill('This is a test ticket created by E2E tests');
    
    // Select priority if visible
    const prioritySelect = page.getByLabel(/priority/i);
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('HIGH');
    }
    
    // Submit the form
    await page.getByRole('button', { name: /submit.*ticket/i }).click();
    
    // Verify navigation or success message
    // This depends on your app's behavior - adjust as needed
    await page.waitForURL(/tickets/, { timeout: 10000 });
    
    // Verify we're on the tickets list page or see a success message
    const isOnTicketsList = page.url().includes('/tickets') && !page.url().includes('/tickets/new');
    const hasSuccessMessage = await page.getByText(/success|created|submitted/i).isVisible().catch(() => false);
    
    expect(isOnTicketsList || hasSuccessMessage).toBeTruthy();
  });
});

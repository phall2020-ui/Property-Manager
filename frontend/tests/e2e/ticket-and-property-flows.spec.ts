import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Ticket Creation and Property Edit Flows
 * 
 * These tests verify:
 * 1. Tenant can create a ticket that appears in landlord's view
 * 2. Landlord can edit property and changes persist
 * 
 * Prerequisites:
 * - Backend running on http://localhost:3001
 * - Frontend running on http://localhost:3000
 * - Clean database or test isolation via unique email addresses
 */

test.describe('Tenant Ticket Creation → Landlord Visibility', () => {
  let landlordPage: Page;
  let tenantPage: Page;
  let landlordToken: string;
  let tenantToken: string;
  let propertyId: string;
  let tenancyId: string;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for landlord and tenant
    const landlordContext = await browser.newContext();
    const tenantContext = await browser.newContext();
    
    landlordPage = await landlordContext.newPage();
    tenantPage = await tenantContext.newPage();
  });

  test.afterAll(async () => {
    await landlordPage.close();
    await tenantPage.close();
  });

  test('should allow tenant to create ticket that landlord can see', async () => {
    // Step 1: Landlord signs up and creates property
    await landlordPage.goto('/signup');
    const landlordEmail = `landlord-${Date.now()}@example.com`;
    
    await landlordPage.fill('input[name="email"]', landlordEmail);
    await landlordPage.fill('input[name="password"]', 'password123');
    await landlordPage.fill('input[name="name"]', 'Test Landlord');
    await landlordPage.click('button[type="submit"]');
    
    // Wait for redirect after successful signup
    await landlordPage.waitForURL(/\/properties|\/dashboard/, { timeout: 5000 });
    
    // Create a property
    await landlordPage.goto('/properties');
    await landlordPage.click('text=Add Property');
    
    await landlordPage.fill('input[name="addressLine1"]', '123 Test Street');
    await landlordPage.fill('input[name="city"]', 'London');
    await landlordPage.fill('input[name="postcode"]', 'SW1A 1AA');
    await landlordPage.fill('input[name="bedrooms"]', '2');
    await landlordPage.click('button[type="submit"]');
    
    // Wait for property to be created and capture ID from URL or page
    await landlordPage.waitForTimeout(1000);
    const currentUrl = landlordPage.url();
    const propertyIdMatch = currentUrl.match(/properties\/([^\/]+)/);
    if (propertyIdMatch) {
      propertyId = propertyIdMatch[1];
    }

    // Step 2: Tenant signs up
    await tenantPage.goto('/signup');
    const tenantEmail = `tenant-${Date.now()}@example.com`;
    
    await tenantPage.fill('input[name="email"]', tenantEmail);
    await tenantPage.fill('input[name="password"]', 'password123');
    await tenantPage.fill('input[name="name"]', 'Test Tenant');
    await tenantPage.click('button[type="submit"]');
    
    await tenantPage.waitForURL(/\/my-tickets|\/dashboard/, { timeout: 5000 });

    // Step 3: Tenant creates a ticket
    await tenantPage.goto('/report-issue');
    
    await tenantPage.fill('input[name="propertyId"]', propertyId || 'test-property-id');
    await tenantPage.fill('input[name="title"]', 'Leaking kitchen tap');
    await tenantPage.selectOption('select[name="category"]', 'Plumbing');
    await tenantPage.selectOption('select[name="priority"]', 'STANDARD');
    await tenantPage.fill('textarea[name="description"]', 'The kitchen tap has been leaking for two days and needs urgent attention.');
    
    await tenantPage.click('button[type="submit"]');
    
    // Wait for success message
    await expect(tenantPage.locator('text=Ticket created successfully')).toBeVisible({ timeout: 3000 });

    // Step 4: Landlord checks tickets list (should see new ticket within 5 seconds)
    await landlordPage.goto('/tickets');
    
    // Wait for the ticket to appear (accounting for 5s refetch interval)
    await expect(landlordPage.locator('text=Leaking kitchen tap')).toBeVisible({ timeout: 10000 });
    
    // Verify ticket details are visible
    await expect(landlordPage.locator('text=Plumbing')).toBeVisible();
  });
});

test.describe('Landlord Property Edit Flow', () => {
  test('should allow landlord to edit property and persist changes', async ({ page }) => {
    // Setup: Landlord signs up
    await page.goto('/signup');
    const landlordEmail = `landlord-edit-${Date.now()}@example.com`;
    
    await page.fill('input[name="email"]', landlordEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="name"]', 'Edit Test Landlord');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/properties|\/dashboard/, { timeout: 5000 });

    // Create a property
    await page.goto('/properties');
    await page.click('text=Add Property');
    
    const originalAddress = '456 Original Street';
    const originalCity = 'Manchester';
    const originalPostcode = 'M1 1AA';
    
    await page.fill('input[name="addressLine1"]', originalAddress);
    await page.fill('input[name="city"]', originalCity);
    await page.fill('input[name="postcode"]', originalPostcode);
    await page.fill('input[name="bedrooms"]', '3');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);

    // Navigate to property detail and click edit
    const currentUrl = page.url();
    const propertyIdMatch = currentUrl.match(/properties\/([^\/]+)/);
    const propertyId = propertyIdMatch ? propertyIdMatch[1] : '';

    await page.click('text=Edit Property');
    await page.waitForURL(/\/properties\/.*\/edit/, { timeout: 3000 });

    // Edit property details
    const updatedAddress = '789 Updated Avenue';
    const updatedCity = 'Birmingham';
    const updatedPostcode = 'B1 1AA';
    
    await page.fill('input[name="addressLine1"]', updatedAddress);
    await page.fill('input[name="city"]', updatedCity);
    await page.fill('input[name="postcode"]', updatedPostcode);
    await page.fill('input[name="bedrooms"]', '4');
    await page.selectOption('select[name="attributes.propertyType"]', 'Flat');
    await page.selectOption('select[name="attributes.furnished"]', 'Full');

    // Save changes
    await page.click('button[type="submit"]:has-text("Save Changes")');

    // Wait for success message
    await expect(page.locator('text=Property updated successfully')).toBeVisible({ timeout: 3000 });

    // Verify redirect back to property detail page
    await page.waitForURL(/\/properties\/[^\/]+$/, { timeout: 3000 });

    // Verify updated values are displayed
    await expect(page.locator(`text=${updatedAddress}`)).toBeVisible();
    await expect(page.locator(`text=${updatedCity}`)).toBeVisible();
    await expect(page.locator(`text=${updatedPostcode}`)).toBeVisible();

    // Reload page to ensure changes persisted in database
    await page.reload();
    
    await expect(page.locator(`text=${updatedAddress}`)).toBeVisible();
    await expect(page.locator(`text=${updatedCity}`)).toBeVisible();
    await expect(page.locator(`text=${updatedPostcode}`)).toBeVisible();
  });

  test('should show validation error for invalid postcode', async ({ page }) => {
    // Setup: Landlord signs up and creates property
    await page.goto('/signup');
    const landlordEmail = `landlord-validation-${Date.now()}@example.com`;
    
    await page.fill('input[name="email"]', landlordEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="name"]', 'Validation Test Landlord');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/properties|\/dashboard/, { timeout: 5000 });

    // Create a property
    await page.goto('/properties');
    await page.click('text=Add Property');
    
    await page.fill('input[name="addressLine1"]', '123 Validation Street');
    await page.fill('input[name="city"]', 'London');
    await page.fill('input[name="postcode"]', 'SW1A 1AA');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);

    // Navigate to edit
    await page.click('text=Edit Property');
    await page.waitForURL(/\/properties\/.*\/edit/, { timeout: 3000 });

    // Try to save with invalid postcode
    await page.fill('input[name="postcode"]', 'INVALID');
    await page.click('button[type="submit"]:has-text("Save Changes")');

    // Should see validation error (either client-side or server-side)
    await expect(
      page.locator('text=/invalid.*postcode|postcode.*invalid/i')
    ).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Error Handling', () => {
  test('should prevent tenant from editing property', async ({ page }) => {
    // Setup: Tenant signs up
    await page.goto('/signup');
    const tenantEmail = `tenant-forbidden-${Date.now()}@example.com`;
    
    await page.fill('input[name="email"]', tenantEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="name"]', 'Forbidden Test Tenant');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/my-tickets|\/dashboard/, { timeout: 5000 });

    // Try to navigate to a property edit page (should be blocked)
    await page.goto('/properties/some-property-id/edit');
    
    // Should see error or be redirected
    await page.waitForTimeout(1000);
    
    // Either shows 403 error or redirects away from edit page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/edit');
  });
});

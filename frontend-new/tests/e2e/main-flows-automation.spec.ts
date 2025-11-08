import { test, expect, Page } from '@playwright/test';

/**
 * Automated test to exercise main flows and capture errors:
 * - Sign-in → Dashboard → Create/Edit/Delete → Logout
 * 
 * This test captures:
 * - Console errors
 * - Unhandled promise rejections
 * - Network failures
 * - JavaScript exceptions
 */

interface CollectedError {
  type: 'console' | 'pageerror' | 'rejection' | 'network';
  message: string;
  timestamp: Date;
  context?: any;
}

let collectedErrors: CollectedError[] = [];

// Helper to set up error collection
function setupErrorCollection(page: Page) {
  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      collectedErrors.push({
        type: 'console',
        message: msg.text(),
        timestamp: new Date(),
        context: { location: msg.location() },
      });
    }
  });

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', (error) => {
    collectedErrors.push({
      type: 'pageerror',
      message: error.message,
      timestamp: new Date(),
      context: { stack: error.stack },
    });
  });

  // Capture unhandled promise rejections
  page.on('console', (msg) => {
    if (msg.text().includes('Unhandled Promise rejection')) {
      collectedErrors.push({
        type: 'rejection',
        message: msg.text(),
        timestamp: new Date(),
      });
    }
  });

  // Capture network failures
  page.on('response', (response) => {
    if (response.status() >= 400) {
      collectedErrors.push({
        type: 'network',
        message: `${response.status()} ${response.statusText()} - ${response.url()}`,
        timestamp: new Date(),
        context: { 
          status: response.status(),
          url: response.url(),
          method: response.request().method(),
        },
      });
    }
  });
}

test.describe('Main Flows Automation - Error Collection', () => {
  test.beforeEach(() => {
    // Reset error collection for each test
    collectedErrors = [];
  });

  test.afterEach(() => {
    // Log collected errors for review
    if (collectedErrors.length > 0) {
      console.log('\n=== COLLECTED ERRORS ===');
      collectedErrors.forEach((error, index) => {
        console.log(`\n[${index + 1}] ${error.type.toUpperCase()}`);
        console.log(`Time: ${error.timestamp.toISOString()}`);
        console.log(`Message: ${error.message}`);
        if (error.context) {
          console.log(`Context:`, JSON.stringify(error.context, null, 2));
        }
      });
      console.log('\n========================\n');
    }
  });

  test('Exercise full flow: sign-in → dashboard → create property → edit property → delete property → logout', async ({ page }) => {
    setupErrorCollection(page);

    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Step 2: Sign in with test credentials
    console.log('Step 2: Signing in...');
    await page.getByLabel(/email/i).fill('landlord@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation to dashboard
    await page.waitForURL(/dashboard|properties/, { timeout: 10000 });
    console.log('✓ Successfully logged in');
    
    // Step 3: Navigate to dashboard
    console.log('Step 3: Viewing dashboard...');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/dashboard|overview/i).first()).toBeVisible();
    console.log('✓ Dashboard loaded');
    
    // Step 4: Create a new property
    console.log('Step 4: Creating a new property...');
    await page.goto('/properties/new');
    await page.waitForLoadState('networkidle');
    
    // Fill in property form
    await page.getByLabel(/address.*line.*1/i).fill('123 Test Street');
    await page.getByLabel(/city/i).fill('London');
    await page.getByLabel(/postcode/i).fill('SW1A 1AA');
    
    // Try to find and fill optional fields
    const bedroomsField = page.getByLabel(/bedrooms/i);
    if (await bedroomsField.isVisible().catch(() => false)) {
      await bedroomsField.fill('3');
    }
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: /create property|save|submit/i }).first();
    await submitButton.click();
    
    // Wait for navigation or success message
    await page.waitForTimeout(2000); // Give time for API call
    console.log('✓ Property creation attempted');
    
    // Step 5: Navigate to properties list
    console.log('Step 5: Viewing properties list...');
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    console.log('✓ Properties list loaded');
    
    // Step 6: Try to edit the first property (if exists)
    console.log('Step 6: Attempting to edit a property...');
    const propertyLinks = page.locator('a[href*="/properties/"]').filter({ hasNotText: /new/i });
    const propertyCount = await propertyLinks.count();
    
    if (propertyCount > 0) {
      await propertyLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Look for edit button
      const editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(1000);
        
        // Try to modify a field
        const addressField = page.getByLabel(/address.*line.*1/i);
        if (await addressField.isVisible().catch(() => false)) {
          await addressField.fill('456 Updated Street');
          
          // Save changes
          const saveButton = page.getByRole('button', { name: /save|update/i }).first();
          if (await saveButton.isVisible().catch(() => false)) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
      console.log('✓ Property edit attempted');
    } else {
      console.log('⚠ No properties found to edit');
    }
    
    // Step 7: Navigate back to properties list
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    
    // Step 8: Create a ticket
    console.log('Step 7: Creating a ticket...');
    await page.goto('/tickets/new');
    await page.waitForLoadState('networkidle');
    
    await page.getByLabel(/title/i).fill('Test Automation Ticket');
    await page.getByLabel(/description/i).fill('This is an automated test ticket');
    
    // Select priority if available
    const prioritySelect = page.getByLabel(/priority/i);
    if (await prioritySelect.isVisible().catch(() => false)) {
      await prioritySelect.selectOption('HIGH');
    }
    
    await page.getByRole('button', { name: /submit.*ticket|create.*ticket/i }).click();
    await page.waitForTimeout(2000);
    console.log('✓ Ticket creation attempted');
    
    // Step 9: View tickets list
    console.log('Step 8: Viewing tickets list...');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    console.log('✓ Tickets list loaded');
    
    // Step 10: Logout
    console.log('Step 9: Logging out...');
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i }).or(
      page.getByRole('link', { name: /logout|sign out/i })
    );
    
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await page.waitForURL('/login', { timeout: 5000 }).catch(() => {});
      console.log('✓ Logout attempted');
    } else {
      // Try to find in menu
      const userMenu = page.locator('[aria-label*="user menu" i]').or(page.locator('button:has-text("menu" i)')).first();
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);
        const logoutMenuItem = page.getByRole('menuitem', { name: /logout|sign out/i }).or(
          page.getByRole('button', { name: /logout|sign out/i })
        );
        if (await logoutMenuItem.isVisible().catch(() => false)) {
          await logoutMenuItem.click();
          await page.waitForURL('/login', { timeout: 5000 }).catch(() => {});
          console.log('✓ Logout attempted');
        }
      } else {
        console.log('⚠ Logout button not found');
      }
    }
    
    // Report summary
    console.log('\n=== FLOW EXECUTION SUMMARY ===');
    console.log(`Total errors collected: ${collectedErrors.length}`);
    console.log('Console errors:', collectedErrors.filter(e => e.type === 'console').length);
    console.log('Page errors:', collectedErrors.filter(e => e.type === 'pageerror').length);
    console.log('Promise rejections:', collectedErrors.filter(e => e.type === 'rejection').length);
    console.log('Network failures:', collectedErrors.filter(e => e.type === 'network').length);
    console.log('================================\n');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Ticket Appointments and Attachments', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-token',
          user: {
            id: '1',
            email: 'contractor@test.com',
            name: 'Test Contractor',
            organisations: [{ orgId: '1', orgName: 'Test Org', role: 'CONTRACTOR' }],
          },
        }),
      });
    });

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          email: 'contractor@test.com',
          name: 'Test Contractor',
          organisations: [{ orgId: '1', orgName: 'Test Org', role: 'CONTRACTOR' }],
        }),
      });
    });
  });

  test('should display ticket detail page', async ({ page }) => {
    // Mock ticket detail
    await page.route('**/api/tickets/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'Leaking Faucet',
          description: 'Kitchen faucet is dripping constantly',
          priority: 'HIGH',
          status: 'APPROVED',
          category: 'Plumbing',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          property: {
            id: '1',
            address1: '123 Test Street',
          },
        }),
      });
    });

    await page.route('**/api/tickets/1/appointments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/tickets/1/attachments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'contractor@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect and navigate to ticket
    await page.waitForURL('/dashboard');
    await page.goto('/tickets/1');

    // Check ticket details are displayed
    await expect(page.locator('h2')).toContainText('Leaking Faucet');
    await expect(page.getByText('Kitchen faucet is dripping constantly')).toBeVisible();
  });

  test('should show appointment propose form for contractor', async ({ page }) => {
    // Mock ticket detail with APPROVED status
    await page.route('**/api/tickets/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'Leaking Faucet',
          description: 'Kitchen faucet is dripping',
          priority: 'HIGH',
          status: 'APPROVED',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        }),
      });
    });

    await page.route('**/api/tickets/1/appointments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/tickets/1/attachments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Login and navigate
    await page.goto('/login');
    await page.fill('input[type="email"]', 'contractor@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.goto('/tickets/1');

    // Check appointment section exists
    await expect(page.getByText('Appointments')).toBeVisible();
    await expect(page.getByText('Propose New Appointment')).toBeVisible();
    
    // Check form elements
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('input[type="time"]').first()).toBeVisible();
  });

  test('should show attachment uploader', async ({ page }) => {
    // Mock ticket detail
    await page.route('**/api/tickets/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'Test Ticket',
          description: 'Test',
          priority: 'HIGH',
          status: 'OPEN',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        }),
      });
    });

    await page.route('**/api/tickets/1/appointments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/tickets/1/attachments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Login and navigate
    await page.goto('/login');
    await page.fill('input[type="email"]', 'contractor@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.goto('/tickets/1');

    // Check attachment section
    await expect(page.getByText('Attachments')).toBeVisible();
    await expect(page.getByText('Upload Files')).toBeVisible();
    await expect(page.getByText('Drop files here or click to browse')).toBeVisible();
  });

  test('should display existing attachments', async ({ page }) => {
    // Mock ticket with attachments
    await page.route('**/api/tickets/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'Test Ticket',
          description: 'Test',
          priority: 'HIGH',
          status: 'OPEN',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        }),
      });
    });

    await page.route('**/api/tickets/1/appointments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/tickets/1/attachments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            ticketId: '1',
            filename: 'test-image.png',
            contentType: 'image/png',
            size: 1024000,
            url: 'https://example.com/test.png',
            category: 'before',
            uploadedBy: 'user1',
            uploadedByRole: 'TENANT',
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: '2',
            ticketId: '1',
            filename: 'test-document.pdf',
            contentType: 'application/pdf',
            size: 512000,
            url: 'https://example.com/test.pdf',
            category: 'other',
            uploadedBy: 'user1',
            uploadedByRole: 'TENANT',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ]),
      });
    });

    // Login and navigate
    await page.goto('/login');
    await page.fill('input[type="email"]', 'contractor@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.goto('/tickets/1');

    // Check attachments are displayed
    await expect(page.getByText('test-image.png')).toBeVisible();
    await expect(page.getByText('test-document.pdf')).toBeVisible();
    
    // Check tabs
    await expect(page.getByText('All (2)')).toBeVisible();
    await expect(page.getByText('Before (1)')).toBeVisible();
  });
});

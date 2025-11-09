import { test, expect } from '@playwright/test';

test.describe('Authentication Flow and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should handle 401 and attempt token refresh successfully', async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-access-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
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
          email: 'test@example.com',
          name: 'Test User',
        }),
      });
    });

    // Navigate to login page
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 5000 });

    // Now simulate a 401 response followed by successful refresh
    let requestCount = 0;
    await page.route('**/api/properties', async (route) => {
      requestCount++;
      
      if (requestCount === 1) {
        // First request returns 401
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            title: 'Unauthorized',
            status: 401,
          }),
        });
      } else {
        // Subsequent requests succeed
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            total: 0,
            page: 1,
            pageSize: 10,
          }),
        });
      }
    });

    // Mock refresh token endpoint
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'new-mock-access-token',
        }),
      });
    });

    // Navigate to properties page to trigger the API call
    await page.goto('/properties');

    // Should not redirect to login (refresh should succeed)
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/.*\/properties/);
    
    // Verify that refresh was called and retry happened
    expect(requestCount).toBeGreaterThan(1);
  });

  test('should redirect to login when refresh fails', async ({ page }) => {
    // Mock the API responses
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-access-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
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
          email: 'test@example.com',
          name: 'Test User',
        }),
      });
    });

    // Navigate to login page
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 5000 });

    // Simulate a 401 response
    await page.route('**/api/properties', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Unauthorized',
          status: 401,
        }),
      });
    });

    // Mock refresh token endpoint to fail
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Refresh token expired',
          status: 401,
        }),
      });
    });

    // Navigate to properties page to trigger the API call
    await page.goto('/properties');

    // Should redirect to login when refresh fails
    await page.waitForURL(/.*\/login/, { timeout: 5000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Simulate network error
    await page.route('**/api/auth/login', async (route) => {
      await route.abort('failed');
    });

    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait a moment for error handling
    await page.waitForTimeout(1000);
    
    // Should still be on login page
    await expect(page).toHaveURL(/.*\/login/);
  });
});

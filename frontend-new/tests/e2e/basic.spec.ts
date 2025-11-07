import { test, expect } from '@playwright/test';

test.describe('Basic navigation', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('should navigate to dashboard after login', async ({ page }) => {
    await page.goto('/');
    
    // Fill in login form (this assumes test credentials exist)
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /login/i }).click();
    
    // Check for redirect to dashboard (adjust based on actual behavior)
    await expect(page).toHaveURL(/dashboard/);
  });
});

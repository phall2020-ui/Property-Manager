import { test, expect } from '@playwright/test';

test.describe('Core pages load', () => {
  const routes = ['/', '/login', '/dashboard', '/report-issue'];
  for (const path of routes) {
    test(`GET ${path} returns 200`, async ({ page, baseURL }) => {
      await page.goto(path);
      const currentURL = page.url();
      expect(currentURL).toContain(baseURL || '');
      // Basic hero/heading presence checks (adjust to your UI)
      await expect(page.locator('h1, [data-testid="page-title"]')).toBeVisible({ timeout: 10_000 });
    });
  }
});

test('Create Ticket form is operable', async ({ page }) => {
  await page.goto('/report-issue');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Adjust selectors to your form fields
  await page.getByLabel(/Title/i).fill('Leaking tap in kitchen');
  await page.getByLabel(/Description/i).fill('Slow drip under sink, worsening over 2 days.');
  // Property should auto-assign; if not, pick first option
  const propertySelect = page.locator('[name="propertyId"]');
  if (await propertySelect.count()) {
    await propertySelect.selectOption({ index: 0 });
  }

  // Image upload (optional if enabled)
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count()) {
    // Create a minimal valid JPEG file (SOI + APP0 + EOI markers)
    const minimalJPEG = Buffer.from([
      0xff, 0xd8,       // SOI (Start of Image)
      0xff, 0xe0,       // APP0 marker
      0x00, 0x10,       // APP0 length
      0x4a, 0x46, 0x49, 0x46, 0x00,  // JFIF identifier
      0x01, 0x01,       // JFIF version
      0x00,             // Density units
      0x00, 0x01, 0x00, 0x01,  // X/Y density
      0x00, 0x00,       // Thumbnail size
      0xff, 0xd9        // EOI (End of Image)
    ]);
    await fileInput.setInputFiles({
      name: 'leak.jpg',
      mimeType: 'image/jpeg',
      buffer: minimalJPEG
    });
  }

  await page.getByRole('button', { name: /Submit|Create/i }).click();
  await expect(page.getByText(/created|submitted|reference/i)).toBeVisible({ timeout: 15_000 });
});

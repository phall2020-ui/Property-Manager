import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

const pages = ['/', '/login', '/dashboard', '/report-issue'];

for (const path of pages) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } },
    });
  });
}

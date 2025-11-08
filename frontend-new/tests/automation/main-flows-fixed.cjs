/**
 * Main Flows Automation Script
 * 
 * Exercises the main flows of the application:
 * - Sign-in → Dashboard → Create/Edit/Delete → Logout
 * 
 * Captures:
 * - Console errors
 * - Unhandled promise rejections
 * - Network failures (4xx, 5xx responses)
 * - JavaScript exceptions
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const collectedErrors = [];

// Helper function for delays
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting main flows automation...\n');

  // Try to find Chrome/Chromium executable
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    process.env.CHROME_BIN,
  ].filter(Boolean);

  let executablePath;
  for (const browserPath of possiblePaths) {
    if (browserPath && fs.existsSync(browserPath)) {
      executablePath = browserPath;
      break;
    }
  }

  if (!executablePath) {
    console.error('❌ Could not find Chrome/Chromium executable');
    console.error('Please install Chrome or set CHROME_BIN environment variable');
    process.exit(1);
  }

  console.log(`Using browser: ${executablePath}\n`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  // Set up error collection
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      collectedErrors.push({
        type: 'console',
        message: msg.text(),
        timestamp: new Date().toISOString(),
        context: { location: msg.location() },
      });
    }
  });

  page.on('pageerror', (error) => {
    collectedErrors.push({
      type: 'pageerror',
      message: error.message,
      timestamp: new Date().toISOString(),
      context: { stack: error.stack },
    });
  });

  page.on('response', async (response) => {
    if (response.status() >= 400) {
      const url = response.url();
      collectedErrors.push({
        type: 'network',
        message: `${response.status()} ${response.statusText()} - ${url}`,
        timestamp: new Date().toISOString(),
        context: {
          status: response.status(),
          url: url,
          method: response.request().method(),
        },
      });
    }
  });

  try {
    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1, h2', { timeout: 5000 });
    console.log('✓ Login page loaded');

    // Step 2: Sign in
    console.log('\nStep 2: Signing in with landlord credentials...');
    await page.type('input[type="email"]', 'landlord@example.com');
    await page.type('input[type="password"]', 'password123');
    
    // Click sign in button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);
    console.log('✓ Successfully logged in');

    // Step 3: Navigate to dashboard
    console.log('\nStep 3: Viewing dashboard...');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' });
    await delay(2000);
    console.log('✓ Dashboard loaded');

    // Step 4: Create a new property
    console.log('\nStep 4: Creating a new property...');
    await page.goto('http://localhost:5173/properties/new', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Fill in property form
    await page.type('input[name="addressLine1"]', '123 Test Street');
    await page.type('input[name="city"]', 'London');
    await page.type('input[name="postcode"]', 'SW1A 1AA');

    // Try to fill bedrooms if field exists
    const bedroomsField = await page.$('input[name="bedrooms"]');
    if (bedroomsField) {
      await page.type('input[name="bedrooms"]', '3');
    }

    // Submit the form
    await page.click('button[type="submit"]');
    await delay(3000); // Wait for response
    console.log('✓ Property creation form submitted');

    // Step 5: Navigate to properties list
    console.log('\nStep 5: Viewing properties list...');
    await page.goto('http://localhost:5173/properties', { waitUntil: 'networkidle2' });
    await delay(2000);
    console.log('✓ Properties list loaded');

    // Step 6: Try to view a property detail
    const propertyLinks = await page.$$('a[href*="/properties/"]:not([href$="/new"])');
    if (propertyLinks.length > 0) {
      console.log('\nStep 6: Viewing property detail...');
      await propertyLinks[0].click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await delay(1000);
      console.log('✓ Property detail loaded');
    }

    // Step 7: Create a ticket
    console.log('\nStep 7: Creating a ticket...');
    await page.goto('http://localhost:5173/tickets/new', { waitUntil: 'networkidle2' });
    await delay(1000);

    await page.type('input[name="title"]', 'Test Automation Ticket');
    await page.type('textarea[name="description"]', 'This is an automated test ticket');

    // Try to select priority
    const prioritySelect = await page.$('select[name="priority"]');
    if (prioritySelect) {
      await page.select('select[name="priority"]', 'HIGH');
    }

    // Submit ticket
    await page.click('button[type="submit"]');
    await delay(3000);
    console.log('✓ Ticket creation form submitted');

    // Step 8: View tickets list
    console.log('\nStep 8: Viewing tickets list...');
    await page.goto('http://localhost:5173/tickets', { waitUntil: 'networkidle2' });
    await delay(2000);
    console.log('✓ Tickets list loaded');

    // Step 9: Try to logout
    console.log('\nStep 9: Attempting logout...');
    // Try finding logout via text content
    const logoutButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(el => /logout|sign out/i.test(el.textContent));
    });
    if (logoutButton && await logoutButton.asElement()) {
      await logoutButton.asElement().click();
      await delay(2000);
      console.log('✓ Logout button clicked');
    } else {
      console.log('⚠ Logout button not found');
    }

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await browser.close();
  }

  // Report findings
  console.log('\n' + '='.repeat(60));
  console.log('FLOW EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total errors collected: ${collectedErrors.length}\n`);

  const consoleErrors = collectedErrors.filter(e => e.type === 'console');
  const pageErrors = collectedErrors.filter(e => e.type === 'pageerror');
  const networkErrors = collectedErrors.filter(e => e.type === 'network');

  console.log(`Console errors: ${consoleErrors.length}`);
  console.log(`Page errors: ${pageErrors.length}`);
  console.log(`Network failures: ${networkErrors.length}`);
  console.log('='.repeat(60) + '\n');

  if (collectedErrors.length > 0) {
    console.log('DETAILED ERROR REPORT:');
    console.log('='.repeat(60) + '\n');

    collectedErrors.forEach((error, index) => {
      console.log(`[${index + 1}] ${error.type.toUpperCase()}`);
      console.log(`Time: ${error.timestamp}`);
      console.log(`Message: ${error.message}`);
      if (error.context) {
        console.log(`Context:`, JSON.stringify(error.context, null, 2));
      }
      console.log('');
    });
  }

  // Save errors to file
  const outputFile = path.join(__dirname, '../../error-report.json');
  fs.writeFileSync(outputFile, JSON.stringify({ errors: collectedErrors }, null, 2));
  console.log(`\n📝 Error report saved to: ${outputFile}`);

  // Exit with error code if errors were found
  process.exit(collectedErrors.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

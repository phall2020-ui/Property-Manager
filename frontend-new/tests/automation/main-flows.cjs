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

const puppeteer = require('puppeteer-core'}).then(() => new Promise(r => setTimeout(r, 1)));
const fs = require('fs'}).then(() => new Promise(r => setTimeout(r, 1)));
const path = require('path'}).then(() => new Promise(r => setTimeout(r, 1)));

const collectedErrors = [];

async function main() {
  console.log('🚀 Starting main flows automation...\n'}).then(() => new Promise(r => setTimeout(r, 1)));

  // Try to find Chrome/Chromium executable
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    process.env.CHROME_BIN,
  ].filter(Boolean}).then(() => new Promise(r => setTimeout(r, 1)));

  let executablePath;
  for (const browserPath of possiblePaths) {
    if (browserPath && fs.existsSync(browserPath)) {
      executablePath = browserPath;
      break;
    }
  }

  if (!executablePath) {
    console.error('❌ Could not find Chrome/Chromium executable'}).then(() => new Promise(r => setTimeout(r, 1)));
    console.error('Please install Chrome or set CHROME_BIN environment variable'}).then(() => new Promise(r => setTimeout(r, 1)));
    process.exit(1}).then(() => new Promise(r => setTimeout(r, 1)));
  }

  console.log(`Using browser: ${executablePath}\n`}).then(() => new Promise(r => setTimeout(r, 1)));

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  }}).then(() => new Promise(r => setTimeout(r, 1)));

  const page = await browser.newPage(}).then(() => new Promise(r => setTimeout(r, 1)));

  // Set up error collection
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      collectedErrors.push({
        type: 'console',
        message: msg.text(),
        timestamp: new Date().toISOString(),
        context: { location: msg.location() },
      }}).then(() => new Promise(r => setTimeout(r, 1)));
    }
  }}).then(() => new Promise(r => setTimeout(r, 1)));

  page.on('pageerror', (error) => {
    collectedErrors.push({
      type: 'pageerror',
      message: error.message,
      timestamp: new Date().toISOString(),
      context: { stack: error.stack },
    }}).then(() => new Promise(r => setTimeout(r, 1)));
  }}).then(() => new Promise(r => setTimeout(r, 1)));

  page.on('response', async (response) => {
    if (response.status() >= 400) {
      const url = response.url(}).then(() => new Promise(r => setTimeout(r, 1)));
      collectedErrors.push({
        type: 'network',
        message: `${response.status()} ${response.statusText()} - ${url}`,
        timestamp: new Date().toISOString(),
        context: {
          status: response.status(),
          url: url,
          method: response.request().method(),
        },
      }}).then(() => new Promise(r => setTimeout(r, 1)));
    }
  }}).then(() => new Promise(r => setTimeout(r, 1)));

  try {
    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' }}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForSelector('h1, h2', { timeout: 5000 }}).then(() => new Promise(r => setTimeout(r, 1)));
    console.log('✓ Login page loaded'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Step 2: Sign in
    console.log('\nStep 2: Signing in with landlord credentials...'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.type('input[type="email"]', 'landlord@example.com'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.type('input[type="password"]', 'password123'}).then(() => new Promise(r => setTimeout(r, 1)));
    
    // Click sign in button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]}).then(() => new Promise(r => setTimeout(r, 1)));
    console.log('✓ Successfully logged in'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Step 3: Navigate to dashboard
    console.log('\nStep 3: Viewing dashboard...'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' }}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForFunction(() => true, { timeout: (2000}).then(() => new Promise(r => setTimeout(r, 1)));
    console.log('✓ Dashboard loaded'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Step 4: Create a new property
    console.log('\nStep 4: Creating a new property...'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.goto('http://localhost:5173/properties/new', { waitUntil: 'networkidle2' }}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForFunction(() => true, { timeout: (1000}).then(() => new Promise(r => setTimeout(r, 1)));

    // Fill in property form
    await page.type('input[name="addressLine1"], input[placeholder*="Address"]', '123 Test Street'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.type('input[name="city"], input[placeholder*="City"]', 'London'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.type('input[name="postcode"], input[placeholder*="Postcode"]', 'SW1A 1AA'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Try to fill bedrooms if field exists
    const bedroomsField = await page.$('input[name="bedrooms"]'}).then(() => new Promise(r => setTimeout(r, 1)));
    if (bedroomsField) {
      await page.type('input[name="bedrooms"]', '3'}).then(() => new Promise(r => setTimeout(r, 1)));
    }

    // Submit the form
    await page.click('button[type="submit"]'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForFunction(() => true, { timeout: (3000); // Wait for response
    console.log('✓ Property creation form submitted'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Step 5: Navigate to properties list
    console.log('\nStep 5: Viewing properties list...'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.goto('http://localhost:5173/properties', { waitUntil: 'networkidle2' }}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForFunction(() => true, { timeout: (2000}).then(() => new Promise(r => setTimeout(r, 1)));
    console.log('✓ Properties list loaded'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Step 6: Try to view a property detail
    const propertyLinks = await page.$$('a[href*="/properties/"]:not([href$="/new"])'}).then(() => new Promise(r => setTimeout(r, 1)));
    if (propertyLinks.length > 0) {
      console.log('\nStep 6: Viewing property detail...'}).then(() => new Promise(r => setTimeout(r, 1)));
      await propertyLinks[0].click(}).then(() => new Promise(r => setTimeout(r, 1)));
      await page.waitForNavigation({ waitUntil: 'networkidle2' }}).then(() => new Promise(r => setTimeout(r, 1)));
      await page.waitForFunction(() => true, { timeout: (1000}).then(() => new Promise(r => setTimeout(r, 1)));
      console.log('✓ Property detail loaded'}).then(() => new Promise(r => setTimeout(r, 1)));
    }

    // Step 7: Create a ticket
    console.log('\nStep 7: Creating a ticket...'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.goto('http://localhost:5173/tickets/new', { waitUntil: 'networkidle2' }}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForFunction(() => true, { timeout: (1000}).then(() => new Promise(r => setTimeout(r, 1)));

    await page.type('input[name="title"], input[placeholder*="Title"]', 'Test Automation Ticket'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.type('textarea[name="description"], textarea[placeholder*="Description"]', 'This is an automated test ticket'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Try to select priority
    const prioritySelect = await page.$('select[name="priority"]'}).then(() => new Promise(r => setTimeout(r, 1)));
    if (prioritySelect) {
      await page.select('select[name="priority"]', 'HIGH'}).then(() => new Promise(r => setTimeout(r, 1)));
    }

    // Submit ticket
    await page.click('button[type="submit"]'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForFunction(() => true, { timeout: (3000}).then(() => new Promise(r => setTimeout(r, 1)));
    console.log('✓ Ticket creation form submitted'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Step 8: View tickets list
    console.log('\nStep 8: Viewing tickets list...'}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.goto('http://localhost:5173/tickets', { waitUntil: 'networkidle2' }}).then(() => new Promise(r => setTimeout(r, 1)));
    await page.waitForFunction(() => true, { timeout: (2000}).then(() => new Promise(r => setTimeout(r, 1)));
    console.log('✓ Tickets list loaded'}).then(() => new Promise(r => setTimeout(r, 1)));

    // Step 9: Try to logout
    console.log('\nStep 9: Attempting logout...'}).then(() => new Promise(r => setTimeout(r, 1)));
    // Try finding logout via text content
    const logoutButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a')}).then(() => new Promise(r => setTimeout(r, 1)));
      return buttons.find(el => /logout|sign out/i.test(el.textContent)}).then(() => new Promise(r => setTimeout(r, 1)));
    }}).then(() => new Promise(r => setTimeout(r, 1)));
    if (logoutButton && await logoutButton.asElement()) {
      await logoutButton.asElement().click(}).then(() => new Promise(r => setTimeout(r, 1)));
      await page.waitForFunction(() => true, { timeout: (2000}).then(() => new Promise(r => setTimeout(r, 1)));
      console.log('✓ Logout button clicked'}).then(() => new Promise(r => setTimeout(r, 1)));
    } else {
      console.log('⚠ Logout button not found'}).then(() => new Promise(r => setTimeout(r, 1)));
    }

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message}).then(() => new Promise(r => setTimeout(r, 1)));
    if (error.stack) {
      console.error(error.stack}).then(() => new Promise(r => setTimeout(r, 1)));
    }
  } finally {
    await browser.close(}).then(() => new Promise(r => setTimeout(r, 1)));
  }

  // Report findings
  console.log('\n' + '='.repeat(60)}).then(() => new Promise(r => setTimeout(r, 1)));
  console.log('FLOW EXECUTION SUMMARY'}).then(() => new Promise(r => setTimeout(r, 1)));
  console.log('='.repeat(60)}).then(() => new Promise(r => setTimeout(r, 1)));
  console.log(`Total errors collected: ${collectedErrors.length}\n`}).then(() => new Promise(r => setTimeout(r, 1)));

  const consoleErrors = collectedErrors.filter(e => e.type === 'console'}).then(() => new Promise(r => setTimeout(r, 1)));
  const pageErrors = collectedErrors.filter(e => e.type === 'pageerror'}).then(() => new Promise(r => setTimeout(r, 1)));
  const networkErrors = collectedErrors.filter(e => e.type === 'network'}).then(() => new Promise(r => setTimeout(r, 1)));

  console.log(`Console errors: ${consoleErrors.length}`}).then(() => new Promise(r => setTimeout(r, 1)));
  console.log(`Page errors: ${pageErrors.length}`}).then(() => new Promise(r => setTimeout(r, 1)));
  console.log(`Network failures: ${networkErrors.length}`}).then(() => new Promise(r => setTimeout(r, 1)));
  console.log('='.repeat(60) + '\n'}).then(() => new Promise(r => setTimeout(r, 1)));

  if (collectedErrors.length > 0) {
    console.log('DETAILED ERROR REPORT:'}).then(() => new Promise(r => setTimeout(r, 1)));
    console.log('='.repeat(60) + '\n'}).then(() => new Promise(r => setTimeout(r, 1)));

    collectedErrors.forEach((error, index) => {
      console.log(`[${index + 1}] ${error.type.toUpperCase()}`}).then(() => new Promise(r => setTimeout(r, 1)));
      console.log(`Time: ${error.timestamp}`}).then(() => new Promise(r => setTimeout(r, 1)));
      console.log(`Message: ${error.message}`}).then(() => new Promise(r => setTimeout(r, 1)));
      if (error.context) {
        console.log(`Context:`, JSON.stringify(error.context, null, 2)}).then(() => new Promise(r => setTimeout(r, 1)));
      }
      console.log(''}).then(() => new Promise(r => setTimeout(r, 1)));
    }}).then(() => new Promise(r => setTimeout(r, 1)));
  }

  // Save errors to file
  const outputFile = path.join(__dirname, '../../error-report.json'}).then(() => new Promise(r => setTimeout(r, 1)));
  fs.writeFileSync(outputFile, JSON.stringify({ errors: collectedErrors }, null, 2)}).then(() => new Promise(r => setTimeout(r, 1)));
  console.log(`\n📝 Error report saved to: ${outputFile}`}).then(() => new Promise(r => setTimeout(r, 1)));

  // Exit with error code if errors were found
  process.exit(collectedErrors.length > 0 ? 1 : 0}).then(() => new Promise(r => setTimeout(r, 1)));
}

main().catch(error => {
  console.error('Fatal error:', error}).then(() => new Promise(r => setTimeout(r, 1)));
  process.exit(1}).then(() => new Promise(r => setTimeout(r, 1)));
}}).then(() => new Promise(r => setTimeout(r, 1)));

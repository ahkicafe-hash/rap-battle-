import { test } from '@playwright/test';

test('Simple debug - just check errors', async ({ page }) => {
  // Collect all console and error messages
  const messages = [];

  page.on('console', msg => {
    messages.push(`CONSOLE [${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    messages.push(`PAGE ERROR: ${error.message}`);
    messages.push(`STACK: ${error.stack}`);
  });

  console.log('\n=== Loading test-battle.html ===');
  await page.goto('http://localhost:8080/test-battle.html');
  await page.waitForTimeout(3000);

  console.log('\n=== All Messages ===');
  messages.forEach(msg => console.log(msg));

  // Get the HTML of the console div
  const consoleHTML = await page.locator('#console').innerHTML();
  console.log('\n=== Console Div HTML ===');
  console.log(consoleHTML || '(empty)');

  // Check if createTestBots function exists
  const hasFunctioncreateTestBots = await page.evaluate(() => {
    return typeof window.createTestBots === 'function';
  });
  console.log(`\n=== createTestBots function exists: ${hasFunctioncreateTestBots} ===`);

  // Try to call the test button
  console.log('\n=== Attempting to click test button ===');
  try {
    page.once('dialog', dialog => {
      console.log(`Alert message: "${dialog.message()}"`);
      dialog.accept();
    });
    await page.click('button:has-text("Test Click")');
    await page.waitForTimeout(1000);

    const consoleAfterTest = await page.locator('#console').innerHTML();
    console.log('\n=== Console After Test Button ===');
    console.log(consoleAfterTest || '(empty)');
  } catch (e) {
    console.log(`Error clicking test button: ${e.message}`);
  }

  // Try to click create bots button
  console.log('\n=== Attempting to click Create 2 Test Bots button ===');
  try {
    await page.click('#create-btn');
    await page.waitForTimeout(2000);

    const consoleAfterCreate = await page.locator('#console').innerHTML();
    console.log('\n=== Console After Create Bots ===');
    console.log(consoleAfterCreate || '(empty)');
  } catch (e) {
    console.log(`Error clicking create bots: ${e.message}`);
  }

  // Get all messages again
  console.log('\n=== Final Messages ===');
  messages.forEach(msg => console.log(msg));
});

import { test, expect } from '@playwright/test';

test.describe('ClawCypher Test Pages Debug', () => {

  test('test-simple.html - basic functionality', async ({ page }) => {
    // Listen for console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to test-simple.html
    await page.goto('http://localhost:8080/test-simple.html');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('\n=== test-simple.html Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    // Check if output div exists and has content
    const outputDiv = await page.locator('#output');
    await expect(outputDiv).toBeVisible();
    const outputText = await outputDiv.textContent();
    console.log('\n=== Output Div Content ===');
    console.log(outputText);

    // Click "Test Supabase Connection" button
    console.log('\n=== Clicking Test Connection Button ===');
    await page.click('button:has-text("Test Supabase Connection")');
    await page.waitForTimeout(2000);

    const outputAfterTest = await outputDiv.textContent();
    console.log('\n=== Output After Test Connection ===');
    console.log(outputAfterTest);

    // Click "Create One Bot" button
    console.log('\n=== Clicking Create Bot Button ===');
    await page.click('button:has-text("Create One Bot")');
    await page.waitForTimeout(3000);

    const outputAfterBot = await outputDiv.textContent();
    console.log('\n=== Output After Create Bot ===');
    console.log(outputAfterBot);
  });

  test('test-battle.html - initialization and button clicks', async ({ page }) => {
    // Listen for console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Listen for errors
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Navigate to test-battle.html
    await page.goto('http://localhost:8080/test-battle.html');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('\n=== test-battle.html Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    // Check if console div exists and has content
    const consoleDiv = await page.locator('#console');
    await expect(consoleDiv).toBeVisible();
    const consoleText = await consoleDiv.textContent();
    console.log('\n=== Debug Console Content ===');
    console.log(consoleText);

    // Check if test button is visible
    const testButton = await page.locator('button:has-text("Test Click")');
    await expect(testButton).toBeVisible();

    // Click test button to verify JavaScript works
    console.log('\n=== Clicking Test Button ===');
    page.once('dialog', dialog => {
      console.log(`Alert shown: ${dialog.message()}`);
      dialog.accept();
    });
    await testButton.click();
    await page.waitForTimeout(1000);

    const consoleAfterTest = await consoleDiv.textContent();
    console.log('\n=== Console After Test Button ===');
    console.log(consoleAfterTest);

    // Check if create bots button is visible and enabled
    const createBotsBtn = await page.locator('#create-btn');
    await expect(createBotsBtn).toBeVisible();
    const isDisabled = await createBotsBtn.isDisabled();
    console.log(`\nCreate Bots Button Disabled: ${isDisabled}`);

    // Try to click "Create 2 Test Bots" button
    console.log('\n=== Clicking Create 2 Test Bots Button ===');
    await createBotsBtn.click();
    await page.waitForTimeout(2000);

    const consoleAfterCreate = await consoleDiv.textContent();
    console.log('\n=== Console After Create Bots Click ===');
    console.log(consoleAfterCreate);

    // Check if bots-status div has any content
    const botsStatus = await page.locator('#bots-status');
    const botsStatusText = await botsStatus.textContent();
    console.log('\n=== Bots Status Content ===');
    console.log(botsStatusText || '(empty)');

    // Get final console logs
    await page.waitForTimeout(1000);
    console.log('\n=== Final Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
  });
});

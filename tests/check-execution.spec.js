import { test } from '@playwright/test';

test('Check how many times script executes', async ({ page }) => {
  let scriptExecutionCount = 0;

  // Inject a counter before the page loads
  await page.goto('http://localhost:8080/test-battle.html');

  // Check if window has execution count
  const count = await page.evaluate(() => {
    return window.scriptExecutions || 0;
  });

  console.log(`Script executed ${count} times`);

  // Wait and check again
  await page.waitForTimeout(2000);

  const count2 = await page.evaluate(() => {
    return window.scriptExecutions || 0;
  });

  console.log(`After 2s: Script executed ${count2} times`);
});

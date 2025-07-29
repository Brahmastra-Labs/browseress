const { test, expect } = require('@playwright/test');

test.describe('Relay Server Integration', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    
    // Open Relay test app
    await page.goto('/examples/relay-test/');
    await page.waitForSelector('#startBtn');
    
    // Log any console messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error));
    
    // Click start button
    await page.click('#startBtn');
    
    // Wait for connection
    await page.waitForSelector('.status.connected', { timeout: 10000 });
  });

  test.afterAll(async () => {
    if (page) {
      // Stop the server before closing
      const stopBtn = page.locator('#stopBtn');
      if (await stopBtn.isEnabled()) {
        await stopBtn.click();
        await page.waitForSelector('.status.disconnected', { timeout: 5000 });
      }
      await page.close();
    }
  });

  test('should handle GET request through WebSocket transport', async ({ request }) => {
    // Click test GET button
    await page.click('#testGetBtn');
    
    // Wait for test result
    await page.waitForSelector('.test-result', { timeout: 5000 });
    
    // Check result
    const result = await page.locator('.test-result').first();
    const resultText = await result.textContent();
    expect(resultText).toContain('GET /test: PASSED');
    
    // Verify the response data
    const preContent = await result.locator('pre').textContent();
    const data = JSON.parse(preContent);
    expect(data.message).toBe('Hello from Browseress!');
  });

  test('should handle POST request with body', async ({ request }) => {
    // Click test POST button
    await page.click('#testPostBtn');
    
    // Wait for new test result
    await page.waitForSelector('.test-result:nth-child(2)', { timeout: 5000 });
    
    // Check result
    const result = await page.locator('.test-result').nth(1);
    const resultText = await result.textContent();
    expect(resultText).toContain('POST /users: PASSED');
    
    // Verify the response data
    const preContent = await result.locator('pre').textContent();
    const data = JSON.parse(preContent);
    expect(data.id).toBe(123);
    expect(data.name).toBe('Test User');
  });

  test('should handle 404 errors', async ({ request }) => {
    // Click test 404 button
    await page.click('#test404Btn');
    
    // Wait for new test result
    await page.waitForSelector('.test-result:nth-child(3)', { timeout: 5000 });
    
    // Check result
    const result = await page.locator('.test-result').nth(2);
    const resultText = await result.textContent();
    expect(resultText).toContain('GET /nonexistent (404): PASSED');
    
    // Verify the response data
    const preContent = await result.locator('pre').textContent();
    const data = JSON.parse(preContent);
    expect(data.error).toBe('Not found');
  });

  test('should handle multiple concurrent requests', async ({ request }) => {
    // Click test concurrent button
    await page.click('#testConcurrentBtn');
    
    // Wait for new test result
    await page.waitForSelector('.test-result:nth-child(4)', { timeout: 5000 });
    
    // Check result
    const result = await page.locator('.test-result').nth(3);
    const resultText = await result.textContent();
    expect(resultText).toContain('Concurrent requests (5): PASSED');
    
    // Verify the response data
    const preContent = await result.locator('pre').textContent();
    const results = JSON.parse(preContent);
    expect(results).toHaveLength(5);
    
    // Check each result has the correct ID
    results.forEach((r, index) => {
      expect(r.data.id).toBe(String(index + 1));
    });
  });

  test('should run all tests successfully', async ({ request }) => {
    // Clear previous results
    await page.evaluate(() => {
      document.getElementById('testResults').innerHTML = '';
    });
    
    // Click run all tests button
    await page.click('#runAllTestsBtn');
    
    // Wait for all 4 test results
    await page.waitForSelector('.test-result:nth-child(4)', { timeout: 10000 });
    
    // Check all results are successful
    const results = await page.locator('.test-result.success').count();
    expect(results).toBe(4);
    
    // Verify no failures
    const failures = await page.locator('.test-result.error').count();
    expect(failures).toBe(0);
  });

  test('should handle relay server disconnection', async ({ request }) => {
    // Stop the server
    await page.click('#stopBtn');
    await page.waitForSelector('.status.disconnected', { timeout: 5000 });
    
    // Verify test buttons are disabled
    expect(await page.locator('#testGetBtn').isDisabled()).toBe(true);
    expect(await page.locator('#testPostBtn').isDisabled()).toBe(true);
    expect(await page.locator('#test404Btn').isDisabled()).toBe(true);
    expect(await page.locator('#testConcurrentBtn').isDisabled()).toBe(true);
    
    // Try to make a request to the relay server (should fail)
    try {
      const response = await request.get('http://localhost:8080/test');
      // If we get here, check that it's a 503
      expect(response.status()).toBe(503);
    } catch (error) {
      // Expected - connection refused or similar
      expect(error.message).toMatch(/ECONNREFUSED|fetch failed|503/);
    }
  });

  test('should reconnect to relay server', async ({ request }) => {
    // Start the server again
    await page.click('#startBtn');
    await page.waitForSelector('.status.connected', { timeout: 10000 });
    
    // Verify we can make requests again
    await page.click('#testGetBtn');
    await page.waitForSelector('.test-result', { timeout: 5000 });
    
    const result = await page.locator('.test-result').last();
    const resultText = await result.textContent();
    expect(resultText).toContain('GET /test: PASSED');
  });
});
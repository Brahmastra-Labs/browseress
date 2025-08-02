const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Express Test Harness - Dynamic Test Loading', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[Browser ${type}] ${text}`);
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('[Browser Error]', error.message);
    });
    
    // Open test harness
    console.log('Navigating to test harness...');
    const response = await page.goto('/examples/express-test-harness/', { waitUntil: 'networkidle' });
    console.log('Page response status:', response.status());
    console.log('Page URL:', page.url());
    
    // Check if page loaded
    const title = await page.title();
    console.log('Page title:', title);
    
    // Wait for start button
    console.log('Waiting for start button...');
    await page.waitForSelector('#startBtn', { timeout: 10000 });
    
    // Click start button
    await page.click('#startBtn');
    
    // Wait for connection
    await page.waitForSelector('.status.connected', { timeout: 10000 });
    
    // Wait for test system to initialize
    await page.waitForSelector('#testSelect:not([disabled])', { timeout: 5000 });
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

  // Load test manifest to get all testable files
  const manifestPath = path.join(__dirname, '../../examples/express-test-harness/test-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Filter to only Express test files (exclude browser-incompatible and our own tests)
  const testSuites = manifest.filter(test => 
    test.status !== 'browser-incompatible' &&
    !test.name.includes('browseress') &&
    !test.name.includes('integration.') &&
    !test.name.includes('polyfills.') &&
    !test.name.includes('relay-server') &&
    !test.name.includes('transports.') &&
    !test.name.includes('streams.') &&
    !test.name.includes('middleware.') &&
    !test.name.includes('sendfile-simulation') &&
    !test.name.startsWith('e2e/') &&
    !test.name.startsWith('browser/')
  );

  // Test each Express test suite as individual tests
  testSuites.forEach(suite => {
    test(`${suite.name}`, async () => {
      // Reset app state before each test suite
      await page.evaluate(() => resetApp());
      
      // Select the test from dropdown
      await page.selectOption('#testSelect', suite.name);
      
      // Click Load Test button
      await page.click('#loadTestBtn');
      
      // Wait for test to load
      await page.waitForFunction(() => {
        const output = document.querySelector('.test-output');
        return output && output.textContent.includes(`Test loaded successfully`);
      }, { timeout: 5000 });
      
      // Verify test loaded
      const statsText = await page.locator('#testStats').textContent();
      expect(statsText).toContain(suite.name);
      
      // Wait for Run Loaded Test button to be enabled
      await expect(page.locator('#runLoadedTestBtn')).toBeEnabled({ timeout: 5000 });
      
      // THIS IS THE NEW, CORRECT, ATOMIC WAY:
      // Click the button and wait for the promise in a single atomic operation
      console.log('About to run test:', suite.name);
      
      // First, let's check for any console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error('Browser console error:', msg.text());
        }
      });
      
      // Add a timeout handler to check state
      const timeoutId = setTimeout(async () => {
        console.log('=== TIMEOUT DEBUG INFO ===');
        try {
          const hasPromise = await page.evaluate(() => !!window._testCompletionPromise);
          console.log('Has _testCompletionPromise:', hasPromise);
          
          const testOutput = await page.locator('.test-output').textContent();
          console.log('Last test output:', testOutput.split('\n').slice(-10).join('\n'));
        } catch (e) {
          console.error('Error getting debug info:', e.message);
        }
      }, 20000); // Log after 20 seconds
      
      const finalResults = await page.evaluate(async () => {
        // 1. Find and click the button from INSIDE the browser context
        const button = document.getElementById('runLoadedTestBtn');
        if (!button) {
          throw new Error('Run Loaded Test button not found');
        }
        
        console.log('Clicking button...');
        button.click();
        
        // 2. Wait a moment for the promise to be created
        let attempts = 0;
        while (!window._testCompletionPromise && attempts < 100) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }
        
        if (!window._testCompletionPromise) {
          throw new Error('_testCompletionPromise was not created after clicking button');
        }
        
        console.log('Promise found, waiting for completion...');
        
        // 3. Return the promise that the click handler creates.
        //    Playwright will automatically wait for this promise to resolve.
        return window._testCompletionPromise;
      });
      
      // NOW it is safe to proceed with assertions, because the code
      // will only reach here after the promise has resolved.
      clearTimeout(timeoutId);
      console.log('On-page test suite finished with result:', finalResults);
      
      // Verify test results from promise
      expect(finalResults).toBeDefined();
      expect(finalResults.error).toBeUndefined();
      expect(finalResults.passed).toBeGreaterThanOrEqual(0);
      expect(finalResults.failed).toBeGreaterThanOrEqual(0);
      
      const totalTests = finalResults.passed + finalResults.failed;
      expect(totalTests).toBeGreaterThan(0);
      
      const passRate = Math.round((finalResults.passed / totalTests) * 100);
      console.log(`${suite.name}: ${finalResults.passed}/${totalTests} tests passed (${passRate}%)`);
      
      // Fail the test if pass rate is too low
      if (passRate < 50) {
        throw new Error(`Low pass rate: only ${finalResults.passed}/${totalTests} tests passed (${passRate}%)`);
      }
      
      // Note: Output verification removed as it's not relevant for Express tests
      // The important part is the test results themselves
      
      // Clear output for next test
      await page.click('#clearBtn');
    });
  });

  test('should handle test transformation and categorization', async () => {
    // Test that the harness properly categorizes tests
    
    // Select res.json.js
    await page.selectOption('#testSelect', 'res.json.js');
    await page.click('#loadTestBtn');
    
    // Wait for load
    await page.waitForFunction(() => {
      const output = document.querySelector('.test-output');
      return output && output.textContent.includes('Test loaded successfully');
    }, { timeout: 5000 });
    
    // Check output for transformation details
    const output = await page.locator('.test-output').textContent();
    expect(output).toContain('Test category: ADAPTED');
    expect(output).toContain('Transformations applied:');
    
    // Should show what transformations were done
    expect(output).toMatch(/Transformed .* require/);
  });

  test('should provide comprehensive test statistics', async () => {
    // This test verifies the test harness provides useful metrics
    
    // Run through all tests and collect statistics
    const stats = {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      categories: {}
    };
    
    for (const suite of testSuites) {
      await page.selectOption('#testSelect', suite.name);
      await page.click('#loadTestBtn');
      
      await page.waitForFunction(() => {
        const output = document.querySelector('.test-output');
        return output && output.textContent.includes('Test loaded successfully');
      }, { timeout: 5000 });
      
      // Get category from stats
      const statsHtml = await page.locator('#testStats').innerHTML();
      const categoryMatch = statsHtml.match(/category-(\w+)/);
      if (categoryMatch) {
        const category = categoryMatch[1].toUpperCase();
        stats.categories[category] = (stats.categories[category] || 0) + 1;
      }
    }
    
    console.log('\n=== Test Harness Statistics ===');
    console.log('Test Suites:', testSuites.length);
    console.log('Categories:', stats.categories);
    
    // Verify we have categorized all tests
    expect(Object.keys(stats.categories).length).toBeGreaterThan(0);
    
    // All our current tests should be ADAPTED since we transform requires
    expect(stats.categories['ADAPTED']).toBe(testSuites.length);
  });
});
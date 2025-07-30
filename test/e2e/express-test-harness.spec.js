const { test, expect } = require('@playwright/test');

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

  // Define test suites and their expected results
  const testSuites = [
    {
      name: 'res.json.js',
      description: 'Tests for res.json() method',
      expectedTests: [
        'should not support jsonp callbacks',
        'should not override previous Content-Types',
        'should respond with json for null',
        'should respond with json for Number',
        'should respond with json for String',
        'should respond with json',
        'should respond with json',
        'should escape characters'
      ],
      category: 'ADAPTED' // Because we transform require statements
    },
    {
      name: 'res.send.js',
      description: 'Tests for res.send() method',
      expectedTests: [
        'should set body to ""',
        'should set body to ""',
        'should set body to ""',
        'should send number as json',
        'should send string',
        'should send Buffers',
        'should send buffer objects',
        'should send json',
        'should send json for objects',
        'should send json for arrays',
        'should send HTML',
        'should set ETag',
        'should send ETag in response',
        'should send a 304 when ETag matches',
        'should send a 412 when ETag matches with PUT'
      ],
      category: 'ADAPTED'
    },
    {
      name: 'res.status.js',
      description: 'Tests for res.status() method',
      expectedTests: [
        'should set the response .statusCode',
        'should strip irrelevant properties'
      ],
      category: 'ADAPTED'
    },
    {
      name: 'app.use.js',
      description: 'Tests for app.use() middleware',
      expectedTests: [
        'should emit "mount" when mounted',
        'should mount the app',
        'should support mount-points',
        'should set the child\'s .parent',
        'should support dynamic routes',
        'should add a router',
        'should do nothing without handlers',
        'should do nothing without a function',
        'should be chainable',
        'should invoke .use\'d middleware',
        'should accept multiple arguments',
        'should invoke middleware for all requests',
        'should invoke middleware for requests starting with path',
        'should work if path has trailing slash',
        'should set the child\'s .parent',
        'should invoke middleware for any request starting with path',
        'should work if path has trailing slash',
        'should check regexp path',
        'should match complex regexp path',
        'should support array of paths',
        'should support array of paths w/ middleware',
        'should support regexp path',
        'should support regexp path w/ params',
        'should ignore VERBS',
        'should pull off the path prefix',
        'should restore prefix after leaving router',
        'should restore prefix after leaving nested router',
        'should support path prefix stripping with multiple handlers',
        'should invoke middleware correctly'
      ],
      category: 'ADAPTED'
    }
  ];

  // Test each Express test suite
  for (const suite of testSuites) {
    test(`should run ${suite.name} tests dynamically`, async () => {
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
      
      // Verify test category
      const statsText = await page.locator('#testStats').textContent();
      expect(statsText).toContain(suite.name);
      expect(statsText).toContain(suite.category);
      
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
      console.log(`${suite.name}: ${finalResults.passed} passed, ${finalResults.failed} failed, ${totalTests} total`);
      
      // Check if the test count roughly matches expected
      // Allow some variance as tests may be added/removed
      if (suite.expectedTests.length > 0) {
        expect(totalTests).toBeGreaterThanOrEqual(Math.floor(suite.expectedTests.length * 0.8));
      }
      
      // Get test output for additional verification
      const output = await page.locator('.test-output').textContent();
      console.log(`\n=== ${suite.name} Results ===`);
      
      // Verify Express app started
      expect(output).toContain('Express app started on http://localhost:8080');
      
      // Clear output for next test
      await page.click('#clearBtn');
    });
  }

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
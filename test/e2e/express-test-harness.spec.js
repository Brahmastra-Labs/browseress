const { test, expect } = require('@playwright/test');

test.describe('Express Test Harness - Dynamic Test Loading', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    
    // Open test harness
    await page.goto('/examples/express-test-harness/');
    await page.waitForSelector('#startBtn');
    
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
      // Select the test from dropdown
      await page.selectOption('#testSelect', suite.name);
      
      // Click Load Test button
      await page.click('#loadTestBtn');
      
      // Wait for test to load
      await page.waitForFunction((testName) => {
        const output = document.querySelector('.test-output');
        return output && output.textContent.includes(`Test loaded successfully`);
      }, suite.name, { timeout: 5000 });
      
      // Verify test category
      const statsText = await page.locator('#testStats').textContent();
      expect(statsText).toContain(suite.name);
      expect(statsText).toContain(suite.category);
      
      // Wait for Run Loaded Test button to be enabled
      await expect(page.locator('#runLoadedTestBtn')).toBeEnabled({ timeout: 5000 });
      
      // Click Run Loaded Test button
      await page.click('#runLoadedTestBtn');
      
      // Wait for tests to complete
      await page.waitForFunction(() => {
        const output = document.querySelector('.test-output');
        if (!output) return false;
        const text = output.textContent;
        return text.includes('Tests:') && (text.includes('passed') || text.includes('failed'));
      }, { timeout: 30000 });
      
      // Get test output
      const output = await page.locator('.test-output').textContent();
      console.log(`\n=== ${suite.name} Results ===`);
      console.log(output);
      
      // Verify Express app started
      expect(output).toContain('Express app started on http://localhost:8080');
      
      // Check for test completion
      expect(output).toMatch(/Tests: \d+ passed, \d+ failed, \d+ total/);
      
      // Verify at least some tests ran
      const match = output.match(/Tests: (\d+) passed, (\d+) failed, (\d+) total/);
      if (match) {
        const [_, passed, failed, total] = match;
        const totalTests = parseInt(total);
        expect(totalTests).toBeGreaterThan(0);
        console.log(`${suite.name}: ${passed} passed, ${failed} failed, ${total} total`);
        
        // Check if the test count roughly matches expected
        // Allow some variance as tests may be added/removed
        if (suite.expectedTests.length > 0) {
          expect(totalTests).toBeGreaterThanOrEqual(Math.floor(suite.expectedTests.length * 0.8));
        }
      }
      
      // Clear output for next test
      await page.click('#clearBtn');
    });
  }

  // Legacy compatibility test
  test('should maintain backward compatibility with legacy Run Express Test button', async () => {
    // Click the legacy Run Express Test button
    await page.click('#runTestBtn');
    
    // Wait for tests to start
    await page.waitForFunction(() => {
      const output = document.querySelector('.test-output');
      return output && output.textContent.includes('Running Express Test Suite');
    }, { timeout: 5000 });
    
    // Wait for completion
    await page.waitForFunction(() => {
      const output = document.querySelector('.test-output');
      if (!output) return false;
      const text = output.textContent;
      return text.includes('Tests:') && (text.includes('passed') || text.includes('failed'));
    }, { timeout: 30000 });
    
    // Get test results
    const output = await page.locator('.test-output').textContent();
    
    // Verify legacy test still works
    expect(output).toContain('res.json() - Express Test');
    expect(output).toContain('✓ should respond with json object');
    expect(output).toContain('✓ should respond with json number');
    expect(output).toContain('✓ should respond with json string');
    expect(output).toContain('✓ should respond with json null');
    expect(output).toContain('4 passed, 0 failed');
    expect(output).toContain('✅ All Express tests passed in Browseress!');
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
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const resultsFile = path.join(__dirname, '../../temp-test-results.json');

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

  let allTestResults = [];

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
      
      clearTimeout(timeoutId);
      console.log('On-page test suite finished with result:', finalResults);
      

      const safeFinalResults = finalResults || { passed: 0, failed: 0, error: 'Test execution failed - no result' };
      
      // Handle test counts - negative failed count indicates execution error
      const normalizedPassed = Math.max(0, safeFinalResults.passed || 0);
      const rawFailed = safeFinalResults.failed || 0;
      const hasExecutionError = rawFailed < 0 || !!safeFinalResults.error;
      const normalizedFailed = Math.max(0, rawFailed); // Only for display/storage
      const totalTests = normalizedPassed + normalizedFailed;
      const passRate = totalTests > 0 ? Math.round((normalizedPassed / totalTests) * 100) : 0;
      console.log(`${suite.name}: ${safeFinalResults.passed || 0}/${totalTests} tests passed (${passRate}%)`);
      
      // Extract and display detailed test results from the browser
      const detailedResults = await page.evaluate(() => {
        const currentResults = window._lastTestResults || [];
        // Clear the results immediately to prevent cross-contamination
        window._lastTestResults = [];
        return currentResults;
      });
      // Ensure we have clean data for this specific test suite
      const suiteResult = {
        suiteName: suite.name,
        passed: normalizedPassed,
        failed: normalizedFailed,
        total: totalTests,
        passRate: passRate,
        details: detailedResults && detailedResults.length > 0 ? detailedResults : [],
        hasError: !!safeFinalResults.error,
        errorMsg: safeFinalResults.error || null
      };
      
      // Validate that the detailed results actually match this test suite
      if (detailedResults && detailedResults.length > 0) {
        console.log(`[DEBUG] ${suite.name} has ${detailedResults.length} detailed results:`, 
                   detailedResults.map(r => r.name || 'unnamed').slice(0, 3));
      } else {
        console.log(`[DEBUG] ${suite.name} has no detailed results (this may be normal for failed tests)`);
      }
      
      allTestResults.push(suiteResult);
      
      // Store results in Node.js filesystem (not browser OPFS)
      try {
        let allResults = [];
        if (fs.existsSync(resultsFile)) {
          const data = fs.readFileSync(resultsFile, 'utf8');
          allResults = JSON.parse(data);
        }
        
        allResults.push(suiteResult);
        fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
        
        console.log(`[Node.js] Stored result for ${suite.name}, total results: ${allResults.length}`);
      } catch (error) {
        console.error('[Node.js] Failed to store test result:', error);
      }

      // Display detailed per-test results immediately
      if (detailedResults && detailedResults.length > 0) {
        console.log(`\n📋 DETAILED RESULTS FOR ${suite.name}:`);
        
        detailedResults.forEach((result, index) => {
          const testName = result.name || `Test ${index + 1}`;
          if (result.status === 'passed') {
            console.log(`  ✅ ${testName}`);
          } else if (result.status === 'failed') {
            const errorMsg = result.error ? result.error.split('\n')[0] : 'Unknown error';
            console.log(`  ❌ ${testName}`);
            console.log(`     └─ Error: ${errorMsg}`);
          }
        });
      }
      
      // FAIL if: any tests failed, execution error, OR no tests ran at all
      if (normalizedFailed > 0 || hasExecutionError || totalTests === 0) {
        let errorReason;
        if (hasExecutionError) {
          errorReason = `Execution error: ${safeFinalResults.error}`;
        } else if (totalTests === 0) {
          errorReason = `No tests executed - likely transformation or loading error`;
        } else {
          errorReason = `${normalizedFailed} test(s) failed out of ${totalTests} total`;
        }
        throw new Error(`❌ FAILED: ${errorReason}. We need 100% pass rate and successful test execution.`);
      } else {
        console.log(`✅ SUCCESS: All ${normalizedPassed} tests passed (${passRate}%)`);
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

  // Final test that runs LAST and shows comprehensive results
  test('FINAL RESULTS SUMMARY', async () => {
    console.log('\n\n' + '='.repeat(80));
    console.log('🎯 FINAL COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    
    // Get results from Node.js filesystem
    let allResults = [];
    try {
      if (fs.existsSync(resultsFile)) {
        const data = fs.readFileSync(resultsFile, 'utf8');
        allResults = JSON.parse(data);
        console.log(`[Node.js] Read ${allResults.length} results from filesystem`);
      }
    } catch (error) {
      console.error('[Node.js] Failed to read test results:', error);
    }
    
    console.log(`\n✅ COLLECTED RESULTS: Found ${allResults.length} test suites`);
    
    if (allResults.length === 0) {
      console.log('❌ No test results were collected during this run.');
      console.log('   This indicates the collection mechanism isn\'t working.');
      console.log('='.repeat(80) + '\n');
      // Don't fail the test, just report the issue
      return;
    }

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
    let failedSuites = [];
    let passedSuites = [];

    // Calculate totals and categorize suites
    allResults.forEach(suite => {
      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalTests += suite.total;
      
      if (suite.failed > 0) {
        failedSuites.push(suite);
      } else if (suite.total > 0) {
        passedSuites.push(suite);
      }
    });

    const overallPassRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    // Overall summary
    console.log(`\n📊 OVERALL STATISTICS:`);
    console.log(`   Test Suites Analyzed: ${allResults.length}`);
    console.log(`   Total Individual Tests: ${totalTests}`);
    console.log(`   ✅ Tests Passed: ${totalPassed} (${overallPassRate}%)`);
    console.log(`   ❌ Tests Failed: ${totalFailed}`);
    console.log(`   📂 Suites Passing: ${passedSuites.length}`);
    console.log(`   💥 Suites Failing: ${failedSuites.length}`);

    // Show ALL test results like you wanted
    console.log(`\n📋 ALL TEST RESULTS:`);
    allResults.forEach(suite => {
      if (suite.total === 0 && !suite.hasError) return; // Skip empty suites without errors
      
      console.log(`\n📂 ${suite.suiteName}: ${suite.passed}/${suite.total} tests (${suite.passRate}%)`);
      
      if (suite.hasError) {
        console.log(`  💥 Execution Error: ${suite.errorMsg}`);
      } else if (suite.details && suite.details.length > 0) {
        // Show the detailed results we collected
        suite.details.forEach((test, index) => {
          const testName = test.name || `Test ${index + 1}`;
          if (test.status === 'passed') {
            console.log(`  ✅ ${testName}`);
          } else if (test.status === 'failed') {
            const errorMsg = test.error ? test.error.split('\n')[0] : 'Unknown error';
            console.log(`  ❌ ${testName}`);
            console.log(`     └─ Error: ${errorMsg}`);
          }
        });
      } else {
        // Fallback if no detailed results
        console.log(`  (${suite.passed} passed, ${suite.failed} failed)`);
      }
    });

    console.log('\n' + '='.repeat(80));
    if (totalFailed === 0 && totalTests > 0) {
      console.log('🎉 CONGRATULATIONS! ALL TESTS PASSED!');
    } else if (totalTests === 0) {
      console.log('⚠️  NO EXECUTABLE TESTS FOUND');
    } else {
      console.log(`⚠️  SUMMARY: ${totalFailed} tests failed across ${failedSuites.length} suites`);
      console.log(`   Focus areas: ${failedSuites.map(s => s.suiteName).join(', ')}`);
    }
    console.log('='.repeat(80) + '\n');
    
    // Always pass this test - it's just for reporting
    expect(true).toBe(true);
  });

});
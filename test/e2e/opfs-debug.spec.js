const { test, expect } = require('@playwright/test');

test.describe('OPFS Debug Test', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    
    // Open test harness
    await page.goto('/examples/express-test-harness/', { waitUntil: 'networkidle' });
    await page.waitForSelector('#startBtn', { timeout: 10000 });
    await page.click('#startBtn');
    await page.waitForSelector('.status.connected', { timeout: 10000 });
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
    }
  });

  // Test 1: Write to OPFS
  test('should write test result to OPFS', async () => {
    const testResult = {
      suiteName: 'test-suite-1',
      passed: 5,
      failed: 1,
      total: 6,
      passRate: 83
    };

    await page.evaluate(async (result) => {
      try {
        const opfsRoot = await navigator.storage.getDirectory();
        
        // Read existing results
        let allResults = [];
        try {
          const fileHandle = await opfsRoot.getFileHandle('test-results.json');
          const file = await fileHandle.getFile();
          const text = await file.text();
          allResults = JSON.parse(text);
        } catch (e) {
          console.log('[OPFS] No existing file, starting fresh');
        }
        
        // Add new result
        allResults.push(result);
        
        // Write back to OPFS
        const fileHandle = await opfsRoot.getFileHandle('test-results.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(allResults, null, 2));
        await writable.close();
        
        console.log(`[OPFS] Successfully wrote result for ${result.suiteName}`);
        return { success: true, count: allResults.length };
      } catch (error) {
        console.error('[OPFS] Write failed:', error);
        return { success: false, error: error.message };
      }
    }, testResult);

    console.log('✅ Test 1 completed: Write to OPFS');
  });

  // Test 2: Write another result
  test('should append second test result to OPFS', async () => {
    const testResult = {
      suiteName: 'test-suite-2',
      passed: 3,
      failed: 2,
      total: 5,
      passRate: 60
    };

    const result = await page.evaluate(async (result) => {
      try {
        const opfsRoot = await navigator.storage.getDirectory();
        
        // Read existing results
        let allResults = [];
        try {
          const fileHandle = await opfsRoot.getFileHandle('test-results.json');
          const file = await fileHandle.getFile();
          const text = await file.text();
          allResults = JSON.parse(text);
          console.log(`[OPFS] Found ${allResults.length} existing results`);
        } catch (e) {
          console.log('[OPFS] No existing file found');
        }
        
        // Add new result
        allResults.push(result);
        
        // Write back to OPFS
        const fileHandle = await opfsRoot.getFileHandle('test-results.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(allResults, null, 2));
        await writable.close();
        
        console.log(`[OPFS] Successfully wrote result for ${result.suiteName}, total: ${allResults.length}`);
        return { success: true, count: allResults.length };
      } catch (error) {
        console.error('[OPFS] Write failed:', error);
        return { success: false, error: error.message };
      }
    }, testResult);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    console.log('✅ Test 2 completed: Append to OPFS');
  });

  // Test 3: Read all results
  test('FINAL SUMMARY - should read all results from OPFS', async () => {
    const allResults = await page.evaluate(async () => {
      try {
        const opfsRoot = await navigator.storage.getDirectory();
        const fileHandle = await opfsRoot.getFileHandle('test-results.json');
        const file = await fileHandle.getFile();
        const text = await file.text();
        const results = JSON.parse(text);
        
        console.log(`[OPFS] Successfully read ${results.length} results from OPFS`);
        return { success: true, results };
      } catch (error) {
        console.error('[OPFS] Read failed:', error);
        return { success: false, error: error.message, results: [] };
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎯 OPFS DEBUG SUMMARY');
    console.log('='.repeat(60));
    
    if (allResults.success) {
      console.log(`✅ Successfully read ${allResults.results.length} results from OPFS`);
      
      allResults.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.suiteName}: ${result.passed}/${result.total} (${result.passRate}%)`);
      });
      
      expect(allResults.results.length).toBe(2);
      expect(allResults.results[0].suiteName).toBe('test-suite-1');
      expect(allResults.results[1].suiteName).toBe('test-suite-2');
    } else {
      console.log(`❌ Failed to read from OPFS: ${allResults.error}`);
      throw new Error(`OPFS read failed: ${allResults.error}`);
    }
    
    console.log('='.repeat(60));
    console.log('✅ OPFS Debug test completed successfully!');
  });
});
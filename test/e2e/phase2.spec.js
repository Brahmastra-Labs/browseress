const { test, expect } = require('@playwright/test');

test.describe('Phase 2: State Management & File I/O', () => {
  let page;
  let apiContext;

  test.beforeAll(async ({ browser }) => {
    // Create a browser context with proper headers for SharedArrayBuffer
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    
    // Open Phase 2 test app
    page = await context.newPage();
    await page.goto('/examples/phase2-test/');
    
    // Wait for page to load
    await page.waitForSelector('#startBtn');
    
    // Click start button
    await page.click('#startBtn');
    
    // Wait for connection
    await page.waitForSelector('.status.connected', { timeout: 10000 });
    
    // Create test files
    await page.click('button:has-text("Create Sample Files")');
    
    // Wait a bit for files to be created
    await page.waitForTimeout(1000);
    
    // Keep the page open for the duration of tests
    apiContext = await context.request;
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

  test.describe('State Management', () => {
    test('should support res.locals middleware pattern', async ({ request }) => {
      const response = await request.get('http://localhost:8080/locals-test');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      
      expect(body.message).toBe('res.locals test');
      expect(body.locals).toBeTruthy();
      expect(body.locals.user).toEqual({ id: 123, name: 'Test User' });
      expect(body.locals.timestamp).toBeTruthy();
    });
  });

  test.describe('File I/O', () => {
    test('should serve text file with res.sendFile', async ({ request }) => {
      const response = await request.get('http://localhost:8080/files/test.txt');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toBe('text/plain');
      
      const text = await response.text();
      expect(text).toContain('Hello from OPFS!');
      expect(text).toContain('This is a test file.');
    });

    test('should serve JSON file with correct content type', async ({ request }) => {
      const response = await request.get('http://localhost:8080/files/data.json');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toBe('application/json');
      
      const data = await response.json();
      expect(data.message).toBe('This is JSON data');
      expect(data.features).toContain('OPFS');
    });

    test('should serve HTML file', async ({ request }) => {
      const response = await request.get('http://localhost:8080/files/index.html');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toBe('text/html');
      
      const html = await response.text();
      expect(html).toContain('<h1>Hello from OPFS!</h1>');
    });

    test('should return 404 for non-existent file', async ({ request }) => {
      const response = await request.get('http://localhost:8080/files/nonexistent.txt');
      
      expect(response.status()).toBe(404);
      const text = await response.text();
      expect(text).toBe('Not found');
    });

    test('should download file with res.download', async ({ request }) => {
      const response = await request.get('http://localhost:8080/download/test.txt');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-disposition']).toContain('attachment');
      expect(response.headers()['content-disposition']).toContain('filename="test.txt"');
      
      const text = await response.text();
      expect(text).toContain('Hello from OPFS!');
    });

    test('should set custom filename in download', async ({ request }) => {
      const response = await request.get('http://localhost:8080/download/report.pdf');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-disposition']).toContain('attachment');
      expect(response.headers()['content-disposition']).toContain('filename="report.pdf"');
    });

    test('should set attachment header with res.attachment', async ({ request }) => {
      const response = await request.get('http://localhost:8080/attachment/document.pdf');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-disposition']).toBe('attachment; filename="document.pdf"');
      
      const body = await response.json();
      expect(body.filename).toBe('document.pdf');
    });

    test('should handle special characters in filename', async ({ request }) => {
      const response = await request.get('http://localhost:8080/attachment/file%20with%20spaces.txt');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-disposition']).toContain('filename="file with spaces.txt"');
    });
  });

  test.describe('File Creation via UI', () => {
    test('should create and serve custom file', async ({ request }) => {
      // Create a custom file through the UI
      await page.fill('#filename', 'custom.txt');
      await page.fill('#fileContent', 'This is custom content');
      await page.click('button:has-text("Create File")');
      
      // Wait for file creation
      await page.waitForTimeout(500);
      
      // Now try to fetch it
      const response = await request.get('http://localhost:8080/files/custom.txt');
      
      expect(response.ok()).toBeTruthy();
      const text = await response.text();
      expect(text).toBe('This is custom content');
    });
  });
});
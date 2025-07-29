const { test, expect } = require('@playwright/test');

test.describe('Phase 1: Request Context & Header Manipulation', () => {
  let apiContext;

  test.beforeAll(async ({ browser }) => {
    // Create a browser context with proper headers for SharedArrayBuffer
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    
    // Open Phase 1 test app
    const page = await context.newPage();
    await page.goto('/examples/phase1-test/');
    
    // Wait for page to load
    await page.waitForSelector('#startBtn');
    
    // Click start button
    await page.click('#startBtn');
    
    // Wait for connection
    await page.waitForSelector('.status.connected', { timeout: 10000 });
    
    // Keep the page open for the duration of tests
    apiContext = await context.request;
  });

  test('should expose request properties', async ({ request }) => {
    const response = await request.get('http://localhost:8080/req-test', {
      headers: {
        'Cookie': 'session=abc123; user=john'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body.ip).toBeTruthy();
    expect(body.protocol).toBe('http');
    expect(body.secure).toBe(false);
    expect(body.cookies).toBeTruthy();
    expect(body.cookies.session).toBe('abc123');
    expect(body.cookies.user).toBe('john');
  });

  test('should handle cookies and redirects', async ({ request }) => {
    const response = await request.get('http://localhost:8080/header-test', {
      maxRedirects: 0 // Don't follow redirects
    });
    
    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toBe('/target');
    expect(response.headers()['set-cookie']).toBeTruthy();
    expect(response.headers()['x-custom']).toBe('hello');
  });

  test('should append headers correctly', async ({ request }) => {
    const response = await request.get('http://localhost:8080/append-test');
    
    expect(response.ok()).toBeTruthy();
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-cache');
    expect(cacheControl).toContain('no-store');
  });

  test('should set multiple cookies', async ({ request }) => {
    const response = await request.get('http://localhost:8080/cookie-test');
    
    expect(response.ok()).toBeTruthy();
    const cookies = response.headers()['set-cookie'];
    expect(cookies).toBeTruthy();
    
    // Debug output
    console.log('Set-Cookie header:', cookies);
    console.log('Is array?', Array.isArray(cookies));
    
    // Parse cookies - Playwright concatenates multiple Set-Cookie headers with newlines
    const cookieArray = Array.isArray(cookies) ? cookies : cookies.split('\n');
    console.log('Cookie array:', cookieArray);
    
    expect(cookieArray.some(c => c.startsWith('test1='))).toBeTruthy();
    expect(cookieArray.some(c => c.startsWith('test2='))).toBeTruthy();
  });

  test('should clear cookies', async ({ request }) => {
    const response = await request.get('http://localhost:8080/clear-cookie-test');
    
    expect(response.ok()).toBeTruthy();
    const cookies = response.headers()['set-cookie'];
    expect(cookies).toBeTruthy();
    
    // Check for expired cookie
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    expect(cookieArray.some(c => c.includes('oldCookie=') && c.includes('Expires='))).toBeTruthy();
  });

  test('should handle redirect status codes', async ({ request }) => {
    const response = await request.get('http://localhost:8080/redirect-301', {
      maxRedirects: 0
    });
    
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toBe('/permanent');
  });
});
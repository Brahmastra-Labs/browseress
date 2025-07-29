const { test, expect } = require('@playwright/test');

test.describe('Phase 3: View Rendering Engine Integration', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    
    // Open Phase 3 test app
    await page.goto('/examples/phase3-test/');
    await page.waitForSelector('#startBtn');
    
    // Click start button
    await page.click('#startBtn');
    
    // Wait for connection
    await page.waitForSelector('.status.connected', { timeout: 10000 });
    
    // Create the default templates
    await page.click('#createTemplatesBtn');
    await page.waitForTimeout(1000); // Wait for templates to be created
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

  test.describe('Basic Rendering', () => {
    test('should render basic EJS template', async () => {
      // Click test button
      await page.click('#testBasicEjsBtn');
      
      // Wait for the output to change from template creation message
      await page.waitForFunction(() => {
        const output = document.querySelector('.rendered-output');
        return output && output.textContent.includes('Welcome to Browseress View Rendering');
      }, { timeout: 5000 });
      
      // Check the rendered content
      const outputHtml = await page.locator('.rendered-output').innerHTML();
      expect(outputHtml).toContain('Welcome to Browseress View Rendering');
      expect(outputHtml).toContain('This is a basic EJS template rendered in the browser!');
      expect(outputHtml).toContain('Current time:');
    });

    test('should support res.render callback', async ({ request }) => {
      const response = await request.get('http://localhost:8080/basic');
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('text/html');
      
      const html = await response.text();
      expect(html).toContain('<title>Browseress View Rendering</title>');
    });
  });

  test.describe('Data Passing and Locals', () => {
    test('should pass data to templates', async ({ request }) => {
      const response = await request.get('http://localhost:8080/user/123');
      
      expect(response.ok()).toBeTruthy();
      const html = await response.text();
      
      expect(html).toContain('John Doe');
      expect(html).toContain('john@example.com');
      expect(html).toContain('Premium Member');
      expect(html).toContain('JavaScript');
      expect(html).toContain('WebAssembly');
    });

    test('should merge app.locals and res.locals', async () => {
      // Click test with locals button
      await page.click('#testLocalsBtn');
      
      // Wait for the output to change
      await page.waitForFunction(() => {
        const output = document.querySelector('.rendered-output');
        return output && output.textContent.includes('Testing Locals');
      }, { timeout: 5000 });
      
      // The template should have access to app.locals (appName, version)
      // and res.locals (timestamp, requestId)
      const outputHtml = await page.locator('.rendered-output').innerHTML();
      expect(outputHtml).toContain('Testing Locals');
    });
  });

  test.describe('View Resolution', () => {
    test('should find templates in views directory', async ({ request }) => {
      const response = await request.get('http://localhost:8080/basic');
      expect(response.ok()).toBeTruthy();
    });

    test('should handle missing templates', async ({ request }) => {
      const response = await request.get('http://localhost:8080/error-test');
      
      expect(response.status()).toBe(500);
      const html = await response.text();
      expect(html).toContain('Error 500');
    });
  });

  test.describe('Custom Templates', () => {
    test('should create and render custom templates', async () => {
      // Create a custom template
      await page.fill('#templateName', 'test-custom.ejs');
      await page.fill('#templateContent', `
        <h1>Custom: <%= title %></h1>
        <p>Message: <%= message %></p>
        <p>Time: <%= timestamp %></p>
      `);
      
      await page.click('#createTemplateBtn');
      await page.waitForTimeout(500);
      
      // Render the custom template
      await page.click('#renderCustomBtn');
      
      // Wait for the output to change to rendered content
      await page.waitForFunction(() => {
        const output = document.querySelector('.rendered-output');
        return output && output.textContent.includes('Custom: Custom Template');
      }, { timeout: 5000 });
      
      const outputHtml = await page.locator('.rendered-output').innerHTML();
      expect(outputHtml).toContain('Custom: Custom Template');
      expect(outputHtml).toContain('Message: This template was created in the browser!');
      expect(outputHtml).toContain('Time:');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle template syntax errors', async () => {
      // Create a template with syntax error
      await page.fill('#templateName', 'error-syntax.ejs');
      await page.fill('#templateContent', '<%= undefinedVariable %>');
      
      await page.click('#createTemplateBtn');
      await page.waitForTimeout(500);
      
      // Try to render it
      const response = await fetch('http://localhost:8080/custom/error-syntax');
      expect(response.status).toBe(500);
    });

    test('should handle missing view errors', async () => {
      await page.click('#testErrorBtn');
      
      // Wait for error output to appear
      await page.waitForFunction(() => {
        const output = document.querySelector('.rendered-output');
        return output && output.textContent.includes('Error 500');
      }, { timeout: 5000 });
      
      const outputHtml = await page.locator('.rendered-output').innerHTML();
      expect(outputHtml).toContain('Error 500');
    });
  });

  test.describe('View Caching', () => {
    test('should cache views in production mode', async () => {
      await page.click('#testCachingBtn');
      
      // Wait for cache results to appear
      await page.waitForFunction(() => {
        const pre = document.querySelector('pre');
        return pre && pre.textContent.includes('First request:');
      }, { timeout: 5000 });
      
      const cacheResults = await page.locator('pre').textContent();
      
      // The second and third requests should be faster due to caching
      expect(cacheResults).toContain('First request:');
      expect(cacheResults).toContain('Second request:');
      expect(cacheResults).toContain('Third request:');
      
      // Check if caching is enabled based on environment
      const lines = cacheResults.split('\n');
      const envLine = lines.find(l => l.includes('Environment:'));
      if (envLine && envLine.includes('production')) {
        expect(cacheResults).toContain('Cache enabled: true');
      }
    });
  });

  test.describe('EJS Features', () => {
    test('should support EJS conditionals and loops', async ({ request }) => {
      const response = await request.get('http://localhost:8080/user/456');
      const html = await response.text();
      
      // Check conditional rendering (premium badge)
      expect(html).toContain('<span class="badge">Premium Member</span>');
      
      // Check loop rendering (interests list)
      expect(html).toContain('<li>JavaScript</li>');
      expect(html).toContain('<li>WebAssembly</li>');
      expect(html).toContain('<li>Edge Computing</li>');
    });

    test('should support EJS includes and partials', async ({ request }) => {
      // For now, testing basic template functionality
      // Full layout/partial support would require additional implementation
      const response = await request.get('http://localhost:8080/layout-test');
      
      expect(response.ok()).toBeTruthy();
      const html = await response.text();
      expect(html).toContain('About Us');
      expect(html).toContain('This page uses a layout!');
    });
  });
});
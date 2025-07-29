const { test, expect } = require('@playwright/test');

test.describe('Todo API Integration', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Open Todo app
    await page.goto('/examples/todo-app/');
    await page.waitForSelector('#startBtn');
    await page.click('#startBtn');
    await page.waitForSelector('.status.connected', { timeout: 10000 });
    
    // Clear any existing todos
    await page.evaluate(() => {
      return fetch('http://localhost:8080/todos', { method: 'DELETE' });
    });
  });

  test.describe('Basic CRUD Operations', () => {
    test('GET empty todos collection', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos');
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBeTruthy();
      expect(body.data.length).toBe(0);
      expect(body.pagination).toBeTruthy();
      expect(body.pagination.totalItems).toBe(0);
    });

    test('POST with missing title should fail', async ({ request }) => {
      const response = await request.post('http://localhost:8080/todos', {
        data: { completed: true }
      });
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
      expect(body.details.title).toBe('Title is required');
    });

    test('POST valid todo', async ({ request }) => {
      const response = await request.post('http://localhost:8080/todos', {
        data: { title: 'Test todo', completed: false }
      });
      
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeTruthy();
      expect(body.data.id).toBeTruthy();
      expect(body.data.title).toBe('Test todo');
      expect(body.data.completed).toBe(false);
    });

    test('GET single todo', async ({ request }) => {
      // First create a todo
      const createResponse = await request.post('http://localhost:8080/todos', {
        data: { title: 'Get test' }
      });
      const created = await createResponse.json();
      const todoId = created.data.id;
      
      // Then get it
      const response = await request.get(`http://localhost:8080/todos/${todoId}`);
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(todoId);
      expect(body.data.title).toBe('Get test');
    });

    test('DELETE todo', async ({ request }) => {
      // Create a todo
      const createResponse = await request.post('http://localhost:8080/todos', {
        data: { title: 'Delete test' }
      });
      const created = await createResponse.json();
      const todoId = created.data.id;
      
      // Delete it
      const response = await request.delete(`http://localhost:8080/todos/${todoId}`);
      expect(response.status()).toBe(204);
      
      // Verify it's gone
      const getResponse = await request.get(`http://localhost:8080/todos/${todoId}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Pagination', () => {
    test.beforeAll(async ({ request }) => {
      // Clear and create many todos
      await request.delete('http://localhost:8080/todos');
      
      for (let i = 1; i <= 15; i++) {
        await request.post('http://localhost:8080/todos', {
          data: { title: `Task ${i}` }
        });
      }
    });

    test('should paginate results', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos?limit=5');
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(5);
      expect(body.pagination.pageSize).toBe(5);
      expect(body.pagination.totalItems).toBe(15);
      expect(body.pagination.totalPages).toBe(3);
    });
  });
});
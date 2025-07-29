const { test, expect } = require('@playwright/test');

test.describe('Todo API Comprehensive Tests', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    
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

  test.afterAll(async () => {
    if (page) {
      const stopBtn = page.locator('#stopBtn');
      if (await stopBtn.isEnabled()) {
        await stopBtn.click();
        await page.waitForSelector('.status.disconnected', { timeout: 5000 });
      }
      await page.close();
    }
  });

  test.describe('Validation Tests', () => {
    test('POST with empty title should fail', async ({ request }) => {
      const response = await request.post('http://localhost:8080/todos', {
        data: { title: '' }
      });
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
      expect(body.details.title).toBe('Title is required');
    });

    test('GET non-existent todo', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos/999999');
      
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Todo not found');
    });

    test('GET with invalid ID format', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos/abc');
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid ID format');
    });
  });

  test.describe('Update Operations (PUT vs PATCH)', () => {
    let todoId;

    test.beforeAll(async ({ request }) => {
      const response = await request.post('http://localhost:8080/todos', {
        data: { title: 'Update test', completed: false }
      });
      const body = await response.json();
      todoId = body.data.id;
    });

    test('PUT full update', async ({ request }) => {
      const response = await request.put(`http://localhost:8080/todos/${todoId}`, {
        data: { title: 'Updated title', completed: true }
      });
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated title');
      expect(body.data.completed).toBe(true);
    });

    test('PUT with missing title should fail', async ({ request }) => {
      const response = await request.put(`http://localhost:8080/todos/${todoId}`, {
        data: { completed: true }
      });
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    test('PATCH partial update - title only', async ({ request }) => {
      const response = await request.patch(`http://localhost:8080/todos/${todoId}`, {
        data: { title: 'Patched title' }
      });
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Patched title');
      expect(body.data.completed).toBe(true); // Should remain unchanged
    });

    test('PATCH partial update - completed only', async ({ request }) => {
      const response = await request.patch(`http://localhost:8080/todos/${todoId}`, {
        data: { completed: false }
      });
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Patched title'); // Should remain unchanged
      expect(body.data.completed).toBe(false);
    });

    test('PATCH with empty title should fail', async ({ request }) => {
      const response = await request.patch(`http://localhost:8080/todos/${todoId}`, {
        data: { title: '' }
      });
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });
  });

  test.describe('Delete Operations', () => {
    test('DELETE non-existent todo', async ({ request }) => {
      const response = await request.delete('http://localhost:8080/todos/999999');
      
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Todo not found');
    });

    test('DELETE with invalid ID', async ({ request }) => {
      const response = await request.delete('http://localhost:8080/todos/abc');
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid ID format');
    });

    test('DELETE all todos', async ({ request }) => {
      // First clear any existing todos
      await request.delete('http://localhost:8080/todos');
      
      // Create exactly 3 todos
      await request.post('http://localhost:8080/todos', {
        data: { title: 'Todo 1' }
      });
      await request.post('http://localhost:8080/todos', {
        data: { title: 'Todo 2' }
      });
      await request.post('http://localhost:8080/todos', {
        data: { title: 'Todo 3' }
      });
      
      // Delete all
      const response = await request.delete('http://localhost:8080/todos');
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.deleted).toBe(3);
      
      // Verify they're gone
      const getResponse = await request.get('http://localhost:8080/todos');
      const getData = await getResponse.json();
      expect(getData.data.length).toBe(0);
    });
  });

  test.describe('Filtering and Search', () => {
    test.beforeAll(async ({ request }) => {
      // Clear and create test data
      await request.delete('http://localhost:8080/todos');
      
      const todos = [
        { title: 'Buy groceries', completed: false },
        { title: 'Read a book', completed: true },
        { title: 'Write code', completed: false },
        { title: 'Read documentation', completed: true },
        { title: 'Exercise', completed: false }
      ];
      
      for (const todo of todos) {
        await request.post('http://localhost:8080/todos', { data: todo });
      }
    });

    test('Filter completed todos', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos?completed=true');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      body.data.forEach(todo => {
        expect(todo.completed).toBe(true);
      });
    });

    test('Filter incomplete todos', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos?completed=false');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(3);
      body.data.forEach(todo => {
        expect(todo.completed).toBe(false);
      });
    });

    test('Search todos by title', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos?q=read');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2); // "Read a book" and "Read documentation"
      body.data.forEach(todo => {
        expect(todo.title.toLowerCase()).toContain('read');
      });
    });

    test('Search and filter combined', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos?q=read&completed=true');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      body.data.forEach(todo => {
        expect(todo.title.toLowerCase()).toContain('read');
        expect(todo.completed).toBe(true);
      });
    });
  });

  test.describe('Advanced Pagination', () => {
    test.beforeAll(async ({ request }) => {
      // Clear and create many todos
      await request.delete('http://localhost:8080/todos');
      
      for (let i = 1; i <= 15; i++) {
        await request.post('http://localhost:8080/todos', {
          data: { title: `Task ${i}` }
        });
      }
    });

    test('Get first page with default limit', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(10); // Default limit
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(10);
      expect(body.pagination.totalItems).toBe(15);
      expect(body.pagination.totalPages).toBe(2);
      expect(body.pagination.hasNext).toBe(true);
      expect(body.pagination.hasPrev).toBe(false);
      
      // Check headers
      expect(response.headers()['x-total-count']).toBe('15');
      expect(response.headers()['x-page']).toBe('1');
      expect(response.headers()['x-page-size']).toBe('10');
      expect(response.headers()['x-total-pages']).toBe('2');
    });

    test('Get second page', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos?page=2');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data.length).toBe(5);
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.hasNext).toBe(false);
      expect(body.pagination.hasPrev).toBe(true);
    });

    test('Custom page size', async ({ request }) => {
      const response = await request.get('http://localhost:8080/todos?limit=5');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.data.length).toBe(5);
      expect(body.pagination.pageSize).toBe(5);
      expect(body.pagination.totalPages).toBe(3);
    });
  });

  test.describe('OPTIONS and HEAD requests', () => {
    test('OPTIONS on /todos', async ({ request }) => {
      const response = await request.fetch('http://localhost:8080/todos', {
        method: 'OPTIONS'
      });
      
      expect(response.status()).toBe(204);
      expect(response.headers()['allow']).toBeTruthy();
      expect(response.headers()['access-control-allow-methods']).toBeTruthy();
    });

    test('OPTIONS on /todos/:id', async ({ request }) => {
      const response = await request.fetch('http://localhost:8080/todos/1', {
        method: 'OPTIONS'
      });
      
      expect(response.status()).toBe(204);
      expect(response.headers()['allow']).toBeTruthy();
    });

    test('HEAD on collection', async ({ request }) => {
      // Ensure we have some todos
      await request.post('http://localhost:8080/todos', {
        data: { title: 'HEAD test' }
      });
      
      const response = await request.head('http://localhost:8080/todos');
      
      expect(response.ok()).toBeTruthy();
      const body = await response.text();
      expect(body).toBe(''); // HEAD has no body
      expect(response.headers()['x-total-count']).toBeTruthy(); // But has headers
    });
  });
});
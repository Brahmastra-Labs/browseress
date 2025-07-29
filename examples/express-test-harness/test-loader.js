// Test Loader for Express Test Harness
// This module handles loading and transforming Express tests for browser compatibility

class TestLoader {
  constructor() {
    this.testFiles = new Map();
    this.transformedTests = new Map();
    this.categories = {
      PASS: [],
      ADAPTED: [],
      NOT_APPLICABLE: [],
      BUG: []
    };
  }

  // Register a test file with its content
  registerTestFile(path, content) {
    this.testFiles.set(path, content);
  }

  // Transform Express test code for browser compatibility
  transformTest(testCode, metadata = {}) {
    let transformed = testCode;
    
    // Replace require statements
    transformed = transformed.replace(
      /const express = require\(['"]express['"]\);?/g,
      'const express = window.browseress.express;'
    );
    
    transformed = transformed.replace(
      /const request = require\(['"]supertest['"]\);?/g,
      'const request = window.supertest;'
    );
    
    // Remove module.exports
    transformed = transformed.replace(/module\.exports\s*=\s*/, 'window.currentTest = ');
    
    // Handle file system operations (mark as NOT_APPLICABLE)
    if (transformed.includes('fs.') || transformed.includes("require('fs')")) {
      metadata.category = 'NOT_APPLICABLE';
      metadata.reason = 'Uses Node.js fs module';
    }
    
    // Handle child_process (mark as NOT_APPLICABLE)
    if (transformed.includes('child_process') || transformed.includes('spawn')) {
      metadata.category = 'NOT_APPLICABLE';
      metadata.reason = 'Uses child_process module';
    }
    
    // Handle net/http modules (mark as ADAPTED)
    if (transformed.includes("require('http')") || transformed.includes("require('net')")) {
      metadata.category = 'ADAPTED';
      metadata.reason = 'HTTP/Net modules adapted for browser';
    }
    
    // Store transformed test with metadata
    this.transformedTests.set(metadata.name || 'unnamed', {
      code: transformed,
      metadata
    });
    
    return { code: transformed, metadata };
  }

  // Load Express test definitions
  loadExpressTests() {
    // This would be populated from actual Express test files
    // For now, we'll define some test suites that can be loaded
    const testSuites = {
      'res.json': {
        path: 'test/res.json.js',
        tests: [
          {
            name: 'should respond with json object',
            setup: `
              app.get('/json', function(req, res) {
                res.json({ name: 'tobi' });
              });
            `,
            test: `
              const res = await request(app)
                .get('/json')
                .expect(200)
                .end();
              
              expect(res.headers['content-type']).toContain('application/json');
              expect(res.body).toEqual({ name: 'tobi' });
            `
          },
          {
            name: 'should respond with json number',
            setup: `
              app.get('/json-number', function(req, res) {
                res.json(200);
              });
            `,
            test: `
              const res = await request(app)
                .get('/json-number')
                .expect(200)
                .end();
              
              expect(res.headers['content-type']).toContain('application/json');
              expect(res.text).toBe('200');
            `
          }
        ]
      },
      'res.send': {
        path: 'test/res.send.js',
        tests: [
          {
            name: 'should send string',
            setup: `
              app.get('/string', function(req, res) {
                res.send('hello world');
              });
            `,
            test: `
              const res = await request(app)
                .get('/string')
                .expect(200)
                .end();
              
              expect(res.headers['content-type']).toContain('text/html');
              expect(res.text).toBe('hello world');
            `
          },
          {
            name: 'should send buffer',
            setup: `
              app.get('/buffer', function(req, res) {
                res.send(Buffer.from('hello'));
              });
            `,
            test: `
              const res = await request(app)
                .get('/buffer')
                .expect(200)
                .end();
              
              expect(res.headers['content-type']).toContain('application/octet-stream');
              expect(res.text).toBe('hello');
            `
          }
        ]
      },
      'res.status': {
        path: 'test/res.status.js',
        tests: [
          {
            name: 'should set status code',
            setup: `
              app.get('/status', function(req, res) {
                res.status(201).send('created');
              });
            `,
            test: `
              const res = await request(app)
                .get('/status')
                .expect(201)
                .end();
              
              expect(res.text).toBe('created');
            `
          },
          {
            name: 'should chain with json',
            setup: `
              app.get('/chain', function(req, res) {
                res.status(400).json({ error: 'bad request' });
              });
            `,
            test: `
              const res = await request(app)
                .get('/chain')
                .expect(400)
                .end();
              
              expect(res.body).toEqual({ error: 'bad request' });
            `
          }
        ]
      },
      'res.set': {
        path: 'test/res.set.js',
        tests: [
          {
            name: 'should set header',
            setup: `
              app.get('/header', function(req, res) {
                res.set('X-Custom', 'value');
                res.send('ok');
              });
            `,
            test: `
              const res = await request(app)
                .get('/header')
                .expect(200)
                .end();
              
              expect(res.headers['x-custom']).toBe('value');
            `
          },
          {
            name: 'should set multiple headers',
            setup: `
              app.get('/headers', function(req, res) {
                res.set({
                  'X-One': 'foo',
                  'X-Two': 'bar'
                });
                res.send('ok');
              });
            `,
            test: `
              const res = await request(app)
                .get('/headers')
                .expect(200)
                .end();
              
              expect(res.headers['x-one']).toBe('foo');
              expect(res.headers['x-two']).toBe('bar');
            `
          }
        ]
      },
      'app.use': {
        path: 'test/app.use.js',
        tests: [
          {
            name: 'should execute middleware',
            setup: `
              let called = false;
              app.use(function(req, res, next) {
                called = true;
                next();
              });
              app.get('/test', function(req, res) {
                res.json({ called });
              });
            `,
            test: `
              const res = await request(app)
                .get('/test')
                .expect(200)
                .end();
              
              expect(res.body.called).toBe(true);
            `
          },
          {
            name: 'should handle middleware errors',
            setup: `
              app.use(function(req, res, next) {
                if (req.url === '/error') {
                  next(new Error('middleware error'));
                } else {
                  next();
                }
              });
              app.get('/test', function(req, res) {
                res.send('ok');
              });
              app.use(function(err, req, res, next) {
                res.status(500).json({ error: err.message });
              });
            `,
            test: `
              const res = await request(app)
                .get('/error')
                .expect(500)
                .end();
              
              expect(res.body.error).toBe('middleware error');
            `
          }
        ]
      }
    };
    
    return testSuites;
  }

  // Generate test runner code for a suite
  generateTestRunner(suiteName, tests) {
    const setup = tests.map(t => t.setup).join('\n');
    const testCases = tests.map(t => `
      it('${t.name}', async function() {
        ${t.test}
      });
    `).join('\n');
    
    return `
      describe('${suiteName}', function() {
        before(async function() {
          // Create Express app
          app = express();
          
          // Add CORS middleware
          app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
              return res.sendStatus(200);
            }
            next();
          });
          
          ${setup}
          
          // Use the existing transport connection
          app.listen(transport);
        });
        
        after(function() {
          app = null;
        });
        
        ${testCases}
      });
    `;
  }
}

// Export for use in test harness
window.TestLoader = TestLoader;
'use strict'

var assert = require('assert')
var http = require('http')

describe('Browseress REST API Integration', function() {
  this.timeout(5000) // Increase timeout for integration tests
  
  var baseUrl = 'http://localhost:8080'
  var agent = new http.Agent({ keepAlive: false }) // Disable keep-alive
  
  // Helper to make HTTP requests
  function request(method, path, data, callback) {
    if (typeof data === 'function') {
      callback = data
      data = null
    }
    
    var options = {
      method: method,
      hostname: 'localhost',
      port: 8080,
      path: path,
      headers: {
        'Connection': 'close'  // Ensure connections are closed after each request
      }
    }
    
    if (data) {
      var body = JSON.stringify(data)
      options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = body.length
    }
    
    options.agent = agent  // Use our non-keep-alive agent
    
    var req = http.request(options, function(res) {
      var body = ''
      res.on('data', function(chunk) { body += chunk })
      res.on('end', function() {
        var json = null
        if (body && res.headers['content-type'] && res.headers['content-type'].includes('json')) {
          try {
            json = JSON.parse(body)
          } catch (e) {
            // Not JSON
          }
        }
        callback(null, res, json || body)
      })
    })
    
    req.on('error', callback)
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  }
  
  before(function(done) {
    // Clear all todos before starting tests
    request('DELETE', '/todos', function(err, res) {
      if (err) return done(err)
      console.log('    Cleared existing todos')
      done()
    })
  })
  
  after(function() {
    // Destroy the agent to close all connections
    agent.destroy()
  })
  
  describe('Basic CRUD Operations', function() {
    var todoId
    
    it('GET empty todos collection', function(done) {
      request('GET', '/todos', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 0)
        done()
      })
    })
    
    it('POST with missing title should fail', function(done) {
      request('POST', '/todos', { completed: true }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.error, 'Validation failed')
        assert.strictEqual(body.details.title, 'Title is required')
        done()
      })
    })
    
    it('POST with empty title should fail', function(done) {
      request('POST', '/todos', { title: '', completed: true }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.error, 'Validation failed')
        done()
      })
    })
    
    it('POST valid todo', function(done) {
      request('POST', '/todos', { title: 'Write tests', completed: false }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 201)
        assert.strictEqual(body.title, 'Write tests')
        assert.strictEqual(body.completed, false)
        assert(body.id)
        assert(body.createdAt)
        todoId = body.id
        done()
      })
    })
    
    it('GET single todo', function(done) {
      request('GET', '/todos/' + todoId, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.id, todoId)
        assert.strictEqual(body.title, 'Write tests')
        done()
      })
    })
    
    it('GET non-existent todo', function(done) {
      request('GET', '/todos/999999', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 404)
        assert.strictEqual(body.error, 'Todo not found')
        done()
      })
    })
    
    it('GET with invalid ID format', function(done) {
      request('GET', '/todos/abc', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.error, 'Invalid ID format')
        done()
      })
    })
  })
  
  describe('Update Operations (PUT vs PATCH)', function() {
    var todoId
    
    before(function(done) {
      request('POST', '/todos', { title: 'Update test', completed: false }, function(err, res, body) {
        if (err) return done(err)
        todoId = body.id
        done()
      })
    })
    
    it('PUT full update', function(done) {
      request('PUT', '/todos/' + todoId, { title: 'Updated title', completed: true }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.title, 'Updated title')
        assert.strictEqual(body.completed, true)
        done()
      })
    })
    
    it('PUT with missing title should fail', function(done) {
      request('PUT', '/todos/' + todoId, { completed: false }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.error, 'Validation failed')
        done()
      })
    })
    
    it('PATCH partial update - title only', function(done) {
      request('PATCH', '/todos/' + todoId, { title: 'Patched title' }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.title, 'Patched title')
        assert.strictEqual(body.completed, true) // Should remain unchanged
        done()
      })
    })
    
    it('PATCH partial update - completed only', function(done) {
      request('PATCH', '/todos/' + todoId, { completed: false }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.completed, false)
        assert.strictEqual(body.title, 'Patched title') // Should remain unchanged
        done()
      })
    })
    
    it('PATCH with empty title should fail', function(done) {
      request('PATCH', '/todos/' + todoId, { title: '' }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.error, 'Validation failed')
        done()
      })
    })
  })
  
  describe('Delete Operations', function() {
    var todoId
    
    beforeEach(function(done) {
      request('POST', '/todos', { title: 'Delete test', completed: false }, function(err, res, body) {
        if (err) return done(err)
        todoId = body.id
        done()
      })
    })
    
    it('DELETE existing todo', function(done) {
      request('DELETE', '/todos/' + todoId, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 204)
        assert.strictEqual(body, '') // No content
        done()
      })
    })
    
    it('DELETE non-existent todo', function(done) {
      request('DELETE', '/todos/999999', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 404)
        assert.strictEqual(body.error, 'Todo not found')
        done()
      })
    })
    
    it('DELETE with invalid ID', function(done) {
      request('DELETE', '/todos/xyz', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.error, 'Invalid ID format')
        done()
      })
    })
    
    it('DELETE all todos', function(done) {
      // Create a few todos first
      var count = 0
      function createTodo() {
        request('POST', '/todos', { title: 'Todo ' + (++count) }, function(err) {
          if (err) return done(err)
          if (count < 3) {
            createTodo()
          } else {
            // Now delete all
            request('DELETE', '/todos', function(err, res, body) {
              if (err) return done(err)
              assert.strictEqual(res.statusCode, 200)
              // Just verify that we deleted at least the todos we created
              assert(body.deleted >= 4, 'Should have deleted at least 4 todos (got ' + body.deleted + ')')
              done()
            })
          }
        })
      }
      createTodo()
    })
  })
  
  describe('Filtering and Search', function() {
    before(function(done) {
      // Clear and create test data
      request('DELETE', '/todos', function(err) {
        if (err) return done(err)
        
        var todos = [
          { title: 'Buy groceries', completed: false },
          { title: 'Buy milk', completed: true },
          { title: 'Read book', completed: true },
          { title: 'Write code', completed: false }
        ]
        
        var created = 0
        todos.forEach(function(todo) {
          request('POST', '/todos', todo, function(err) {
            if (err) return done(err)
            if (++created === todos.length) done()
          })
        })
      })
    })
    
    it('Filter completed todos', function(done) {
      request('GET', '/todos?completed=true', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 2)
        body.forEach(function(todo) {
          assert.strictEqual(todo.completed, true)
        })
        done()
      })
    })
    
    it('Filter incomplete todos', function(done) {
      request('GET', '/todos?completed=false', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 2)
        body.forEach(function(todo) {
          assert.strictEqual(todo.completed, false)
        })
        done()
      })
    })
    
    it('Search todos by title', function(done) {
      request('GET', '/todos?q=buy', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 2)
        body.forEach(function(todo) {
          assert(todo.title.toLowerCase().includes('buy'))
        })
        done()
      })
    })
    
    it('Search and filter combined', function(done) {
      request('GET', '/todos?q=buy&completed=false', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 1)
        assert.strictEqual(body[0].title, 'Buy groceries')
        assert.strictEqual(body[0].completed, false)
        done()
      })
    })
  })
  
  describe('Pagination', function() {
    before(function(done) {
      // Clear and create many todos
      request('DELETE', '/todos', function(err) {
        if (err) return done(err)
        
        var created = 0
        var total = 15
        
        function createNext() {
          if (created >= total) return done()
          
          request('POST', '/todos', { title: 'Task ' + (created + 1) }, function(err) {
            if (err) return done(err)
            created++
            createNext()
          })
        }
        
        createNext()
      })
    })
    
    it('Get first page with default limit', function(done) {
      request('GET', '/todos?page=1', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 10) // Default limit
        assert.strictEqual(res.headers['x-total-count'], '15')
        assert.strictEqual(res.headers['x-page'], '1')
        assert.strictEqual(res.headers['x-limit'], '10')
        done()
      })
    })
    
    it('Get second page', function(done) {
      request('GET', '/todos?page=2', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 5) // Remaining todos
        done()
      })
    })
    
    it('Custom page size', function(done) {
      request('GET', '/todos?page=1&limit=5', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(Array.isArray(body))
        assert.strictEqual(body.length, 5)
        assert.strictEqual(res.headers['x-limit'], '5')
        done()
      })
    })
  })
  
  describe('OPTIONS (CORS)', function() {
    it('OPTIONS on /todos', function(done) {
      request('OPTIONS', '/todos', function(err, res) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 204)
        assert(res.headers['allow'])
        assert(res.headers['access-control-allow-methods'])
        done()
      })
    })
    
    it('OPTIONS on /todos/:id', function(done) {
      request('OPTIONS', '/todos/1', function(err, res) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 204)
        assert(res.headers['allow'])
        done()
      })
    })
  })
  
  describe('Error Handling', function() {
    it('Unknown route returns 404', function(done) {
      request('GET', '/unknown', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 404)
        assert.strictEqual(body.error, 'Not found')
        done()
      })
    })
    
    it('HEAD method on GET route', function(done) {
      request('HEAD', '/todos', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body, '') // HEAD has no body
        assert(res.headers['x-total-count']) // But has headers
        done()
      })
    })
  })
  
  describe('Idempotency', function() {
    it('PUT is idempotent', function(done) {
      var todoData = { title: 'Idempotency test', completed: false }
      
      // Create todo
      request('POST', '/todos', todoData, function(err, res, body) {
        if (err) return done(err)
        var todoId = body.id
        
        var updateData = { title: 'Idempotency test', completed: true }
        var results = []
        
        // PUT three times with same data
        function doPut(count) {
          if (count === 0) {
            // Verify all results are identical
            assert.strictEqual(results[0].title, results[1].title)
            assert.strictEqual(results[0].completed, results[1].completed)
            assert.strictEqual(results[1].title, results[2].title)
            assert.strictEqual(results[1].completed, results[2].completed)
            return done()
          }
          
          request('PUT', '/todos/' + todoId, updateData, function(err, res, body) {
            if (err) return done(err)
            assert.strictEqual(res.statusCode, 200)
            results.push(body)
            doPut(count - 1)
          })
        }
        
        doPut(3)
      })
    })
  })
})
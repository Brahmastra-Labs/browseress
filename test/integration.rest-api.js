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
  
  describe('Basic CRUD Operations', function() {
    it('GET empty todos collection', function(done) {
      request('GET', '/todos', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 0)
        assert(body.pagination)
        assert.strictEqual(body.pagination.totalItems, 0)
        done()
      })
    })
    
    it('POST with missing title should fail', function(done) {
      request('POST', '/todos', { completed: true }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.success, false)
        assert.strictEqual(body.error, 'Validation failed')
        assert.strictEqual(body.details.title, 'Title is required')
        done()
      })
    })
    
    it('POST with empty title should fail', function(done) {
      request('POST', '/todos', { title: '' }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.success, false)
        assert.strictEqual(body.error, 'Validation failed')
        assert.strictEqual(body.details.title, 'Title is required')
        done()
      })
    })
    
    it('POST valid todo', function(done) {
      request('POST', '/todos', { title: 'Test todo', completed: false }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 201)
        assert.strictEqual(body.success, true)
        assert(body.data)
        assert(body.data.id)
        assert.strictEqual(body.data.title, 'Test todo')
        assert.strictEqual(body.data.completed, false)
        assert(body.data.createdAt)
        assert(body.data.updatedAt)
        assert(res.headers['location'])
        done()
      })
    })
    
    it('GET single todo', function(done) {
      request('POST', '/todos', { title: 'Get test' }, function(err, res, body) {
        if (err) return done(err)
        var todoId = body.data.id
        
        request('GET', '/todos/' + todoId, function(err, res, body) {
          if (err) return done(err)
          assert.strictEqual(res.statusCode, 200)
          assert.strictEqual(body.success, true)
          assert(body.data)
          assert.strictEqual(body.data.id, todoId)
          assert.strictEqual(body.data.title, 'Get test')
          done()
        })
      })
    })
    
    it('GET non-existent todo', function(done) {
      request('GET', '/todos/999999', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 404)
        assert.strictEqual(body.success, false)
        assert.strictEqual(body.error, 'Todo not found')
        done()
      })
    })
    
    it('GET with invalid ID format', function(done) {
      request('GET', '/todos/abc', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.success, false)
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
        todoId = body.data.id
        done()
      })
    })
    
    it('PUT full update', function(done) {
      request('PUT', '/todos/' + todoId, { title: 'Updated title', completed: true }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert.strictEqual(body.data.title, 'Updated title')
        assert.strictEqual(body.data.completed, true)
        assert(body.data.updatedAt)
        done()
      })
    })
    
    it('PUT with missing title should fail', function(done) {
      request('PUT', '/todos/' + todoId, { completed: true }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.success, false)
        assert.strictEqual(body.error, 'Validation failed')
        done()
      })
    })
    
    it('PATCH partial update - title only', function(done) {
      request('PATCH', '/todos/' + todoId, { title: 'Patched title' }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert.strictEqual(body.data.title, 'Patched title')
        assert.strictEqual(body.data.completed, true) // Should remain unchanged
        done()
      })
    })
    
    it('PATCH partial update - completed only', function(done) {
      request('PATCH', '/todos/' + todoId, { completed: false }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert.strictEqual(body.data.title, 'Patched title') // Should remain unchanged
        assert.strictEqual(body.data.completed, false)
        done()
      })
    })
    
    it('PATCH with empty title should fail', function(done) {
      request('PATCH', '/todos/' + todoId, { title: '' }, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.success, false)
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
        todoId = body.data.id
        done()
      })
    })
    
    it('DELETE existing todo', function(done) {
      request('DELETE', '/todos/' + todoId, function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 204)
        assert.strictEqual(body, '') // No content
        
        // Verify it's gone
        request('GET', '/todos/' + todoId, function(err, res, body) {
          if (err) return done(err)
          assert.strictEqual(res.statusCode, 404)
          assert.strictEqual(body.success, false)
          done()
        })
      })
    })
    
    it('DELETE non-existent todo', function(done) {
      request('DELETE', '/todos/999999', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 404)
        assert.strictEqual(body.success, false)
        assert.strictEqual(body.error, 'Todo not found')
        done()
      })
    })
    
    it('DELETE with invalid ID', function(done) {
      request('DELETE', '/todos/abc', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 400)
        assert.strictEqual(body.success, false)
        assert.strictEqual(body.error, 'Invalid ID format')
        done()
      })
    })
    
    it('DELETE all todos', function(done) {
      // First clear any existing todos
      request('DELETE', '/todos', function(err) {
        if (err) return done(err)
        
        // Create a few todos
        request('POST', '/todos', { title: 'Todo 1' }, function(err) {
          if (err) return done(err)
          request('POST', '/todos', { title: 'Todo 2' }, function(err) {
            if (err) return done(err)
            request('POST', '/todos', { title: 'Todo 3' }, function(err) {
              if (err) return done(err)
              
              // Delete all
              request('DELETE', '/todos', function(err, res, body) {
                if (err) return done(err)
                assert.strictEqual(res.statusCode, 200)
                assert.strictEqual(body.success, true)
                assert.strictEqual(body.deleted, 3)
                
                // Verify they're gone
                request('GET', '/todos', function(err, res, body) {
                  if (err) return done(err)
                  assert.strictEqual(body.data.length, 0)
                  done()
                })
              })
            })
          })
        })
      })
    })
  })
  
  describe('Filtering and Search', function() {
    before(function(done) {
      // Clear and create test data
      request('DELETE', '/todos', function(err) {
        if (err) return done(err)
        
        var todos = [
          { title: 'Buy groceries', completed: false },
          { title: 'Read a book', completed: true },
          { title: 'Write code', completed: false },
          { title: 'Read documentation', completed: true },
          { title: 'Exercise', completed: false }
        ]
        
        var created = 0
        todos.forEach(function(todo) {
          request('POST', '/todos', todo, function(err) {
            if (err) return done(err)
            created++
            if (created === todos.length) done()
          })
        })
      })
    })
    
    after(function(done) {
      // Clean up after these tests
      request('DELETE', '/todos', done)
    })
    
    it('Filter completed todos', function(done) {
      request('GET', '/todos?completed=true', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 2)
        body.data.forEach(function(todo) {
          assert.strictEqual(todo.completed, true)
        })
        done()
      })
    })
    
    it('Filter incomplete todos', function(done) {
      request('GET', '/todos?completed=false', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 3)
        body.data.forEach(function(todo) {
          assert.strictEqual(todo.completed, false)
        })
        done()
      })
    })
    
    it('Search todos by title', function(done) {
      request('GET', '/todos?q=read', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 2) // "Read a book" and "Read documentation"
        body.data.forEach(function(todo) {
          assert(todo.title.toLowerCase().includes('read'))
        })
        done()
      })
    })
    
    it('Search and filter combined', function(done) {
      request('GET', '/todos?q=read&completed=true', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 2)
        body.data.forEach(function(todo) {
          assert(todo.title.toLowerCase().includes('read'))
          assert.strictEqual(todo.completed, true)
        })
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
        
        for (var i = 1; i <= total; i++) {
          request('POST', '/todos', { title: 'Task ' + i }, function(err) {
            if (err) return done(err)
            created++
            if (created === total) done()
          })
        }
      })
    })
    
    it('Get first page with default limit', function(done) {
      request('GET', '/todos', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 10) // Default limit
        assert.strictEqual(body.pagination.page, 1)
        assert.strictEqual(body.pagination.pageSize, 10)
        assert.strictEqual(body.pagination.totalItems, 15)
        assert.strictEqual(body.pagination.totalPages, 2)
        assert.strictEqual(body.pagination.hasNext, true)
        assert.strictEqual(body.pagination.hasPrev, false)
        // Also check headers
        assert.strictEqual(res.headers['x-total-count'], '15')
        assert.strictEqual(res.headers['x-page'], '1')
        assert.strictEqual(res.headers['x-page-size'], '10')
        assert.strictEqual(res.headers['x-total-pages'], '2')
        done()
      })
    })
    
    it('Get second page', function(done) {
      request('GET', '/todos?page=2', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 5)
        assert.strictEqual(body.pagination.page, 2)
        assert.strictEqual(body.pagination.hasNext, false)
        assert.strictEqual(body.pagination.hasPrev, true)
        done()
      })
    })
    
    it('Custom page size', function(done) {
      request('GET', '/todos?limit=5', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body.success, true)
        assert(Array.isArray(body.data))
        assert.strictEqual(body.data.length, 5)
        assert.strictEqual(body.pagination.pageSize, 5)
        assert.strictEqual(body.pagination.totalPages, 3)
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
  
  describe('HEAD requests', function() {
    before(function(done) {
      // Ensure we have some todos
      request('DELETE', '/todos', function(err) {
        if (err) return done(err)
        request('POST', '/todos', { title: 'HEAD test' }, done)
      })
    })
    
    it('HEAD on collection', function(done) {
      request('HEAD', '/todos', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(body, '') // HEAD has no body
        assert(res.headers['x-total-count']) // But has headers
        done()
      })
    })
  })
})
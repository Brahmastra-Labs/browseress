'use strict'

var assert = require('assert')
var http = require('http')

describe('Browseress Phase 1 Integration Tests', function() {
  this.timeout(5000)
  
  var agent = new http.Agent({ keepAlive: false })
  
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
        'Connection': 'close',
        'Cookie': 'session=abc123; user=john'  // Add test cookies
      },
      agent: agent
    }
    
    if (data) {
      var body = JSON.stringify(data)
      options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = body.length
    }
    
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
    console.log('    NOTE: This test requires the Phase 1 test app to be running')
    console.log('    1. Start relay server: node relay-server.js')
    console.log('    2. Open: http://localhost:9000/examples/phase1-test/')
    console.log('    3. Click "Start Test Server"')
    console.log('')
    
    // Give a moment for the tester to ensure the server is ready
    setTimeout(done, 100)
  })
  
  describe('Request Properties (Task 1.2)', function() {
    it('should expose request properties', function(done) {
      request('GET', '/req-test', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        assert(body.ip)
        assert.strictEqual(body.protocol, 'http')
        assert.strictEqual(body.secure, false)
        assert(body.cookies)
        assert.strictEqual(body.cookies.session, 'abc123')
        assert.strictEqual(body.cookies.user, 'john')
        done()
      })
    })
  })
  
  describe('Response Headers (Task 1.3)', function() {
    it('should handle cookies and redirects', function(done) {
      request('GET', '/header-test', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 302)
        assert(res.headers['set-cookie'])
        assert(res.headers['x-custom'] === 'hello')
        assert.strictEqual(res.headers['location'], '/target')
        done()
      })
    })
    
    it('should append headers correctly', function(done) {
      request('GET', '/append-test', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        // Check if multiple values were appended
        var cacheControl = res.headers['cache-control']
        assert(cacheControl)
        // Node.js concatenates multiple header values with ', '
        assert(cacheControl.includes('no-cache') && cacheControl.includes('no-store'))
        done()
      })
    })
    
    it('should set multiple cookies', function(done) {
      request('GET', '/cookie-test', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        var cookies = res.headers['set-cookie']
        assert(Array.isArray(cookies))
        assert(cookies.length >= 2)
        assert(cookies.some(c => c.startsWith('test1=')))
        assert(cookies.some(c => c.startsWith('test2=')))
        done()
      })
    })
    
    it('should clear cookies', function(done) {
      request('GET', '/clear-cookie-test', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 200)
        var cookies = res.headers['set-cookie']
        assert(cookies)
        // Check for expired cookie
        assert(cookies.some(c => c.includes('oldCookie=') && c.includes('Expires=')))
        done()
      })
    })
    
    it('should handle redirect status codes', function(done) {
      request('GET', '/redirect-301', function(err, res, body) {
        if (err) return done(err)
        assert.strictEqual(res.statusCode, 301)
        assert.strictEqual(res.headers['location'], '/permanent')
        done()
      })
    })
  })
})
'use strict'

var assert = require('assert')
var express = require('../')
var WebSocketTransport = require('../lib/transports/ws-transport')
var WebSocket = require('ws')
var http = require('http')

describe('Browseress Integration', function() {
  var relayServer
  var wsServer
  var httpPort = 9080
  var wsPort = 9001
  
  // Simple relay server for testing
  before(function(done) {
    var pendingRequests = new Map()
    var browserClient = null
    var requestId = 0
    
    // HTTP server
    relayServer = http.createServer(function(req, res) {
      if (!browserClient) {
        res.writeHead(503)
        res.end('No browser connected')
        return
      }
      
      var id = ++requestId
      pendingRequests.set(id, res)
      
      var body = ''
      req.on('data', function(chunk) { body += chunk })
      req.on('end', function() {
        browserClient.send(JSON.stringify({
          id: id,
          type: 'http-request',
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body
        }))
      })
    })
    
    // WebSocket server
    wsServer = new WebSocket.Server({ port: wsPort })
    
    wsServer.on('connection', function(ws) {
      browserClient = ws
      
      ws.on('message', function(data) {
        var msg = JSON.parse(data)
        if (msg.type === 'http-response' && pendingRequests.has(msg.id)) {
          var res = pendingRequests.get(msg.id)
          pendingRequests.delete(msg.id)
          res.writeHead(msg.statusCode || 200, msg.headers || {})
          res.end(msg.body || '')
        }
      })
      
      ws.on('close', function() {
        browserClient = null
      })
    })
    
    relayServer.listen(httpPort, done)
  })
  
  after(function(done) {
    // Close WebSocket server first, then HTTP server
    wsServer.close(function() {
      relayServer.close(done)
    })
  })
  
  it('should handle GET request through WebSocket transport', function(done) {
    var app = express()
    var transport = new WebSocketTransport('ws://localhost:' + wsPort)
    
    app.get('/test', function(req, res) {
      res.json({ message: 'Hello from Browseress!' })
    })
    
    app.listen(transport, function() {
      // Make HTTP request to relay server
      http.get('http://localhost:' + httpPort + '/test', function(res) {
        var body = ''
        res.on('data', function(chunk) { body += chunk })
        res.on('end', function() {
          assert.strictEqual(res.statusCode, 200)
          assert.strictEqual(res.headers['content-type'], 'application/json')
          
          var data = JSON.parse(body)
          assert.strictEqual(data.message, 'Hello from Browseress!')
          
          transport.close()
          done()
        })
      })
    })
  })
  
  it('should handle POST request with body', function(done) {
    var app = express()
    var transport = new WebSocketTransport('ws://localhost:' + wsPort)
    
    app.use(function(req, res, next) {
      var body = ''
      req.on('data', function(chunk) { body += chunk })
      req.on('end', function() {
        req.body = body ? JSON.parse(body) : {}
        next()
      })
    })
    
    app.post('/users', function(req, res) {
      res.status(201).json({
        id: 123,
        name: req.body.name
      })
    })
    
    app.listen(transport, function() {
      var postData = JSON.stringify({ name: 'Test User' })
      
      var req = http.request({
        hostname: 'localhost',
        port: httpPort,
        path: '/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      }, function(res) {
        var body = ''
        res.on('data', function(chunk) { body += chunk })
        res.on('end', function() {
          assert.strictEqual(res.statusCode, 201)
          
          var data = JSON.parse(body)
          assert.strictEqual(data.id, 123)
          assert.strictEqual(data.name, 'Test User')
          
          transport.close()
          done()
        })
      })
      
      req.write(postData)
      req.end()
    })
  })
  
  it('should handle 404 errors', function(done) {
    var app = express()
    var transport = new WebSocketTransport('ws://localhost:' + wsPort)
    
    app.use(function(req, res) {
      res.status(404).json({ error: 'Not found' })
    })
    
    app.listen(transport, function() {
      http.get('http://localhost:' + httpPort + '/nonexistent', function(res) {
        var body = ''
        res.on('data', function(chunk) { body += chunk })
        res.on('end', function() {
          assert.strictEqual(res.statusCode, 404)
          
          var data = JSON.parse(body)
          assert.strictEqual(data.error, 'Not found')
          
          transport.close()
          done()
        })
      })
    })
  })
  
  it('should handle multiple concurrent requests', function(done) {
    var app = express()
    var transport = new WebSocketTransport('ws://localhost:' + wsPort)
    var completed = 0
    var total = 5
    
    app.get('/count/:id', function(req, res) {
      setTimeout(function() {
        res.json({ id: req.params.id })
      }, Math.random() * 50)
    })
    
    app.listen(transport, function() {
      for (var i = 1; i <= total; i++) {
        (function(id) {
          http.get('http://localhost:' + httpPort + '/count/' + id, function(res) {
            var body = ''
            res.on('data', function(chunk) { body += chunk })
            res.on('end', function() {
              var data = JSON.parse(body)
              assert.strictEqual(data.id, String(id))
              
              completed++
              if (completed === total) {
                transport.close()
                done()
              }
            })
          })
        })(i)
      }
    })
  })
})
'use strict'

var assert = require('node:assert')
var EventEmitter = require('events')

describe('transports', function(){
  describe('WebSocket transport', function(){
    var WebSocketTransport = require('../lib/transports/ws-transport')
    
    it('should export WebSocketTransport class', function(){
      assert.strictEqual(typeof WebSocketTransport, 'function')
      assert.strictEqual(WebSocketTransport.name, 'WebSocketTransport')
    })
    
    it('should export createTransport factory', function(){
      assert.strictEqual(typeof WebSocketTransport.createTransport, 'function')
    })
    
    it('should create transport instance', function(){
      var transport = new WebSocketTransport('ws://localhost:8080')
      assert.ok(transport instanceof WebSocketTransport)
      assert.ok(transport instanceof EventEmitter)
      assert.strictEqual(transport.url, 'ws://localhost:8080')
      assert.strictEqual(transport.connected, false)
    })
    
    it('should have connect method', function(){
      var transport = new WebSocketTransport('ws://localhost:8080')
      assert.strictEqual(typeof transport.connect, 'function')
    })
    
    it('should have sendRequest method', function(){
      var transport = new WebSocketTransport('ws://localhost:8080')
      assert.strictEqual(typeof transport.sendRequest, 'function')
    })
    
    it('should have close method', function(){
      var transport = new WebSocketTransport('ws://localhost:8080')
      assert.strictEqual(typeof transport.close, 'function')
    })
    
    it('should have isReady method', function(){
      var transport = new WebSocketTransport('ws://localhost:8080')
      assert.strictEqual(typeof transport.isReady, 'function')
      assert.strictEqual(transport.isReady(), false)
    })
    
    it('should have getStats method', function(){
      var transport = new WebSocketTransport('ws://localhost:8080')
      var stats = transport.getStats()
      assert.strictEqual(typeof stats, 'object')
      assert.strictEqual(stats.connected, false)
      assert.strictEqual(stats.pendingRequests, 0)
      assert.strictEqual(stats.reconnectAttempts, 0)
      assert.strictEqual(stats.url, 'ws://localhost:8080')
    })
    
    it('should increment request ID', function(){
      var transport = new WebSocketTransport('ws://localhost:8080')
      assert.strictEqual(transport.requestId, 0)
      
      // Mock connection
      transport.connected = true
      transport.ws = { send: function(){}, close: function(){}, readyState: 1 }
      
      var id1 = transport.sendRequest({ method: 'GET', url: '/' }, function(){})
      var id2 = transport.sendRequest({ method: 'POST', url: '/test' }, function(){})
      
      assert.strictEqual(id1, 1)
      assert.strictEqual(id2, 2)
      assert.strictEqual(transport.pendingRequests.size, 2)
      
      // Clean up to prevent hanging
      transport.close()
    })
    
    it('should handle message parsing', function(done){
      var transport = new WebSocketTransport('ws://localhost:8080')
      
      // Set up pending request
      transport.pendingRequests.set(1, {
        callback: function(err, response){
          assert.strictEqual(err, null)
          assert.strictEqual(response.statusCode, 200)
          assert.strictEqual(response.statusMessage, 'OK')
          assert.deepStrictEqual(response.headers, { 'content-type': 'text/plain' })
          assert.strictEqual(response.body, 'Hello World')
          done()
        }
      })
      
      // Simulate incoming message
      transport._handleMessage(JSON.stringify({
        id: 1,
        type: 'response',
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'text/plain' },
        body: 'Hello World'
      }))
    })
    
    it('should handle error messages', function(done){
      var transport = new WebSocketTransport('ws://localhost:8080')
      
      // Set up pending request
      transport.pendingRequests.set(1, {
        callback: function(err, response){
          assert.ok(err instanceof Error)
          assert.strictEqual(err.message, 'Request failed')
          assert.strictEqual(response, undefined)
          done()
        }
      })
      
      // Simulate error message
      transport._handleMessage(JSON.stringify({
        id: 1,
        type: 'error',
        error: 'Request failed'
      }))
    })
    
    it('should emit server messages', function(done){
      var transport = new WebSocketTransport('ws://localhost:8080')
      
      transport.on('server-message', function(message){
        assert.strictEqual(message.type, 'server-push')
        assert.strictEqual(message.data, 'test')
        done()
      })
      
      // Simulate server push message
      transport._handleMessage(JSON.stringify({
        type: 'server-push',
        data: 'test'
      }))
    })
    
    it('should handle invalid JSON', function(done){
      var transport = new WebSocketTransport('ws://localhost:8080')
      
      transport.on('error', function(error){
        assert.ok(error instanceof Error)
        done()
      })
      
      transport._handleMessage('invalid json')
    })
  })
})
'use strict'

var assert = require('node:assert')
var express = require('../')

describe('app.listen(transport)', function(){
  it('should accept WebSocketTransport', function(done){
    var app = express()
    
    // Mock transport
    var mockTransport = {
      connected: false,
      
      sendRequest: function() {
        // Mock sendRequest method
      },
      
      connect: function() {
        var self = this
        return new Promise(function(resolve) {
          self.connected = true
          resolve()
        })
      },
      
      on: function(event, handler) {
        // Mock event handling
      }
    }
    
    var result = app.listen(mockTransport, function(err) {
      assert.strictEqual(err, undefined)
      assert.strictEqual(mockTransport.connected, true)
      assert.strictEqual(result, mockTransport)
      done()
    })
  })
  
  it('should still support port numbers', function(done){
    var app = express()
    var server = app.listen(0, function(){
      assert.ok(server.address().port > 0)
      server.close(done)
    })
  })
  
  it('should detect transport by sendRequest method', function(){
    var app = express()
    
    // Mock transport with sendRequest method
    var mockTransport = {
      sendRequest: function() {},
      on: function() {},
      connect: function() {
        return Promise.resolve()
      }
    }
    
    // Should not throw
    assert.doesNotThrow(function(){
      app.listen(mockTransport)
    })
  })
})
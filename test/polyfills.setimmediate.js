'use strict'

var assert = require('node:assert')

describe('polyfills', function(){
  describe('setImmediate', function(){
    it('should not override native setImmediate if it exists', function(){
      // Save original
      var originalSetImmediate = global.setImmediate
      
      // Clear the require cache to ensure fresh load
      delete require.cache[require.resolve('../lib/polyfills/setimmediate')]
      
      // Require the polyfill
      require('../lib/polyfills/setimmediate')
      
      // Should still be the same function (polyfill should exit early)
      assert.strictEqual(global.setImmediate, originalSetImmediate)
    })
    
    it('should work correctly in Node.js environment', function(done){
      // Just verify the native implementation works
      var called = false
      setImmediate(function(){
        called = true
        done()
      })
      assert.strictEqual(called, false)
    })
    
    it('should be a valid polyfill module', function(){
      // The polyfill exists and can be required without error
      assert.doesNotThrow(function(){
        require('../lib/polyfills/setimmediate')
      })
    })
    
    // Note: We can't fully test the polyfill in Node.js because it exits early
    // when setImmediate already exists. The real test happens in the browser.
    it('polyfill exports are undefined in Node.js (expected behavior)', function(){
      delete require.cache[require.resolve('../lib/polyfills/setimmediate')]
      var module = require('../lib/polyfills/setimmediate')
      
      // In Node.js, the polyfill exits early so exports are undefined
      assert.strictEqual(module.setImmediate, undefined)
      assert.strictEqual(module.clearImmediate, undefined)
    })
  })
})
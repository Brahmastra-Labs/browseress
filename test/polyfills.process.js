'use strict'

var assert = require('node:assert')
var process = require('../lib/polyfills/process-stub')

describe('polyfills', function(){
  describe('process stub', function(){
    it('should export process-like object', function(){
      assert.strictEqual(typeof process, 'object')
      assert.strictEqual(typeof process.env, 'object')
      assert.strictEqual(typeof process.version, 'string')
      assert.strictEqual(typeof process.versions, 'object')
      assert.strictEqual(process.arch, 'browser')
      assert.strictEqual(process.platform, 'browser')
    })

    describe('.nextTick()', function(){
      it('should be a function', function(){
        assert.strictEqual(typeof process.nextTick, 'function')
      })

      it('should execute callback asynchronously', function(done){
        var called = false
        process.nextTick(function(){
          called = true
          done()
        })
        assert.strictEqual(called, false)
      })

      it('should execute multiple callbacks in order', function(done){
        var order = []
        process.nextTick(function(){ order.push(1) })
        process.nextTick(function(){ order.push(2) })
        process.nextTick(function(){
          order.push(3)
          assert.deepStrictEqual(order, [1, 2, 3])
          done()
        })
      })
    })

    describe('.cwd()', function(){
      it('should return root path', function(){
        assert.strictEqual(process.cwd(), '/')
      })
    })

    describe('.chdir()', function(){
      it('should throw in browser environment', function(){
        assert.throws(function(){
          process.chdir('/tmp')
        }, /not supported in the browser/)
      })
    })

    describe('.env', function(){
      it('should have NODE_ENV set to development by default', function(){
        assert.deepStrictEqual(process.env, { NODE_ENV: 'development' })
      })

      it('should be mutable', function(){
        var originalEnv = process.env
        process.env = { TEST: 'value' }
        assert.strictEqual(process.env.TEST, 'value')
        process.env = originalEnv
      })
    })

    describe('.version', function(){
      it('should be a version string', function(){
        assert.strictEqual(process.version, 'v16.0.0')
      })
    })
  })
})
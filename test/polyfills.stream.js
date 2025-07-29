'use strict'

var assert = require('node:assert')
var Stream = require('../lib/polyfills/stream-stub')
var EventEmitter = require('events').EventEmitter

describe('polyfills', function(){
  describe('stream stub', function(){
    it('should export Stream constructor', function(){
      assert.strictEqual(typeof Stream, 'function')
      assert.strictEqual(Stream.name, 'Stream')
    })

    it('should export stream classes', function(){
      assert.strictEqual(typeof Stream.Readable, 'function')
      assert.strictEqual(typeof Stream.Writable, 'function')
      assert.strictEqual(typeof Stream.Duplex, 'function')
      assert.strictEqual(typeof Stream.Transform, 'function')
      assert.strictEqual(typeof Stream.PassThrough, 'function')
      assert.strictEqual(typeof Stream.Stream, 'function')
    })

    it('should inherit from EventEmitter', function(){
      var stream = new Stream()
      assert.ok(stream instanceof EventEmitter)
      assert.ok(stream instanceof Stream)
    })

    describe('Stream base class', function(){
      it('should have pipe method', function(){
        var stream = new Stream()
        assert.strictEqual(typeof stream.pipe, 'function')
      })

      it('should pipe data between streams', function(done){
        var source = new Stream()
        var dest = new Stream()
        
        dest.writable = true
        dest.write = function(data){
          assert.strictEqual(data, 'test data')
          done()
        }
        
        source.pipe(dest)
        source.emit('data', 'test data')
      })

      it('should call end on destination when source ends', function(done){
        var source = new Stream()
        var dest = new Stream()
        
        dest.end = function(){
          done()
        }
        
        source.pipe(dest)
        source.emit('end')
      })

      it('should not call end when pipe option end is false', function(done){
        var source = new Stream()
        var dest = new Stream()
        var endCalled = false
        
        dest.end = function(){
          endCalled = true
        }
        
        source.pipe(dest, { end: false })
        source.emit('end')
        
        setTimeout(function(){
          assert.strictEqual(endCalled, false)
          done()
        }, 10)
      })

      it('should handle errors', function(done){
        var source = new Stream()
        var dest = new Stream()
        
        // Add error listener to prevent throw
        source.on('error', function(){})
        dest.on('error', function(){})
        
        source.pipe(dest)
        
        // Emit error - should not throw
        source.emit('error', new Error('test error'))
        dest.emit('error', new Error('test error'))
        
        done()
      })

      it('should emit pipe event on destination', function(done){
        var source = new Stream()
        var dest = new Stream()
        
        dest.on('pipe', function(src){
          assert.strictEqual(src, source)
          done()
        })
        
        source.pipe(dest)
      })

      it('should cleanup listeners on end', function(){
        var source = new Stream()
        var dest = new Stream()
        
        source.pipe(dest)
        
        assert.ok(source.listenerCount('data') > 0)
        assert.ok(source.listenerCount('end') > 0)
        
        source.emit('end')
        
        // After end, listeners should be cleaned up
        assert.strictEqual(source.listenerCount('data'), 0)
        assert.strictEqual(source.listenerCount('end'), 0)
      })
    })

    describe('Readable', function(){
      it('should set readable flag', function(){
        var readable = new Stream.Readable()
        assert.strictEqual(readable.readable, true)
        assert.ok(readable instanceof Stream)
      })
    })

    describe('Writable', function(){
      it('should set writable flag', function(){
        var writable = new Stream.Writable()
        assert.strictEqual(writable.writable, true)
        assert.ok(writable instanceof Stream)
      })
    })

    describe('Duplex', function(){
      it('should set both readable and writable flags', function(){
        var duplex = new Stream.Duplex()
        assert.strictEqual(duplex.readable, true)
        assert.strictEqual(duplex.writable, true)
        assert.ok(duplex instanceof Stream)
      })
    })

    describe('Transform', function(){
      it('should inherit from Duplex', function(){
        var transform = new Stream.Transform()
        assert.strictEqual(transform.readable, true)
        assert.strictEqual(transform.writable, true)
        assert.ok(transform instanceof Stream.Duplex)
        assert.ok(transform instanceof Stream)
      })
    })

    describe('PassThrough', function(){
      it('should inherit from Transform', function(){
        var passthrough = new Stream.PassThrough()
        assert.strictEqual(passthrough.readable, true)
        assert.strictEqual(passthrough.writable, true)
        assert.ok(passthrough instanceof Stream.Transform)
        assert.ok(passthrough instanceof Stream.Duplex)
        assert.ok(passthrough instanceof Stream)
      })
    })
  })
})
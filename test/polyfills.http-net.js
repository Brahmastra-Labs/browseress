'use strict'

var assert = require('node:assert')
var http = require('../lib/polyfills/http-stub')
var net = require('../lib/polyfills/net-stub')

describe('polyfills', function(){
  describe('http stub', function(){
    describe('.METHODS', function(){
      it('should export HTTP methods array', function(){
        assert.ok(Array.isArray(http.METHODS))
        assert.ok(http.METHODS.length > 0)
      })

      it('should include common methods', function(){
        assert.ok(http.METHODS.includes('GET'))
        assert.ok(http.METHODS.includes('POST'))
        assert.ok(http.METHODS.includes('PUT'))
        assert.ok(http.METHODS.includes('DELETE'))
        assert.ok(http.METHODS.includes('PATCH'))
        assert.ok(http.METHODS.includes('HEAD'))
        assert.ok(http.METHODS.includes('OPTIONS'))
      })
    })

    describe('.IncomingMessage', function(){
      it('should create instances', function(){
        var req = new http.IncomingMessage()
        assert.ok(req instanceof http.IncomingMessage)
      })

      it('should have default properties', function(){
        var req = new http.IncomingMessage()
        assert.strictEqual(typeof req.headers, 'object')
        assert.strictEqual(req.method, 'GET')
        assert.strictEqual(req.url, '/')
        assert.strictEqual(req.httpVersion, '1.1')
      })
    })

    describe('.ServerResponse', function(){
      it('should create instances', function(){
        var res = new http.ServerResponse()
        assert.ok(res instanceof http.ServerResponse)
      })

      it('should have default properties', function(){
        var res = new http.ServerResponse()
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(typeof res.headers, 'object')
      })

      it('should handle headers', function(){
        var res = new http.ServerResponse()
        
        res.setHeader('Content-Type', 'text/html')
        assert.strictEqual(res.getHeader('content-type'), 'text/html')
        
        res.setHeader('X-Custom', 'value')
        assert.strictEqual(res.getHeader('x-custom'), 'value')
      })

      it('should remove headers', function(){
        var res = new http.ServerResponse()
        
        res.setHeader('Content-Type', 'text/html')
        res.removeHeader('Content-Type')
        assert.strictEqual(res.getHeader('content-type'), undefined)
      })

      it('should have end method', function(){
        var res = new http.ServerResponse()
        assert.strictEqual(typeof res.end, 'function')
        res.end() // Should not throw
      })
    })

    describe('.createServer()', function(){
      it('should return server object', function(){
        var server = http.createServer()
        assert.strictEqual(typeof server, 'object')
        assert.strictEqual(typeof server.listen, 'function')
      })

      it('should throw on listen', function(){
        var server = http.createServer()
        assert.throws(function(){
          server.listen()
        }, /not supported in browser/)
      })
    })
  })

  describe('net stub', function(){
    describe('.isIP()', function(){
      it('should identify IPv4 addresses', function(){
        assert.strictEqual(net.isIP('127.0.0.1'), 4)
        assert.strictEqual(net.isIP('192.168.1.1'), 4)
        assert.strictEqual(net.isIP('255.255.255.255'), 4)
        assert.strictEqual(net.isIP('0.0.0.0'), 4)
        assert.strictEqual(net.isIP('10.0.0.1'), 4)
      })

      it('should identify IPv6 addresses', function(){
        assert.strictEqual(net.isIP('::1'), 6)
        assert.strictEqual(net.isIP('2001:db8::1'), 6)
        assert.strictEqual(net.isIP('fe80::1'), 6)
        assert.strictEqual(net.isIP('::'), 6)
        assert.strictEqual(net.isIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), 6)
      })

      it('should return 0 for invalid addresses', function(){
        assert.strictEqual(net.isIP('not an ip'), 0)
        assert.strictEqual(net.isIP('256.1.1.1'), 0)
        assert.strictEqual(net.isIP('1.1.1'), 0)
        assert.strictEqual(net.isIP('1.1.1.1.1'), 0)
        assert.strictEqual(net.isIP(''), 0)
      })

      it('should handle non-string input', function(){
        assert.strictEqual(net.isIP(null), 0)
        assert.strictEqual(net.isIP(undefined), 0)
        assert.strictEqual(net.isIP(123), 0)
        assert.strictEqual(net.isIP({}), 0)
        assert.strictEqual(net.isIP([]), 0)
      })
    })

    describe('.isIPv4()', function(){
      it('should return true for IPv4', function(){
        assert.strictEqual(net.isIPv4('192.168.1.1'), true)
        assert.strictEqual(net.isIPv4('127.0.0.1'), true)
      })

      it('should return false for non-IPv4', function(){
        assert.strictEqual(net.isIPv4('::1'), false)
        assert.strictEqual(net.isIPv4('not an ip'), false)
      })
    })

    describe('.isIPv6()', function(){
      it('should return true for IPv6', function(){
        assert.strictEqual(net.isIPv6('::1'), true)
        assert.strictEqual(net.isIPv6('2001:db8::1'), true)
      })

      it('should return false for non-IPv6', function(){
        assert.strictEqual(net.isIPv6('192.168.1.1'), false)
        assert.strictEqual(net.isIPv6('not an ip'), false)
      })
    })
  })
})
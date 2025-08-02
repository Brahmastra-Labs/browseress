// Test Utilities for Express Test Harness
// Provides browser-compatible implementations of Node.js test utilities

(function() {
  'use strict';

  /**
   * Implementation of 'after' utility from npm package
   * Creates a function that invokes callback after being called n times
   */
  function after(n, callback) {
    if (typeof n !== 'number' || n < 1) {
      throw new Error('after requires a positive integer');
    }
    
    let count = 0;
    return function(err) {
      if (err) {
        callback(err);
        callback = function() {}; // Prevent multiple calls
        return;
      }
      
      count++;
      if (count >= n) {
        callback();
      }
    };
  }

  // Note: assert module is provided by webpack bundle in index.html
  // We don't define a custom assert here to avoid conflicts

  /**
   * Utility for checking if a value should be skipped in query tests
   */
  function shouldSkipQuery(value) {
    // This is used in some Express tests to skip certain query string tests
    // In browser context, we'll skip nothing
    return false;
  }

  /**
   * Methods array used by some Express tests
   */
  const methods = [
    'get',
    'post',
    'put',
    'head',
    'delete',
    'options',
    'trace',
    'copy',
    'lock',
    'mkcol',
    'move',
    'purge',
    'propfind',
    'proppatch',
    'unlock',
    'report',
    'mkactivity',
    'checkout',
    'merge',
    'm-search',
    'notify',
    'subscribe',
    'unsubscribe',
    'patch',
    'search',
    'connect'
  ];

  /**
   * Create a mock Buffer for browser
   */
  const Buffer = {
    from: function(string, encoding) {
      if (typeof string === 'string') {
        // Convert string to Uint8Array for better compatibility
        const encoder = new TextEncoder();
        const bytes = encoder.encode(string);
        const buf = Object.create(Buffer.prototype);
        buf._bytes = bytes;
        buf.length = bytes.length;
        buf._isBuffer = true;
        buf.toString = function() { return string; };
        return buf;
      }
      if (string instanceof ArrayBuffer || string instanceof Uint8Array) {
        const buf = Object.create(Buffer.prototype);
        buf._bytes = new Uint8Array(string);
        buf.length = buf._bytes.length;
        buf._isBuffer = true;
        buf.toString = function() { 
          const decoder = new TextDecoder();
          return decoder.decode(this._bytes);
        };
        return buf;
      }
      return string;
    },
    
    isBuffer: function(obj) {
      return obj && obj._isBuffer === true;
    },
    
    concat: function(list) {
      const totalLength = list.reduce((sum, buf) => sum + buf.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of list) {
        result.set(buf._bytes || new TextEncoder().encode(buf.toString()), offset);
        offset += buf.length;
      }
      return Buffer.from(result);
    },
    
    byteLength: function(string, encoding) {
      if (typeof string === 'string') {
        // Use TextEncoder to get accurate byte length
        return new TextEncoder().encode(string).length;
      }
      return string.length || 0;
    },
    
    alloc: function(size) {
      const buf = Object.create(Buffer.prototype);
      buf._bytes = new Uint8Array(size);
      buf.length = size;
      buf._isBuffer = true;
      buf.toString = function() {
        const decoder = new TextDecoder();
        return decoder.decode(this._bytes);
      };
      return buf;
    },
    
    allocUnsafe: function(size) {
      return Buffer.alloc(size);
    },
    
    prototype: {}
  };

  /**
   * Mock process.nextTick for browser
   */
  const nextTick = typeof process !== 'undefined' && process.nextTick
    ? process.nextTick
    : function(fn) { setTimeout(fn, 0); };

  /**
   * Utility function to check if response should have body
   */
  function shouldHaveBody(statusCode) {
    return statusCode < 100 || (statusCode >= 200 && statusCode !== 204 && statusCode !== 304);
  }
  
  /**
   * Utility to check if header should not exist
   */
  function shouldNotHaveHeader(res, header) {
    const headerLower = header.toLowerCase();
    if (res.headers[headerLower] !== undefined) {
      throw new Error(`Expected header "${header}" to not exist but found: ${res.headers[headerLower]}`);
    }
  }
  
  /**
   * Test utilities object
   */
  const testUtils = {
    shouldSkipQuery,
    methods,
    Buffer,
    nextTick,
    shouldHaveBody,
    shouldNotHaveHeader,
    // Add as direct properties too for destructuring
    shouldSkipQuery: shouldSkipQuery,
    methods: methods
  };

  // Export utilities to window
  window.after = after;
  // Note: window.assert is set by webpack bundle in index.html
  window.testUtils = testUtils;
  
  // Make Buffer globally available since many modules expect it
  window.Buffer = Buffer;
  
  // Also export as a module-like object
  window.testUtilities = {
    after,
    // Note: assert provided by webpack bundle
    testUtils,
    Buffer,
    methods,
    shouldSkipQuery,
    nextTick
  };

  // Express utils (separate from test utils)
  window.expressUtils = {
    // HTTP methods array (lowercase) - matching Express's utils.js
    methods: [
      'acl', 'bind', 'checkout', 'connect', 'copy', 'delete', 'get',
      'head', 'link', 'lock', 'm-search', 'merge', 'mkactivity',
      'mkcalendar', 'mkcol', 'move', 'notify', 'options', 'patch',
      'post', 'pri', 'propfind', 'proppatch', 'purge', 'put', 'rebind',
      'report', 'search', 'source', 'subscribe', 'trace', 'unbind',
      'unlink', 'unlock', 'unsubscribe'
    ]
  };

})();
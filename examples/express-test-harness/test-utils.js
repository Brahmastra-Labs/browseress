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

  /**
   * Simple assert implementation that mimics Node.js assert
   */
  const assert = function(value, message) {
    if (!value) {
      throw new Error(message || 'Assertion failed');
    }
  };

  assert.strictEqual = function(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
  };

  assert.equal = function(actual, expected, message) {
    if (actual != expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
  };

  assert.deepEqual = function(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
  };

  assert.ok = function(value, message) {
    if (!value) {
      throw new Error(message || 'Expected truthy value');
    }
  };

  assert.fail = function(message) {
    throw new Error(message || 'Failed');
  };

  assert.throws = function(fn, expected, message) {
    let threw = false;
    let error;
    
    try {
      fn();
    } catch (e) {
      threw = true;
      error = e;
    }
    
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
    
    if (expected) {
      if (expected instanceof RegExp && !expected.test(error.message)) {
        throw new Error(message || `Expected error message to match ${expected}`);
      } else if (typeof expected === 'function' && !(error instanceof expected)) {
        throw new Error(message || `Expected error to be instance of ${expected.name}`);
      }
    }
  };

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
        return {
          toString: function() { return string; },
          length: string.length,
          _isBuffer: true
        };
      }
      return string;
    },
    
    isBuffer: function(obj) {
      return obj && obj._isBuffer === true;
    },
    
    concat: function(list) {
      const strings = list.map(buf => buf.toString());
      const result = strings.join('');
      return Buffer.from(result);
    }
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
  window.assert = assert;
  window.testUtils = testUtils;
  
  // Also export as a module-like object
  window.testUtilities = {
    after,
    assert,
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
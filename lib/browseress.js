/*!
 * Browseress - Browser-compatible Express.js
 * Main entry point for bundled distribution
 */

'use strict';

// Get the original Express module
const originalExpress = require('../index');
const EventEmitter = require('events').EventEmitter;

// Create a wrapper for Express that properly initializes EventEmitter
function createExpressWrapper() {
  // Get the original createApplication function
  const createApplication = originalExpress;
  
  // Create our wrapper function
  function wrappedCreateApplication() {
    // Call the original Express factory
    const app = createApplication.apply(this, arguments);
    
    // Initialize EventEmitter on the app object
    // This fixes the issue where EventEmitter methods are mixed in
    // but the constructor is never called
    EventEmitter.call(app);
    
    return app;
  }
  
  // Copy all properties from original Express to our wrapper
  Object.keys(originalExpress).forEach(function(key) {
    wrappedCreateApplication[key] = originalExpress[key];
  });
  
  // Copy static properties
  Object.setPrototypeOf(wrappedCreateApplication, originalExpress);
  
  return wrappedCreateApplication;
}

// Export polyfills and transport
module.exports = {
  // Polyfills
  fs: require('./polyfills/fs-opfs-adapter'),
  path: require('./polyfills/path'),
  http: require('./polyfills/http-stub'),
  net: require('./polyfills/net-stub'),
  events: require('events'),
  stream: require('./polyfills/stream-stub'),
  process: require('./polyfills/process-stub'),
  crypto: require('./polyfills/crypto-stub'),
  url: require('url'),
  parseurl: require('parseurl'),
  async_hooks: require('./polyfills/async-hooks-stub'),
  bodyParser: require('body-parser'),
  
  // Transport
  WebSocketTransport: require('./transports/ws-transport'),
  
  // Express with EventEmitter initialization wrapper
  express: createExpressWrapper(),
  
  // Express internals (for testing)
  expressUtils: require('../lib/utils'),
  
  // Real npm packages bundled via webpack
  onFinished: require('on-finished'),
  cookieParser: require('cookie-parser'),
  morgan: require('morgan'),
  pbkdf2Password: require('pbkdf2-password'),
  expressSession: require('express-session'),
  
  // Export as default too
  default: {
    fs: require('./polyfills/fs-opfs-adapter'),
    path: require('./polyfills/path'),
    http: require('./polyfills/http-stub'),
    net: require('./polyfills/net-stub'),
    events: require('events'),
    stream: require('./polyfills/stream-stub'),
    process: require('./polyfills/process-stub'),
    crypto: require('./polyfills/crypto-stub'),
    url: require('url'),
    parseurl: require('parseurl'),
    async_hooks: require('./polyfills/async-hooks-stub'),
    bodyParser: require('body-parser'),
    WebSocketTransport: require('./transports/ws-transport'),
    express: createExpressWrapper(),
    expressUtils: require('../lib/utils'),
    onFinished: require('on-finished'),
    cookieParser: require('cookie-parser'),
    morgan: require('morgan'),
    pbkdf2Password: require('pbkdf2-password'),
    expressSession: require('express-session')
  }
};
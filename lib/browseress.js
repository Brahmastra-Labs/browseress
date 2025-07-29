/*!
 * Browseress - Browser-compatible Express.js
 * Main entry point for bundled distribution
 */

'use strict';

// Export polyfills and transport
module.exports = {
  // Polyfills
  fs: require('./polyfills/fs-opfs-adapter'),
  path: require('./polyfills/path'),
  http: require('./polyfills/http-stub'),
  net: require('./polyfills/net-stub'),
  
  // Transport
  WebSocketTransport: require('./transports/ws-transport'),
  
  // Express
  express: require('../index'),
  
  // Export as default too
  default: {
    fs: require('./polyfills/fs-opfs-adapter'),
    path: require('./polyfills/path'),
    http: require('./polyfills/http-stub'),
    net: require('./polyfills/net-stub'),
    WebSocketTransport: require('./transports/ws-transport'),
    express: require('../index')
  }
};
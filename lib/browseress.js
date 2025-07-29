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
  
  // Express (will be added when we modify express.js)
  // express: require('../index')
};
/*!
 * HTTP Stub Polyfill
 * Minimal http module implementation for Express compatibility
 * Only provides what Express actually needs
 */

'use strict';

// HTTP methods from Node.js
const METHODS = [
  'ACL',
  'BIND',
  'CHECKOUT',
  'CONNECT',
  'COPY',
  'DELETE',
  'GET',
  'HEAD',
  'LINK',
  'LOCK',
  'M-SEARCH',
  'MERGE',
  'MKACTIVITY',
  'MKCALENDAR',
  'MKCOL',
  'MOVE',
  'NOTIFY',
  'OPTIONS',
  'PATCH',
  'POST',
  'PRI',
  'PROPFIND',
  'PROPPATCH',
  'PURGE',
  'PUT',
  'REBIND',
  'REPORT',
  'SEARCH',
  'SOURCE',
  'SUBSCRIBE',
  'TRACE',
  'UNBIND',
  'UNLINK',
  'UNLOCK',
  'UNSUBSCRIBE'
];

// Base class for IncomingMessage
class IncomingMessage {
  constructor() {
    this.headers = {};
    this.method = 'GET';
    this.url = '/';
    this.httpVersion = '1.1';
  }
}

// Base class for ServerResponse  
class ServerResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
  }
  
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  }
  
  getHeader(name) {
    return this.headers[name.toLowerCase()];
  }
  
  removeHeader(name) {
    delete this.headers[name.toLowerCase()];
  }
  
  end() {
    // No-op in browser context
  }
}

// Stub createServer for Express compatibility
function createServer(requestListener) {
  // Return a fake server object
  return {
    listen() {
      throw new Error('http.createServer().listen() is not supported in browser. Use WebSocket transport instead.');
    }
  };
}

module.exports = {
  METHODS,
  IncomingMessage,
  ServerResponse,
  createServer
};
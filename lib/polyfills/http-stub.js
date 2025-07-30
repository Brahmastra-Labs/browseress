/*!
 * HTTP Stub Polyfill
 * Minimal http module implementation for Express compatibility
 * Only provides what Express actually needs
 */

'use strict';

// Import EventEmitter
const EventEmitter = require('node:events').EventEmitter;

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
class IncomingMessage extends EventEmitter {
  constructor() {
    super();
    this.headers = {};
    this.method = 'GET';
    this.url = '/';
    this.httpVersion = '1.1';
    this.httpVersionMajor = 1;
    this.httpVersionMinor = 1;
    this.complete = false;
    this.readable = true;
    this.socket = {
      remoteAddress: '127.0.0.1',
      remotePort: null,
      localAddress: '127.0.0.1',
      localPort: null,
      destroyed: false,
      encrypted: false
    };
    this.connection = this.socket; // Alias for compatibility
    this.rawHeaders = [];
    this.rawTrailers = [];
    this.trailers = {};
    this.aborted = false;
    this.upgrade = false;
  }
  
  // Stream-like methods
  pipe(destination, options) {
    // Simple pipe implementation
    this.on('data', (chunk) => {
      if (destination.write) {
        destination.write(chunk);
      }
    });
    this.on('end', () => {
      if (destination.end) {
        destination.end();
      }
    });
    return destination;
  }
  
  pause() {
    this.isPaused = true;
    return this;
  }
  
  resume() {
    this.isPaused = false;
    return this;
  }
  
  read(size) {
    // Stub implementation
    return null;
  }
  
  setEncoding(encoding) {
    this.encoding = encoding;
    return this;
  }
  
  setTimeout(msecs, callback) {
    // Stub implementation
    if (callback) {
      this.on('timeout', callback);
    }
    return this;
  }
  
  destroy(error) {
    this.destroyed = true;
    if (error) {
      this.emit('error', error);
    }
    this.emit('close');
    return this;
  }
}

// Simple status code to message mapping
const STATUS_CODES = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable'
};

// Base class for ServerResponse  
class ServerResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.statusMessage = STATUS_CODES[200] || 'OK';
    this.headers = {};
    this.headersSent = false;
    this.finished = false;
    this.writableEnded = false;
    this.writableFinished = false;
    this.socket = null;
    this.connection = null;
    this._headers = null;
    this._headerNames = {};
  }
  
  setHeader(name, value) {
    const key = name.toLowerCase();
    this.headers[key] = value;
    this._headerNames[key] = name;
    return this;
  }
  
  getHeader(name) {
    return this.headers[name.toLowerCase()];
  }
  
  getHeaderNames() {
    return Object.keys(this.headers);
  }
  
  getHeaders() {
    return { ...this.headers };
  }
  
  hasHeader(name) {
    return name.toLowerCase() in this.headers;
  }
  
  removeHeader(name) {
    const key = name.toLowerCase();
    delete this.headers[key];
    delete this._headerNames[key];
    return this;
  }
  
  writeHead(statusCode, statusMessage, headers) {
    if (this.headersSent) {
      throw new Error('Can\'t set headers after they are sent');
    }
    
    // Handle different argument patterns
    if (typeof statusMessage === 'object') {
      headers = statusMessage;
      statusMessage = undefined;
    }
    
    this.statusCode = statusCode;
    this.statusMessage = statusMessage || STATUS_CODES[statusCode] || 'unknown';
    
    if (headers) {
      for (const name in headers) {
        this.setHeader(name, headers[name]);
      }
    }
    
    this.headersSent = true;
    return this;
  }
  
  write(chunk, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = null;
    }
    
    if (!this.headersSent) {
      this.headersSent = true;
    }
    
    // Emit drain event on next tick
    setTimeout(() => {
      this.emit('drain');
    }, 0);
    
    if (callback) {
      setTimeout(callback, 0);
    }
    
    return true;
  }
  
  end(data, encoding, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = null;
      encoding = null;
    } else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = null;
    }
    
    if (data) {
      this.write(data, encoding);
    }
    
    this.finished = true;
    this.writableEnded = true;
    this.writableFinished = true;
    
    // Emit finish event on next tick
    setTimeout(() => {
      this.emit('finish');
      this.emit('close');
    }, 0);
    
    if (callback) {
      this.once('finish', callback);
    }
    
    return this;
  }
  
  addTrailers(headers) {
    // Stub implementation
    return this;
  }
  
  writeContinue() {
    // Stub implementation
    return this;
  }
  
  writeProcessing() {
    // Stub implementation  
    return this;
  }
  
  setTimeout(msecs, callback) {
    // Stub implementation
    if (callback) {
      this.on('timeout', callback);
    }
    return this;
  }
  
  destroy(error) {
    this.destroyed = true;
    if (error) {
      this.emit('error', error);
    }
    this.emit('close');
    return this;
  }
  
  // Override statusCode setter to update statusMessage
  get statusCode() {
    return this._statusCode || 200;
  }
  
  set statusCode(code) {
    this._statusCode = code;
    // Auto-set statusMessage based on code
    if (STATUS_CODES[code]) {
      this.statusMessage = STATUS_CODES[code];
    }
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
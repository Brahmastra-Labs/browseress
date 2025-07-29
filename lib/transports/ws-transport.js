/*!
 * WebSocket Transport Driver
 * Manages WebSocket connection to relay server and handles HTTP-like request/response
 */

'use strict';

const EventEmitter = require('events');

/**
 * WebSocketTransport class
 * Handles communication with the relay server
 */
class WebSocketTransport extends EventEmitter {
  constructor(url) {
    super();
    
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.reconnectTimer = null;
    this.connectionTimer = null;
    this.requestTimers = new Map();
    this.closed = false;
  }

  /**
   * Connect to the relay server
   * @returns {Promise} Resolves when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      const WebSocket = this._getWebSocket();
      if (!WebSocket) {
        reject(new Error('WebSocket not available in this environment'));
        return;
      }

      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        
        // Clear connection timer on successful connection
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }
        
        this.emit('connect');
        resolve();
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.emit('disconnect');
        this._handleDisconnect();
      };

      // Timeout connection attempt
      this.connectionTimer = setTimeout(() => {
        if (!this.connected && this.ws) {
          this.ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Send a request to the relay server
   * @param {Object} request - HTTP-like request object
   * @param {Function} callback - Callback for response
   * @returns {number} Request ID
   */
  sendRequest(request, callback) {
    const id = ++this.requestId;
    
    const message = {
      id,
      type: 'request',
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body
    };

    this.pendingRequests.set(id, {
      request,
      callback,
      timestamp: Date.now()
    });

    this._send(message);
    
    // Timeout handling
    const timer = setTimeout(() => {
      if (this.pendingRequests.has(id)) {
        this.pendingRequests.delete(id);
        this.requestTimers.delete(id);
        callback(new Error('Request timeout'));
      }
    }, 30000); // 30 second timeout
    
    this.requestTimers.set(id, timer);

    return id;
  }

  /**
   * Close the WebSocket connection
   */
  close() {
    this.closed = true;
    
    // Clear all timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    // Clear all request timers
    for (const timer of this.requestTimers.values()) {
      clearTimeout(timer);
    }
    this.requestTimers.clear();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  /**
   * Get WebSocket implementation based on environment
   * @private
   */
  _getWebSocket() {
    if (typeof WebSocket !== 'undefined') {
      return WebSocket;
    } else if (typeof global !== 'undefined' && global.WebSocket) {
      return global.WebSocket;
    } else if (typeof window !== 'undefined' && window.WebSocket) {
      return window.WebSocket;
    } else if (typeof self !== 'undefined' && self.WebSocket) {
      return self.WebSocket;
    }
    
    // Try to load ws module for Node.js
    try {
      return require('ws');
    } catch (e) {
      return null;
    }
  }

  /**
   * Send a message through WebSocket
   * @private
   */
  _send(message) {
    if (!this.connected || !this.ws) {
      this.emit('error', new Error('Not connected'));
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Handle incoming WebSocket message
   * @private
   */
  _handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'response' && message.id) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          
          // Clear the request timer
          const timer = this.requestTimers.get(message.id);
          if (timer) {
            clearTimeout(timer);
            this.requestTimers.delete(message.id);
          }
          
          // Create response object
          const response = {
            statusCode: message.statusCode,
            statusMessage: message.statusMessage,
            headers: message.headers,
            body: message.body
          };
          
          pending.callback(null, response);
        }
      } else if (message.type === 'error' && message.id) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          
          // Clear the request timer
          const timer = this.requestTimers.get(message.id);
          if (timer) {
            clearTimeout(timer);
            this.requestTimers.delete(message.id);
          }
          
          pending.callback(new Error(message.error));
        }
      } else if (message.type === 'server-push') {
        // Handle server-initiated messages
        this.emit('server-message', message);
      } else if (message.type === 'http-request') {
        // Handle incoming HTTP request from relay server
        this._handleHttpRequest(message);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Handle disconnection and attempt reconnect
   * @private
   */
  _handleDisconnect() {
    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.callback(new Error('Connection lost'));
      
      // Clear associated timer
      const timer = this.requestTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.requestTimers.delete(id);
      }
    }
    this.pendingRequests.clear();

    // Don't attempt reconnection if explicitly closed
    if (this.closed) {
      this.emit('closed');
      return;
    }

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.emit('reconnecting', this.reconnectAttempts);
      
      this.reconnectTimer = setTimeout(() => {
        if (!this.closed) {
          this.connect().catch(() => {
            // Reconnection failed, will be handled by onclose
          });
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.emit('reconnect-failed');
    }
  }

  /**
   * Check if transport is ready
   * @returns {boolean}
   */
  isReady() {
    return this.connected && this.ws && this.ws.readyState === 1; // OPEN state
  }

  /**
   * Get connection statistics
   * @returns {Object}
   */
  getStats() {
    return {
      connected: this.connected,
      pendingRequests: this.pendingRequests.size,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url
    };
  }

  /**
   * Handle incoming HTTP request from relay server
   * @private
   */
  _handleHttpRequest(message) {
    const self = this;
    
    console.log('[WS Transport] Handling HTTP request:', message.method, message.url, 'Body:', message.body);
    
    // Create mock request object with event emitter functionality
    const req = {
      _events: {},
      on(event, listener) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(listener);
        return this;
      },
      emit(event, ...args) {
        if (this._events[event]) {
          this._events[event].forEach(listener => listener(...args));
        }
        return this;
      },
      removeListener(event, listener) {
        if (this._events[event]) {
          this._events[event] = this._events[event].filter(l => l !== listener);
        }
        return this;
      },
      // Express expects these
      pipe() { return this; },
      unpipe() { return this; },
      id: message.id,
      method: message.method,
      url: message.url,
      headers: message.headers || {},
      body: message.body,
      // Add required properties for Express
      httpVersion: '1.1',
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      connection: {
        remoteAddress: message.remoteAddress || '127.0.0.1'
      },
      params: {},
      query: {},
      // New request properties from Phase 1
      protocol: message.protocol || 'http',
      ip: message.ip || message.remoteAddress || '127.0.0.1',
      ips: message.ips || [],
      cookies: message.cookies || {},
      get secure() {
        return this.protocol === 'https';
      }
    };
    
    // Handle body for POST/PUT requests
    const nextTick = typeof process !== 'undefined' && process.nextTick 
      ? process.nextTick 
      : (fn) => setTimeout(fn, 0);
    
    if (message.body) {
      nextTick(() => {
        // Emit body as string - the middleware will handle it
        req.emit('data', message.body);
        req.emit('end');
      });
    } else {
      nextTick(() => {
        req.emit('end');
      });
    }
    
    // Create mock response object
    const res = {
      statusCode: 200,
      statusMessage: 'OK',
      headers: {},
      _headers: {},
      
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
        this._headers[name] = value;
      },
      
      getHeader(name) {
        return this.headers[name.toLowerCase()];
      },
      
      removeHeader(name) {
        delete this.headers[name.toLowerCase()];
        delete this._headers[name];
      },
      
      writeHead(statusCode, statusMessage, headers) {
        if (typeof statusMessage === 'object') {
          headers = statusMessage;
          statusMessage = undefined;
        }
        
        this.statusCode = statusCode;
        if (statusMessage) this.statusMessage = statusMessage;
        
        if (headers) {
          for (const key in headers) {
            this.setHeader(key, headers[key]);
          }
        }
      },
      
      write(chunk, encoding) {
        if (!this._body) this._body = [];
        this._body.push(chunk);
        return true;
      },
      
      end(chunk, encoding) {
        if (chunk) this.write(chunk, encoding);
        
        // Combine body chunks
        let body = '';
        if (this._body) {
          body = this._body.join('');
        }
        
        // Get proper status message from statuses module if not set
        if (!this.statusMessage || this.statusMessage === 'OK') {
          const statuses = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
            503: 'Service Unavailable'
          };
          this.statusMessage = statuses[this.statusCode] || 'Unknown';
        }
        
        // Send response back through WebSocket
        const response = {
          id: req.id,
          type: 'http-response',
          statusCode: this.statusCode,
          statusMessage: this.statusMessage,
          headers: this._headers,  // Use original case headers
          body: body
        };
        console.log('[WS Transport] Sending response:', response.type, 'ID:', response.id, 'Status:', response.statusCode, response.statusMessage);
        console.log('[WS Transport] Headers being sent:', JSON.stringify(response.headers));
        self._send(response);
      },
      
      // Express-style methods
      status(code) {
        this.statusCode = code;
        return this;
      },
      
      set(field, value) {
        if (typeof field === 'object') {
          // Handle res.set({header: value})
          for (const key in field) {
            this.setHeader(key, field[key]);
          }
        } else {
          // Handle res.set('header', 'value')
          this.setHeader(field, value);
        }
        return this;
      },
      
      append(field, value) {
        const existing = this.getHeader(field);
        if (existing) {
          // Handle array of values
          if (Array.isArray(existing)) {
            this.setHeader(field, existing.concat(value));
          } else if (Array.isArray(value)) {
            this.setHeader(field, [existing].concat(value));
          } else {
            this.setHeader(field, [existing, value]);
          }
        } else {
          this.setHeader(field, value);
        }
        return this;
      },
      
      cookie(name, value, options) {
        options = options || {};
        let cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value);
        
        if (options.maxAge != null) {
          cookie += '; Max-Age=' + Math.floor(options.maxAge);
        }
        if (options.expires) {
          cookie += '; Expires=' + options.expires.toUTCString();
        }
        if (options.path) {
          cookie += '; Path=' + options.path;
        }
        if (options.domain) {
          cookie += '; Domain=' + options.domain;
        }
        if (options.secure) {
          cookie += '; Secure';
        }
        if (options.httpOnly) {
          cookie += '; HttpOnly';
        }
        if (options.sameSite) {
          cookie += '; SameSite=' + options.sameSite;
        }
        
        this.append('Set-Cookie', cookie);
        return this;
      },
      
      clearCookie(name, options) {
        options = Object.assign({}, options, {
          expires: new Date(1),
          path: '/'
        });
        return this.cookie(name, '', options);
      },
      
      redirect(statusCodeOrUrl, url) {
        let statusCode = 302;
        
        if (typeof statusCodeOrUrl === 'string') {
          url = statusCodeOrUrl;
        } else {
          statusCode = statusCodeOrUrl;
        }
        
        this.statusCode = statusCode;
        this.setHeader('Location', url);
        
        // Set appropriate status message
        const redirectStatuses = {
          301: 'Moved Permanently',
          302: 'Found',
          303: 'See Other',
          307: 'Temporary Redirect',
          308: 'Permanent Redirect'
        };
        this.statusMessage = redirectStatuses[statusCode] || 'Redirect';
        
        this.end();
        return this;
      },
      
      json(obj) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(obj));
      },
      
      send(body) {
        if (typeof body === 'object' && body !== null) {
          this.json(body);
        } else {
          if (!this.getHeader('Content-Type')) {
            this.setHeader('Content-Type', 'text/html; charset=utf-8');
          }
          this.end(body);
        }
      }
    };
    
    // Emit request event for Express to handle
    this.emit('request', req, res);
  }
}

/**
 * Factory function to create transport
 * @param {string} url - WebSocket URL
 * @returns {WebSocketTransport}
 */
function createTransport(url) {
  return new WebSocketTransport(url);
}

// Export both class and factory
module.exports = WebSocketTransport;
module.exports.createTransport = createTransport;
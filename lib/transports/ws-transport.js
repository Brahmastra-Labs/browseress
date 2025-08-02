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
   * Normalize headers to lowercase keys as Express expects
   * @private
   */
  _normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
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
      // Express expects these stream methods
      pipe() { return this; },
      unpipe() { return this; },
      resume() { return this; },
      pause() { return this; },
      id: message.id,
      method: message.method,
      url: message.url,
      headers: this._normalizeHeaders(message.headers || {}),
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
      },
      // Store reference to Express app from transport
      get app() {
        return self._app || null;
      },
      res: null
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
      },
      
      sendStatus(statusCode) {
        this.statusCode = statusCode;
        // Get proper status message
        const statusMessages = {
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
        this.statusMessage = statusMessages[statusCode] || 'Unknown';
        this.setHeader('Content-Type', 'text/plain; charset=utf-8');
        this.end(this.statusMessage);
      },
      
      // Phase 2: State Management
      locals: {},
      
      // Phase 2: File I/O Methods
      sendFile(path, options, callback) {
        const self = this;
        
        // Handle optional options
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        options = options || {};
        
        // Get fs module - try to require it
        let fs;
        try {
          fs = require('fs');
        } catch (e) {
          // In browser, try to get from polyfills
          if (typeof window !== 'undefined' && window.browseress && window.browseress.fs) {
            fs = window.browseress.fs;
          } else {
            const err = new Error('File system not available');
            if (callback) return callback(err);
            self.status(500).send('File system not available');
            return;
          }
        }
        
        // Handle the file read operation
        const handleFileRead = (err, data) => {
          if (err) {
            console.log('[sendFile] Error:', err.message, 'Code:', err.code);
            if (err.code === 'ENOENT') {
              self.status(404).send('Not found');
            } else {
              self.status(500).send('Internal server error');
            }
            if (callback) callback(err);
            return;
          }
          
          // Get file extension once
          const ext = path.split('.').pop().toLowerCase();
          
          // Convert data to string if it's binary
          let fileContent = data;
          let contentLength = 0;
          
          if (data instanceof Uint8Array) {
            // For text files, decode to string
            const textExtensions = ['html', 'css', 'js', 'json', 'txt', 'xml', 'svg', 'md'];
            
            if (textExtensions.includes(ext)) {
              fileContent = new TextDecoder().decode(data);
              contentLength = fileContent.length;
            } else {
              // For binary files, we'll need to handle differently
              // For now, convert to base64
              fileContent = btoa(String.fromCharCode(...data));
              contentLength = fileContent.length;
            }
          } else if (typeof data === 'string') {
            contentLength = data.length;
          } else {
            contentLength = data.length || data.byteLength || 0;
          }
          
          // Determine content type
          const contentTypes = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'xml': 'application/xml',
            'md': 'text/markdown'
          };
          
          const contentType = options.headers?.['Content-Type'] || 
                            contentTypes[ext] || 
                            'application/octet-stream';
          
          // Set headers
          self.setHeader('Content-Type', contentType);
          self.setHeader('Content-Length', contentLength);
          
          // Set custom headers if provided
          if (options.headers) {
            for (const key in options.headers) {
              if (key !== 'Content-Type') {
                self.setHeader(key, options.headers[key]);
              }
            }
          }
          
          // Send file
          self.end(fileContent);
          
          if (callback) callback();
        };
        
        // Read the file - handle both callback and promise-based APIs
        const result = fs.readFile(path, handleFileRead);
        
        // If readFile returns a promise (no callback support), handle it
        if (result && typeof result.then === 'function') {
          result
            .then(data => handleFileRead(null, data))
            .catch(err => handleFileRead(err));
        }
      },
      
      download(path, filename, options, callback) {
        // Handle optional parameters
        if (typeof filename === 'function') {
          callback = filename;
          filename = path.split('/').pop();
          options = {};
        } else if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (typeof filename === 'object') {
          options = filename;
          filename = path.split('/').pop();
        }
        
        // Set Content-Disposition header
        this.attachment(filename);
        
        // Use sendFile to send the file
        this.sendFile(path, options, callback);
      },
      
      attachment(filename) {
        if (filename) {
          // Escape filename for header
          const escapedFilename = filename.replace(/"/g, '\\"');
          this.setHeader('Content-Disposition', `attachment; filename="${escapedFilename}"`);
        } else {
          this.setHeader('Content-Disposition', 'attachment');
        }
        return this;
      },
      
      // Phase 3: View Rendering
      render(view, options, callback) {
        const self = this;
        const app = this.req.app;  // Access req through this.req
        let done = callback;
        let opts = options || {};
        
        // Support callback function as second arg
        if (typeof options === 'function') {
          done = options;
          opts = {};
        }
        
        // Merge res.locals
        opts._locals = self.locals;
        
        // Default callback to respond
        done = done || function(err, str) {
          if (err) {
            console.error('[WS Transport] Render error:', err.message);
            self.status(500).send('Internal Server Error');
            return;
          }
          self.send(str);
        };
        
        // Render using app.render
        app.render(view, opts, done);
      },
      
      // Store reference to request object
      req: null
    };
    
    // Set up circular references as Express expects
    req.res = res;
    res.req = req;
    
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
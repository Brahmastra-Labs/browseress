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
      setTimeout(() => {
        if (!this.connected) {
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
    setTimeout(() => {
      if (this.pendingRequests.has(id)) {
        this.pendingRequests.delete(id);
        callback(new Error('Request timeout'));
      }
    }, 30000); // 30 second timeout

    return id;
  }

  /**
   * Close the WebSocket connection
   */
  close() {
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
          pending.callback(new Error(message.error));
        }
      } else if (message.type === 'server-push') {
        // Handle server-initiated messages
        this.emit('server-message', message);
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
    }
    this.pendingRequests.clear();

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.emit('reconnecting', this.reconnectAttempts);
      
      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnection failed, will be handled by onclose
        });
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
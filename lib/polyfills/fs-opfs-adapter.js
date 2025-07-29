/*!
 * OPFS File System Adapter
 * Provides Node.js fs-compatible API using Origin Private File System
 * with synchronous operations via Web Worker and SharedArrayBuffer
 */

'use strict';

// Import worker as a URL (webpack will handle this)
// This will be configured in webpack to use worker-loader
let WorkerFactory;
try {
  WorkerFactory = require('./fs-opfs-worker.js');
} catch (e) {
  // Worker import will fail in Node.js, which is expected
  WorkerFactory = null;
}

// Worker initialization
let worker = null;
let workerId = 0;

function initWorker() {
  if (!worker) {
    // Check if we're in a browser environment
    if (typeof Worker === 'undefined' || !WorkerFactory) {
      throw new Error('OPFS adapter requires a browser environment with Worker support');
    }
    
    // Create worker - webpack will transform this appropriately
    if (typeof WorkerFactory === 'function') {
      // webpack worker-loader provides a constructor
      worker = new WorkerFactory();
    } else if (typeof WorkerFactory === 'string') {
      // webpack may provide a URL string
      worker = new Worker(WorkerFactory);
    } else {
      // Fallback for development/testing
      const blob = new Blob([WorkerFactory.toString()], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
    }
    
    // Handle worker responses
    worker.onmessage = (event) => {
      const { id, result, error } = event.data;
      const pending = pendingOperations.get(id);
      if (pending) {
        pending.result = result;
        pending.error = error;
        pendingOperations.delete(id);
      }
    };
  }
  return worker;
}

// Pending operations map
const pendingOperations = new Map();

// Synchronous operation helper
function syncOperation(method, args) {
  const worker = initWorker();
  const id = ++workerId;
  
  // Create shared buffer for synchronization
  const sharedBuffer = new SharedArrayBuffer(4);
  const view = new Int32Array(sharedBuffer);
  
  // Store pending operation
  const pending = { result: undefined, error: undefined };
  pendingOperations.set(id, pending);
  
  // Send operation to worker
  worker.postMessage({
    id,
    method,
    args,
    signal: sharedBuffer
  });
  
  // Wait for completion
  Atomics.wait(view, 0, 0);
  
  // Check status
  const status = Atomics.load(view, 0);
  
  if (status === 2) { // error
    const error = new Error(pending.error);
    error.code = extractErrorCode(pending.error);
    throw error;
  }
  
  return pending.result;
}

// Extract error code from error message
function extractErrorCode(message) {
  const match = message.match(/^(\w+):/);
  return match ? match[1] : 'UNKNOWN';
}

// File System API Implementation
const fs = {
  readFileSync(path, options = {}) {
    const encoding = typeof options === 'string' ? options : options.encoding;
    const result = syncOperation('readFileSync', { path, encoding });
    
    if (!encoding && Array.isArray(result)) {
      // Convert array back to Buffer
      return Buffer.from(result);
    }
    
    return result;
  },

  writeFileSync(path, data, options = {}) {
    const encoding = typeof options === 'string' ? options : options.encoding;
    
    // Convert Buffer to array for transfer
    if (Buffer.isBuffer(data)) {
      data = Array.from(data);
    }
    
    return syncOperation('writeFileSync', { path, data, encoding });
  },

  statSync(path) {
    const stats = syncOperation('statSync', { path });
    
    // Create a Stats-like object
    return {
      isFile() { return stats.isFile; },
      isDirectory() { return stats.isDirectory; },
      size: stats.size,
      mtime: stats.mtime,
      mode: stats.mode
    };
  },

  existsSync(path) {
    return syncOperation('existsSync', { path });
  },

  mkdirSync(path, options = {}) {
    return syncOperation('mkdirSync', { path, options });
  },

  readdirSync(path, options = {}) {
    return syncOperation('readdirSync', { path });
  },

  unlinkSync(path) {
    return syncOperation('unlinkSync', { path });
  },

  rmdirSync(path) {
    return syncOperation('rmdirSync', { path });
  },

  // Async versions that delegate to sync for now
  async readFile(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    try {
      const result = this.readFileSync(path, options);
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async writeFile(path, data, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    try {
      this.writeFileSync(path, data, options);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async stat(path, callback) {
    try {
      const result = this.statSync(path);
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async exists(path, callback) {
    const result = this.existsSync(path);
    if (callback) callback(result);
    return result;
  },

  async mkdir(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    try {
      this.mkdirSync(path, options);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async readdir(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    try {
      const result = this.readdirSync(path, options);
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async unlink(path, callback) {
    try {
      this.unlinkSync(path);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async rmdir(path, callback) {
    try {
      this.rmdirSync(path);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  // Stream creation (basic implementation)
  createReadStream(path, options = {}) {
    // Return a readable stream-like object
    const stream = new EventTarget();
    
    // Read file asynchronously and emit data
    setTimeout(async () => {
      try {
        const data = this.readFileSync(path);
        stream.dispatchEvent(new CustomEvent('data', { detail: data }));
        stream.dispatchEvent(new Event('end'));
      } catch (err) {
        stream.dispatchEvent(new CustomEvent('error', { detail: err }));
      }
    }, 0);
    
    return stream;
  },

  createWriteStream(path, options = {}) {
    // Return a writable stream-like object
    const chunks = [];
    const stream = {
      write(chunk) {
        chunks.push(chunk);
        return true;
      },
      end(chunk) {
        if (chunk) chunks.push(chunk);
        const data = Buffer.concat(chunks);
        fs.writeFileSync(path, data);
      }
    };
    
    return stream;
  }
};

// Check for SharedArrayBuffer support
if (typeof SharedArrayBuffer === 'undefined') {
  console.warn('SharedArrayBuffer is not available. OPFS synchronous operations require cross-origin isolation.');
  console.warn('Add these headers to enable: Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp');
}

module.exports = fs;
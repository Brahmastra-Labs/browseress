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
      // Convert array back to Buffer if available, otherwise return Uint8Array
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(result);
      } else {
        return new Uint8Array(result);
      }
    }
    
    return result;
  },

  writeFileSync(path, data, options = {}) {
    const encoding = typeof options === 'string' ? options : options.encoding;
    
    // Convert Buffer/Uint8Array to array for transfer
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      data = Array.from(data);
    } else if (data instanceof Uint8Array) {
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

  // Async versions with proper main thread support
  async readFile(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    try {
      let result;
      if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        // Main thread: Use native async OPFS
        const data = await nativeReadFile(path);
        const encoding = typeof options === 'string' ? options : options?.encoding;
        
        result = data;
        if (encoding) {
          result = new TextDecoder(encoding).decode(data);
        } else if (typeof Buffer !== 'undefined') {
          result = Buffer.from(data);
        }
      } else {
        // Worker thread: Use sync version
        result = fs.readFileSync(path, options);
      }
      
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
      if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        // Main thread: Use native async OPFS
        await nativeWriteFile(path, data);
      } else {
        // Worker thread: Use sync version
        fs.writeFileSync(path, data, options);
      }
      
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async stat(path, callback) {
    try {
      let result;
      if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        // Main thread: Use native async OPFS
        result = await nativeStat(path);
      } else {
        // Worker thread: Use sync version
        result = fs.statSync(path);
      }
      
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },

  async exists(path, callback) {
    let result;
    if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      // Main thread: Use native async OPFS
      try {
        await nativeStat(path);
        result = true;
      } catch (err) {
        result = false;
      }
    } else {
      // Worker thread: Use sync version
      result = fs.existsSync(path);
    }
    
    if (callback) callback(result);
    return result;
  },

  async mkdir(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    try {
      if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        // Main thread: Use native async OPFS
        const recursive = options?.recursive || false;
        const root = await navigator.storage.getDirectory();
        const parts = path.split('/').filter(p => p);
        let dir = root;
        
        for (let i = 0; i < parts.length; i++) {
          try {
            dir = await dir.getDirectoryHandle(parts[i], { create: recursive });
          } catch (err) {
            if (!recursive) {
              throw err;
            }
            dir = await dir.getDirectoryHandle(parts[i], { create: true });
          }
        }
      } else {
        // Worker thread: Use sync version
        fs.mkdirSync(path, options);
      }
      
      if (callback) callback(null);
    } catch (err) {
      const error = new Error(err.message);
      error.code = err.name === 'NotFoundError' ? 'ENOENT' : 'UNKNOWN';
      if (callback) callback(error);
      else throw error;
    }
  },

  async readdir(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    try {
      let result;
      if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        // Main thread: Use native async OPFS
        const root = await navigator.storage.getDirectory();
        const parts = path.split('/').filter(p => p);
        let dir = root;
        
        for (let i = 0; i < parts.length; i++) {
          dir = await dir.getDirectoryHandle(parts[i], { create: false });
        }
        
        result = [];
        for await (const entry of dir.values()) {
          result.push(entry.name);
        }
      } else {
        // Worker thread: Use sync version
        result = fs.readdirSync(path, options);
      }
      
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      const error = new Error(err.message);
      error.code = err.name === 'NotFoundError' ? 'ENOENT' : 'UNKNOWN';
      if (callback) callback(error);
      else throw error;
    }
  },

  async unlink(path, callback) {
    try {
      if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        // Main thread: Use native async OPFS
        const root = await navigator.storage.getDirectory();
        const parts = path.split('/').filter(p => p);
        let dir = root;
        
        // Navigate to parent directory
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i], { create: false });
        }
        
        // Remove the file
        const fileName = parts[parts.length - 1];
        await dir.removeEntry(fileName);
      } else {
        // Worker thread: Use sync version
        fs.unlinkSync(path);
      }
      
      if (callback) callback(null);
    } catch (err) {
      const error = new Error(err.message);
      error.code = err.name === 'NotFoundError' ? 'ENOENT' : 'UNKNOWN';
      if (callback) callback(error);
      else throw error;
    }
  },

  async rmdir(path, callback) {
    try {
      if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        // Main thread: Use native async OPFS
        const root = await navigator.storage.getDirectory();
        const parts = path.split('/').filter(p => p);
        let dir = root;
        
        // Navigate to parent directory
        for (let i = 0; i < parts.length - 1; i++) {
          dir = await dir.getDirectoryHandle(parts[i], { create: false });
        }
        
        // Remove the directory
        const dirName = parts[parts.length - 1];
        await dir.removeEntry(dirName);
      } else {
        // Worker thread: Use sync version
        fs.rmdirSync(path);
      }
      
      if (callback) callback(null);
    } catch (err) {
      const error = new Error(err.message);
      error.code = err.name === 'NotFoundError' ? 'ENOENT' : 'UNKNOWN';
      if (callback) callback(error);
      else throw error;
    }
  },

  // Stream creation (basic implementation)
  createReadStream(path, options = {}) {
    // Return a readable stream-like object
    const stream = new EventTarget();
    
    // Add pipe method for Express compatibility
    stream.pipe = function(destination, options) {
      this.addEventListener('data', (event) => {
        if (destination.write) {
          destination.write(event.detail);
        }
      });
      
      this.addEventListener('end', () => {
        if (destination.end) {
          destination.end();
        }
      });
      
      this.addEventListener('error', (event) => {
        if (destination.destroy) {
          destination.destroy(event.detail);
        } else if (destination.emit) {
          destination.emit('error', event.detail);
        }
      });
      
      return destination;
    };
    
    // Read file asynchronously and emit data
    setTimeout(async () => {
      try {
        const data = await fs.readFile(path);
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
        // Concatenate chunks - handle both Buffer and Uint8Array
        let totalLength = 0;
        chunks.forEach(chunk => {
          totalLength += chunk.length || chunk.byteLength || 0;
        });
        
        const data = new Uint8Array(totalLength);
        let offset = 0;
        chunks.forEach(chunk => {
          if (chunk instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(chunk))) {
            data.set(chunk, offset);
            offset += chunk.length;
          } else if (typeof chunk === 'string') {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(chunk);
            data.set(encoded, offset);
            offset += encoded.length;
          }
        });
        
        fs.writeFileSync(path, data);
      }
    };
    
    return stream;
  }
};

// Check if we're in a Worker context
const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
const isMainThread = !isWorker;

// Override synchronous methods on main thread to prevent Atomics.wait
if (isMainThread && typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
  // Override existsSync to always return false on main thread
  // This prevents EJS from using sync path and forces it to use our async includer
  fs.existsSync = function(path) {
    console.warn(`fs.existsSync called on main thread for path: ${path}. Returning false to force async path.`);
    return false;
  };
  
  // Override other sync methods to throw clear errors
  const syncMethods = ['readFileSync', 'writeFileSync', 'statSync', 'mkdirSync', 'readdirSync', 'unlinkSync', 'rmdirSync'];
  syncMethods.forEach(method => {
    const original = fs[method];
    fs[method] = function(...args) {
      console.error(`fs.${method} called on main thread. This would block the UI.`);
      throw new Error(`Cannot use synchronous fs.${method} on the main thread. Use the async version instead.`);
    };
  });
}

// Native OPFS async operations for main thread
async function nativeReadFile(path) {
  try {
    const root = await navigator.storage.getDirectory();
    const parts = path.split('/').filter(p => p);
    let dir = root;
    
    // Navigate to the file's directory
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: false });
    }
    
    // Get the file
    const fileName = parts[parts.length - 1];
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    const error = new Error(err.message);
    error.code = err.name === 'NotFoundError' ? 'ENOENT' : 'UNKNOWN';
    throw error;
  }
}

async function nativeWriteFile(path, data) {
  try {
    const root = await navigator.storage.getDirectory();
    const parts = path.split('/').filter(p => p);
    let dir = root;
    
    // Create directories if needed
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    
    // Write the file
    const fileName = parts[parts.length - 1];
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    
    if (typeof data === 'string') {
      await writable.write(new TextEncoder().encode(data));
    } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
      await writable.write(data);
    } else {
      await writable.write(new Uint8Array(data));
    }
    
    await writable.close();
  } catch (err) {
    const error = new Error(err.message);
    error.code = 'UNKNOWN';
    throw error;
  }
}

async function nativeStat(path) {
  try {
    const root = await navigator.storage.getDirectory();
    const parts = path.split('/').filter(p => p);
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      try {
        current = await current.getDirectoryHandle(part);
      } catch (e) {
        // Try as file
        if (i === parts.length - 1) {
          const fileHandle = await current.getFileHandle(part);
          const file = await fileHandle.getFile();
          return {
            isFile: () => true,
            isDirectory: () => false,
            size: file.size,
            mtime: new Date(file.lastModified),
            mode: 0o644
          };
        }
        throw e;
      }
    }
    
    // It's a directory
    return {
      isFile: () => false,
      isDirectory: () => true,
      size: 0,
      mtime: new Date(),
      mode: 0o755
    };
  } catch (err) {
    const error = new Error(err.message);
    error.code = err.name === 'NotFoundError' ? 'ENOENT' : 'UNKNOWN';
    throw error;
  }
}

// No longer need overrides - async methods now handle main thread logic internally

// Check for SharedArrayBuffer support (only matters for sync operations)
if (typeof SharedArrayBuffer === 'undefined' && !isMainThread) {
  console.warn('SharedArrayBuffer is not available. OPFS synchronous operations require cross-origin isolation.');
  console.warn('Add these headers to enable: Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp');
}

module.exports = fs;
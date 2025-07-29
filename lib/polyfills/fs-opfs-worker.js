/*!
 * OPFS Synchronous Worker
 * Provides synchronous file system operations using SharedArrayBuffer
 * for blocking communication with the main thread
 */

'use strict';

// Initialize OPFS root
let rootDirPromise = null;

async function getRootDir() {
  if (!rootDirPromise) {
    rootDirPromise = navigator.storage.getDirectory();
  }
  return rootDirPromise;
}

// Helper to resolve a path to a file handle
async function resolvePath(pathStr) {
  const root = await getRootDir();
  const parts = pathStr.split('/').filter(p => p);
  
  let current = root;
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      current = await current.getDirectoryHandle(parts[i], { create: false });
    } catch (e) {
      throw new Error(`ENOENT: no such file or directory, '${pathStr}'`);
    }
  }
  
  return { parent: current, name: parts[parts.length - 1] || '' };
}

// Operations map
const operations = {
  async readFileSync(args) {
    const { path, encoding } = args;
    const { parent, name } = await resolvePath(path);
    
    try {
      const fileHandle = await parent.getFileHandle(name);
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      
      if (encoding === 'utf8' || encoding === 'utf-8') {
        return new TextDecoder().decode(buffer);
      }
      
      return Array.from(new Uint8Array(buffer));
    } catch (e) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
  },

  async writeFileSync(args) {
    const { path, data } = args;
    const { parent, name } = await resolvePath(path);
    
    try {
      const fileHandle = await parent.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      
      let buffer;
      if (typeof data === 'string') {
        buffer = new TextEncoder().encode(data);
      } else if (Array.isArray(data)) {
        buffer = new Uint8Array(data);
      } else {
        buffer = data;
      }
      
      await writable.write(buffer);
      await writable.close();
      
      return null;
    } catch (e) {
      throw new Error(`EIO: i/o error, write '${path}'`);
    }
  },

  async statSync(args) {
    const { path } = args;
    
    if (path === '/' || path === '') {
      return {
        isFile: false,
        isDirectory: true,
        size: 0,
        mtime: new Date(),
        mode: 16877 // directory mode
      };
    }
    
    const { parent, name } = await resolvePath(path);
    
    try {
      // Try as file first
      try {
        const fileHandle = await parent.getFileHandle(name);
        const file = await fileHandle.getFile();
        return {
          isFile: true,
          isDirectory: false,
          size: file.size,
          mtime: new Date(file.lastModified),
          mode: 33188 // file mode
        };
      } catch (e) {
        // Try as directory
        await parent.getDirectoryHandle(name);
        return {
          isFile: false,
          isDirectory: true,
          size: 0,
          mtime: new Date(),
          mode: 16877 // directory mode
        };
      }
    } catch (e) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
  },

  async existsSync(args) {
    const { path } = args;
    
    try {
      await this.statSync({ path });
      return true;
    } catch (e) {
      return false;
    }
  },

  async mkdirSync(args) {
    const { path, options = {} } = args;
    const { recursive = false } = options;
    
    const parts = path.split('/').filter(p => p);
    const root = await getRootDir();
    
    let current = root;
    for (const part of parts) {
      try {
        current = await current.getDirectoryHandle(part, { create: recursive });
      } catch (e) {
        if (!recursive) {
          throw new Error(`ENOENT: no such file or directory, mkdir '${path}'`);
        }
        current = await current.getDirectoryHandle(part, { create: true });
      }
    }
    
    return null;
  },

  async readdirSync(args) {
    const { path } = args;
    
    let dirHandle;
    if (path === '/' || path === '') {
      dirHandle = await getRootDir();
    } else {
      const { parent, name } = await resolvePath(path);
      try {
        dirHandle = await parent.getDirectoryHandle(name);
      } catch (e) {
        throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
      }
    }
    
    const entries = [];
    for await (const entry of dirHandle.values()) {
      entries.push(entry.name);
    }
    
    return entries;
  },

  async unlinkSync(args) {
    const { path } = args;
    const { parent, name } = await resolvePath(path);
    
    try {
      await parent.removeEntry(name);
      return null;
    } catch (e) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }
  },

  async rmdirSync(args) {
    const { path } = args;
    const { parent, name } = await resolvePath(path);
    
    try {
      await parent.removeEntry(name);
      return null;
    } catch (e) {
      throw new Error(`ENOENT: no such file or directory, rmdir '${path}'`);
    }
  }
};

// Message handler
if (typeof self !== 'undefined') {
  self.onmessage = async (event) => {
  const { id, method, args, signal } = event.data;
  const view = new Int32Array(signal);
  
  try {
    const handler = operations[method];
    if (!handler) {
      throw new Error(`Unknown method: ${method}`);
    }
    
    const result = await handler.call(operations, args);
    
    // Write success response
    Atomics.store(view, 0, 1); // status: success
    
    // Send result via postMessage
    self.postMessage({ id, result });
    
  } catch (error) {
    // Write error response
    Atomics.store(view, 0, 2); // status: error
    
    // Send error via postMessage
    self.postMessage({ id, error: error.message });
  }
  
  // Notify main thread
  Atomics.notify(view, 0);
  };
}
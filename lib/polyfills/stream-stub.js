/*!
 * stream-stub
 * Minimal stream implementation for browser
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

// Polyfill for process.nextTick if not available
var nextTick = (typeof process !== 'undefined' && process.nextTick) || 
               (typeof setImmediate !== 'undefined' && setImmediate) ||
               function(fn) { setTimeout(fn, 0); };

// Base Stream class
function Stream() {
  EventEmitter.call(this);
}

util.inherits(Stream, EventEmitter);

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      dest.write(chunk);
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // End handling
  if (!options || options.end !== false) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  function onend() {
    if (dest.end) {
      dest.end();
    }
  }

  function onclose() {
    if (dest.destroy) {
      dest.destroy();
    }
  }

  // Error handling
  source.on('error', onerror);
  dest.on('error', onerror);

  function onerror(er) {
    cleanup();
    if (!this.listenerCount('error')) {
      throw er;
    }
  }

  // Cleanup function
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  return dest;
};

// Stream classes
function Readable(options) {
  Stream.call(this);
  this.readable = true;
  this._readableState = {
    flowing: null,
    ended: false,
    destroyed: false
  };
  this._webStream = null;
  this._reader = null;
  this._reading = false;
}
util.inherits(Readable, Stream);

// Enhanced Readable with Web ReadableStream bridge
Readable.prototype.pause = function() {
  this._readableState.flowing = false;
  return this;
};

Readable.prototype.resume = function() {
  this._readableState.flowing = true;
  this._startReading();
  return this;
};

Readable.prototype.isPaused = function() {
  return this._readableState.flowing === false;
};

// Method to set up the Web ReadableStream bridge
Readable.prototype._setWebStream = function(webStream) {
  this._webStream = webStream;
  return this;
};

// Internal method to start reading from Web ReadableStream
Readable.prototype._startReading = function() {
  if (this._reading || !this._webStream || this._readableState.ended) {
    return;
  }
  
  this._reading = true;
  
  // Use the modern async iterator approach
  this._consumeWebStream();
};

Readable.prototype._consumeWebStream = async function() {
  try {
    // Use for await...of to consume the Web ReadableStream
    for await (const chunk of this._webStream) {
      // Only emit if we're still flowing and not ended
      if (this._readableState.flowing !== false && !this._readableState.ended) {
        this.emit('data', chunk);
      }
      
      // Respect backpressure - pause if flowing is set to false
      if (this._readableState.flowing === false) {
        break;
      }
    }
    
    // Stream completed successfully
    if (!this._readableState.ended) {
      this._readableState.ended = true;
      this.emit('end');
    }
  } catch (error) {
    this.emit('error', error);
  } finally {
    this._reading = false;
  }
};

// Static method to create a Readable from Web ReadableStream
Readable.fromWebStream = function(webStream) {
  const readable = new Readable();
  readable._setWebStream(webStream);
  
  // Auto-start if not explicitly paused
  nextTick(() => {
    if (readable._readableState.flowing !== false) {
      readable.resume();
    }
  });
  
  return readable;
};

// Static method to create a Readable from data (like body-parser expects)
Readable.fromData = function(data) {
  // Convert data to Web ReadableStream using ReadableStream.from if available
  let webStream;
  
  if (typeof ReadableStream !== 'undefined' && ReadableStream.from) {
    // Use native ReadableStream.from for modern browsers
    const chunks = data ? [new TextEncoder().encode(data)] : [];
    webStream = ReadableStream.from(chunks);
  } else {
    // Fallback: create ReadableStream manually
    const chunks = data ? [new TextEncoder().encode(data)] : [];
    let index = 0;
    
    webStream = new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(chunks[index++]);
        } else {
          controller.close();
        }
      }
    });
  }
  
  return Readable.fromWebStream(webStream);
};

function Writable(options) {
  Stream.call(this);
  this.writable = true;
}
util.inherits(Writable, Stream);

function Duplex(options) {
  Stream.call(this);
  this.readable = true;
  this.writable = true;
}
util.inherits(Duplex, Stream);

function Transform(options) {
  Duplex.call(this, options);
}
util.inherits(Transform, Duplex);

function PassThrough(options) {
  Transform.call(this, options);
}
util.inherits(PassThrough, Transform);

// Exports
Stream.Readable = Readable;
Stream.Writable = Writable;
Stream.Duplex = Duplex;
Stream.Transform = Transform;
Stream.PassThrough = PassThrough;
Stream.Stream = Stream;

module.exports = Stream;
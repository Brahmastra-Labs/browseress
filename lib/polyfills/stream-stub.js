/*!
 * stream-stub
 * Minimal stream implementation for browser
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('./util-stub');

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
}
util.inherits(Readable, Stream);

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
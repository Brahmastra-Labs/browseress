/*!
 * process-stub
 * Browser-compatible process polyfill
 */

'use strict';

const EventEmitter = require('./events').EventEmitter;

// Create process object that inherits from EventEmitter
const process = Object.create(EventEmitter.prototype);
EventEmitter.call(process);

// Mutable env object
process.env = {
  NODE_ENV: 'development'
};

// Version information
process.version = 'v16.0.0';
process.versions = {
  node: '16.0.0',
  v8: '9.0.0',
  modules: '93',
  http_parser: '2.9.4'
};

// Platform information
process.arch = 'browser';
process.platform = 'browser';
process.pid = 1;
process.ppid = 0;

// Arguments (minimal)
process.argv = ['node', '/'];
process.argv0 = 'node';
process.execPath = '/usr/bin/node';

// Working directory
process.cwd = function() {
  return '/';
};

process.chdir = function(directory) {
  throw new Error('process.chdir is not supported in the browser');
};

// Exit handling
process.exit = function(code) {
  process.exitCode = code || 0;
  // Emit exit event but don't actually exit (browser constraint)
  process.emit('exit', process.exitCode);
};

process.exitCode = undefined;

// Timing
process.uptime = function() {
  return 0;
};

// NextTick implementation
const tickQueue = [];
let tickScheduled = false;

function processTick() {
  tickScheduled = false;
  const queue = tickQueue.slice();
  tickQueue.length = 0;
  
  for (let i = 0; i < queue.length; i++) {
    const tick = queue[i];
    try {
      tick.callback.apply(null, tick.args);
    } catch (err) {
      process.emit('uncaughtException', err);
    }
  }
}

process.nextTick = function(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }
  
  const args = Array.prototype.slice.call(arguments, 1);
  tickQueue.push({ callback: callback, args: args });
  
  if (!tickScheduled) {
    tickScheduled = true;
    if (typeof setImmediate !== 'undefined') {
      setImmediate(processTick);
    } else {
      setTimeout(processTick, 0);
    }
  }
};

// Stub methods that don't make sense in browser
process.abort = function() {
  throw new Error('process.abort is not supported in the browser');
};

process.umask = function() {
  return 0;
};

process.hrtime = function(previousTimestamp) {
  const baseNow = Date.now();
  const clocktime = baseNow * 1e-3;
  let seconds = Math.floor(clocktime);
  let nanoseconds = Math.floor((clocktime % 1) * 1e9);
  
  if (previousTimestamp) {
    seconds -= previousTimestamp[0];
    nanoseconds -= previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  
  return [seconds, nanoseconds];
};

process.hrtime.bigint = function() {
  return BigInt(Date.now()) * 1000000n;
};

// Features
process.features = {
  inspector: false,
  debug: false,
  uv: false,
  ipv6: true,
  tls_alpn: false,
  tls_sni: false,
  tls_ocsp: false,
  tls: false
};

// Config
process.config = {
  variables: {
    node_prefix: '/usr',
    node_use_openssl: false
  }
};

// Title (not really applicable in browser)
process.title = 'browser';

// Domain (deprecated but some code might use it)
process.domain = undefined;

// Release info
process.release = {
  name: 'node',
  sourceUrl: '',
  headersUrl: ''
};

module.exports = process;
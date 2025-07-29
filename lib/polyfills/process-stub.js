/*!
 * process-stub
 * Minimal process polyfill for browser
 */

'use strict';

module.exports = {
  env: {},
  version: 'v1.0.0',
  versions: {},
  arch: 'browser',
  platform: 'browser',
  nextTick: function(callback) {
    if (typeof setImmediate !== 'undefined') {
      setImmediate(callback);
    } else {
      setTimeout(callback, 0);
    }
  },
  cwd: function() {
    return '/';
  },
  chdir: function() {
    throw new Error('process.chdir is not supported in the browser');
  }
};
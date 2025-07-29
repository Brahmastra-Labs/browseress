/*!
 * zlib-stub
 * Minimal zlib stub for browser
 */

'use strict';

// Stub implementation - no actual compression in browser
function Gzip() {}
Gzip.prototype.write = function() {};
Gzip.prototype.end = function() {};
Gzip.prototype.on = function() { return this; };
Gzip.prototype.removeListener = function() { return this; };

function Gunzip() {}
Gunzip.prototype.write = function() {};
Gunzip.prototype.end = function() {};
Gunzip.prototype.on = function() { return this; };
Gunzip.prototype.removeListener = function() { return this; };

function Deflate() {}
Deflate.prototype.write = function() {};
Deflate.prototype.end = function() {};
Deflate.prototype.on = function() { return this; };
Deflate.prototype.removeListener = function() { return this; };

function Inflate() {}
Inflate.prototype.write = function() {};
Inflate.prototype.end = function() {};
Inflate.prototype.on = function() { return this; };
Inflate.prototype.removeListener = function() { return this; };

exports.createGzip = function() { return new Gzip(); };
exports.createGunzip = function() { return new Gunzip(); };
exports.createDeflate = function() { return new Deflate(); };
exports.createInflate = function() { return new Inflate(); };
exports.gzip = function(buf, cb) { cb(null, buf); };
exports.gunzip = function(buf, cb) { cb(null, buf); };
exports.deflate = function(buf, cb) { cb(null, buf); };
exports.inflate = function(buf, cb) { cb(null, buf); };
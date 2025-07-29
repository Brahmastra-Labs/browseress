/*!
 * util-stub
 * Minimal util implementation for browser
 */

'use strict';

// Simple inherits implementation
exports.inherits = function inherits(ctor, superCtor) {
  if (ctor === undefined || ctor === null) {
    throw new TypeError('The constructor to "inherits" must not be null or undefined');
  }
  if (superCtor === undefined || superCtor === null) {
    throw new TypeError('The super constructor to "inherits" must not be null or undefined');
  }
  if (superCtor.prototype === undefined) {
    throw new TypeError('The super constructor to "inherits" must have a prototype property');
  }
  ctor.super_ = superCtor;
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
};

// Other commonly used util functions
exports.isArray = Array.isArray;

exports.isDate = function(obj) {
  return obj instanceof Date;
};

exports.isError = function(obj) {
  return obj instanceof Error;
};

exports.isFunction = function(obj) {
  return typeof obj === 'function';
};

exports.isNull = function(obj) {
  return obj === null;
};

exports.isNullOrUndefined = function(obj) {
  return obj == null;
};

exports.isNumber = function(obj) {
  return typeof obj === 'number';
};

exports.isObject = function(obj) {
  return typeof obj === 'object' && obj !== null;
};

exports.isString = function(obj) {
  return typeof obj === 'string';
};

exports.isSymbol = function(obj) {
  return typeof obj === 'symbol';
};

exports.isUndefined = function(obj) {
  return obj === void 0;
};

// Deprecate function stub
exports.deprecate = function(fn, msg) {
  return fn;
};

// Format function stub
exports.format = function(f) {
  var i = 1;
  var args = arguments;
  var str = String(f).replace(/%[sdj%]/g, function(x) {
    if (x === '%%') return '%';
    if (i >= args.length) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < args.length; x = args[++i]) {
    if (x === null || (!exports.isObject(x))) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

// Simple inspect stub
function inspect(obj) {
  return JSON.stringify(obj);
}
exports.inspect = inspect;
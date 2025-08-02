/*!
 * url polyfill
 * Browser-compatible implementation of Node.js url module
 * Based on Node.js url module
 * MIT Licensed
 */

'use strict';

// Import querystring module
// Use qs for compatibility with Express's extended query parser
const querystring = require('qs');

/**
 * Url constructor
 */
function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396
const protocolPattern = /^([a-z0-9.+-]+:)/i;
const portPattern = /:[0-9]*$/;
const simplePathPattern = /^(\/\/?(?!\/)[^?\s]*)(\?[^\s]*)?$/;

// protocols that always contain a // bit.
const slashedProtocol = {
  http: true,
  https: true,
  ftp: true,
  gopher: true,
  file: true,
  'http:': true,
  'https:': true,
  'ftp:': true,
  'gopher:': true,
  'file:': true
};

// protocols that never have a hostname.
const hostlessProtocol = {
  javascript: true,
  'javascript:': true
};

/**
 * Parse a URL string and return a Url object
 * @param {string} url - The URL string to parse
 * @param {boolean} parseQueryString - Whether to parse the query string into an object
 * @param {boolean} slashesDenoteHost - Whether slashes denote a host
 * @returns {Url} The parsed URL object
 */
function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof url === 'object' && url instanceof Url) {
    return url;
  }

  var u = new Url();
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

/**
 * Parse method for Url prototype
 */
Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (typeof url !== 'string') {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Handle backslash conversion
  var queryIndex = url.indexOf('?');
  var splitter = queryIndex !== -1 && queryIndex < url.indexOf('#') ? '?' : '#';
  var uSplit = url.split(splitter);
  var slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url.trim();

  // Try fast path for simple paths
  if (!slashesDenoteHost && url.split('#').length === 1) {
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  // For more complex URLs, use the browser's URL API
  try {
    // Determine if this is a relative or absolute URL
    var isRelative = !protocolPattern.test(rest) && rest[0] !== '/';
    var baseUrl = 'http://example.com';
    var fullUrl = rest;
    
    if (isRelative) {
      fullUrl = baseUrl + '/' + rest;
    } else if (rest[0] === '/') {
      fullUrl = baseUrl + rest;
    }
    
    // Use the browser's URL API
    var parsed = new URL(fullUrl);
    
    this.protocol = parsed.protocol || null;
    this.slashes = slashedProtocol[this.protocol] || false;
    this.auth = null;
    
    // Extract auth from URL if present
    if (parsed.username || parsed.password) {
      this.auth = (parsed.username || '') + (parsed.password ? ':' + parsed.password : '');
    }
    
    this.host = parsed.host || null;
    this.port = parsed.port || null;
    this.hostname = parsed.hostname || null;
    this.hash = parsed.hash || null;
    this.search = parsed.search || null;
    
    // Parse query
    if (this.search) {
      var queryStr = this.search.substr(1);
      if (parseQueryString) {
        this.query = querystring.parse(queryStr);
      } else {
        this.query = queryStr;
      }
    } else if (parseQueryString) {
      this.query = {};
    } else {
      this.query = null;
    }
    
    this.pathname = parsed.pathname || null;
    
    // Build path
    if (this.pathname || this.search) {
      this.path = (this.pathname || '') + (this.search || '');
    } else {
      this.path = null;
    }
    
    // Set href
    if (isRelative || rest[0] === '/') {
      // For relative URLs, use the original input
      this.href = rest;
      if (!this.protocol) {
        this.protocol = null;
        this.slashes = null;
        this.host = null;
        this.hostname = null;
        this.port = null;
      }
    } else {
      this.href = parsed.href;
    }
    
  } catch (e) {
    // Fallback for invalid URLs - treat as simple path
    this.path = rest;
    this.href = rest;
    this.pathname = rest.split('?')[0];
    var qIndex = rest.indexOf('?');
    if (qIndex !== -1) {
      this.search = rest.substr(qIndex);
      if (parseQueryString) {
        this.query = querystring.parse(this.search.substr(1));
      } else {
        this.query = this.search.substr(1);
      }
    } else if (parseQueryString) {
      this.search = '';
      this.query = {};
    }
  }
  
  return this;
};

/**
 * Format a parsed URL object back into a string
 */
Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '';
  var pathname = this.pathname || '';
  var hash = this.hash || '';
  var host = false;
  var query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ? this.hostname : '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query && typeof this.query === 'object' && Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') {
    protocol += ':';
  }

  if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') {
      pathname = '/' + pathname;
    }
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') {
    hash = '#' + hash;
  }
  if (search && search.charAt(0) !== '?') {
    search = '?' + search;
  }

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

/**
 * Parse the host to extract hostname and port
 */
Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) {
    this.hostname = host;
  }
};

/**
 * Resolve a relative URL against this URL
 */
Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

/**
 * Resolve a relative URL object against this URL
 */
Url.prototype.resolveObject = function(relative) {
  if (typeof relative === 'string') {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // Hash is always overridden
  result.hash = relative.hash;

  // If the relative url is empty, return
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // Handle absolute URLs
  if (relative.slashes && !relative.protocol) {
    // Take everything from relative except protocol
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol') {
        result[rkey] = relative[rkey];
      }
    }
    if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
      result.pathname = '/';
      result.path = result.pathname;
    }
    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // If it's a different protocol, take everything from relative
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }
    result.protocol = relative.protocol;
    if (!relative.host && !/^file:?$/.test(relative.protocol) && !hostlessProtocol[relative.protocol]) {
      const relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    if (result.pathname || result.search) {
      result.path = (result.pathname || '') + (result.search || '');
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  // Handle relative paths
  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/');
  var isRelAbs = (
    relative.host ||
    relative.pathname && relative.pathname.charAt(0) === '/'
  );
  var mustEndAbs = (isRelAbs || isSourceAbs || (result.host && relative.pathname));
  var removeAllDots = mustEndAbs;
  var srcPath = result.pathname && result.pathname.split('/') || [];
  var relPath = relative.pathname && relative.pathname.split('/') || [];

  // Resolve the path
  if (relative.host || relative.pathname === '') {
    srcPath = relPath;
  } else if (relPath.length) {
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
  }

  // Remove . and .. from the path
  if (srcPath.length) {
    var last = srcPath.slice(-1)[0];
    var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === ''
    );
    
    var up = 0;
    for (var i = srcPath.length; i >= 0; i--) {
      last = srcPath[i];
      if (last === '.') {
        srcPath.splice(i, 1);
      } else if (last === '..') {
        srcPath.splice(i, 1);
        up++;
      } else if (up) {
        srcPath.splice(i, 1);
        up--;
      }
    }

    if (!mustEndAbs && !removeAllDots) {
      for (; up--; up) {
        srcPath.unshift('..');
      }
    }

    if (mustEndAbs && srcPath[0] !== '' && (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
      srcPath.unshift('');
    }

    if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
      srcPath.push('');
    }
  }

  result.pathname = srcPath.join('/');
  result.search = relative.search;
  result.query = relative.query;
  
  if (result.pathname !== null || result.search !== null) {
    result.path = (result.pathname || '') + (result.search || '');
  }
  
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  
  return result;
};

/**
 * Format a URL object into a string
 */
function urlFormat(obj) {
  if (typeof obj === 'string') {
    obj = urlParse(obj);
  }
  if (!(obj instanceof Url)) {
    return Url.prototype.format.call(obj);
  }
  return obj.format();
}

/**
 * Resolve a relative URL against a base URL
 */
function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

/**
 * Resolve a relative URL object against a base URL
 */
function urlResolveObject(source, relative) {
  if (!source) {
    return relative;
  }
  return urlParse(source, false, true).resolveObject(relative);
}

// Export the main functions
exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;
exports.Url = Url;
/*!
 * Path Module Polyfill
 * Browser-compatible implementation of Node.js path module
 * Based on Node.js path module (POSIX only)
 * Copyright(c) Node.js contributors
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */

const SLASH_CODE = 47; // '/'
const DOT_CODE = 46;   // '.'

/**
 * Assert that path is a string.
 * @private
 */

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

/**
 * Normalize string path, removing '..' and '.' parts.
 * @private
 */

function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (code === SLASH_CODE) {
      break;
    } else {
      code = SLASH_CODE;
    }
    
    if (code === SLASH_CODE) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || 
            res.charCodeAt(res.length - 1) !== DOT_CODE || 
            res.charCodeAt(res.length - 2) !== DOT_CODE) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) {
            res += '/..';
          } else {
            res = '..';
          }
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += '/' + path.slice(lastSlash + 1, i);
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === DOT_CODE && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

/**
 * Format a parsed path object into a path string.
 * @private
 */

function formatPath(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  
  if (!dir) {
    return base;
  }
  
  if (dir === pathObject.root) {
    return dir + base;
  }
  
  return dir + sep + base;
}

/**
 * Path module exports.
 * @public
 */

var path = module.exports = {};

/**
 * Resolve a sequence of paths into an absolute path.
 *
 * @param {...string} paths
 * @return {string}
 * @public
 */

path.resolve = function resolve() {
  var resolvedPath = '';
  var resolvedAbsolute = false;
  var cwd;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var segment;
    if (i >= 0) {
      segment = arguments[i];
    } else {
      // In browser context, use '/' as default working directory
      if (cwd === undefined) {
        cwd = '/';
      }
      segment = cwd;
    }

    assertPath(segment);

    // Skip empty entries
    if (segment.length === 0) {
      continue;
    }

    resolvedPath = segment + '/' + resolvedPath;
    resolvedAbsolute = segment.charCodeAt(0) === SLASH_CODE;
  }

  // Normalize the path
  resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

  if (resolvedAbsolute) {
    if (resolvedPath.length > 0) {
      return '/' + resolvedPath;
    } else {
      return '/';
    }
  } else if (resolvedPath.length > 0) {
    return resolvedPath;
  } else {
    return '.';
  }
};

/**
 * Normalize a path.
 *
 * @param {string} path
 * @return {string}
 * @public
 */

path.normalize = function normalize(path) {
  assertPath(path);

  if (path.length === 0) return '.';

  var isAbsolute = path.charCodeAt(0) === SLASH_CODE;
  var trailingSeparator = path.charCodeAt(path.length - 1) === SLASH_CODE;

  // Normalize the path
  path = normalizeStringPosix(path, !isAbsolute);

  if (path.length === 0 && !isAbsolute) path = '.';
  if (path.length > 0 && trailingSeparator) path += '/';

  if (isAbsolute) return '/' + path;
  return path;
};

/**
 * Test whether path is absolute.
 *
 * @param {string} path
 * @return {boolean}
 * @public
 */

path.isAbsolute = function isAbsolute(path) {
  assertPath(path);
  return path.length > 0 && path.charCodeAt(0) === SLASH_CODE;
};

/**
 * Join path segments.
 *
 * @param {...string} paths
 * @return {string}
 * @public
 */

path.join = function join() {
  if (arguments.length === 0) {
    return '.';
  }
  
  var joined;
  for (var i = 0; i < arguments.length; ++i) {
    var arg = arguments[i];
    assertPath(arg);
    if (arg.length > 0) {
      if (joined === undefined) {
        joined = arg;
      } else {
        joined += '/' + arg;
      }
    }
  }
  
  if (joined === undefined) {
    return '.';
  }
  
  return path.normalize(joined);
};

/**
 * Return the directory name of a path.
 *
 * @param {string} path
 * @return {string}
 * @public
 */

path.dirname = function dirname(path) {
  assertPath(path);
  
  if (path.length === 0) return '.';
  
  var code = path.charCodeAt(0);
  var hasRoot = code === SLASH_CODE;
  var end = -1;
  var matchedSlash = true;
  
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === SLASH_CODE) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) return '//';
  return path.slice(0, end);
};

/**
 * Return the last portion of a path.
 *
 * @param {string} path
 * @param {string} [ext]
 * @return {string}
 * @public
 */

path.basename = function basename(path, ext) {
  if (ext !== undefined && typeof ext !== 'string') {
    throw new TypeError('"ext" argument must be a string');
  }
  
  assertPath(path);

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path) return '';
    var extIdx = ext.length - 1;
    var firstNonSlashEnd = -1;
    
    for (i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === SLASH_CODE) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1) {
          // We saw the first non-path separator, remember this index in case
          // we need it if the extension ends up not matching
          matchedSlash = false;
          firstNonSlashEnd = i + 1;
        }
        if (extIdx >= 0) {
          // Try to match the explicit extension
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1) {
              // We matched the extension, so mark this as the end of our path
              // component
              end = i;
            }
          } else {
            // Extension does not match, so our result is the entire path
            // component
            extIdx = -1;
            end = firstNonSlashEnd;
          }
        }
      }
    }

    if (start === end) {
      end = firstNonSlashEnd;
    } else if (end === -1) {
      end = path.length;
    }
    return path.slice(start, end);
  } else {
    for (i = path.length - 1; i >= 0; --i) {
      if (path.charCodeAt(i) === SLASH_CODE) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // path component
        matchedSlash = false;
        end = i + 1;
      }
    }

    if (end === -1) return '';
    return path.slice(start, end);
  }
};

/**
 * Return the extension of the path.
 *
 * @param {string} path
 * @return {string}
 * @public
 */

path.extname = function extname(path) {
  assertPath(path);
  
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === SLASH_CODE) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === DOT_CODE) {
      // If this is our first dot, mark it as the start of our extension
      if (startDot === -1) {
        startDot = i;
      } else if (preDotState !== 1) {
        preDotState = 1;
      }
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  
  return path.slice(startDot, end);
};

/**
 * Format a path object into a path string.
 *
 * @param {Object} pathObject
 * @return {string}
 * @public
 */

path.format = function format(pathObject) {
  if (pathObject === null || typeof pathObject !== 'object') {
    throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
  }
  return formatPath('/', pathObject);
};

/**
 * Parse a path string into an object.
 *
 * @param {string} path
 * @return {Object}
 * @public
 */

path.parse = function parse(path) {
  assertPath(path);

  var ret = { root: '', dir: '', base: '', ext: '', name: '' };
  if (path.length === 0) return ret;
  
  var code = path.charCodeAt(0);
  var isAbsolute = code === SLASH_CODE;
  var start;
  
  if (isAbsolute) {
    ret.root = '/';
    start = 1;
  } else {
    start = 0;
  }
  
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  var i = path.length - 1;

  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;

  // Get non-dir info
  for (; i >= start; --i) {
    code = path.charCodeAt(i);
    if (code === SLASH_CODE) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === DOT_CODE) {
      // If this is our first dot, mark it as the start of our extension
      if (startDot === -1) {
        startDot = i;
      } else if (preDotState !== 1) {
        preDotState = 1;
      }
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    if (end !== -1) {
      if (startPart === 0 && isAbsolute) {
        ret.base = ret.name = path.slice(1, end);
      } else {
        ret.base = ret.name = path.slice(startPart, end);
      }
    }
  } else {
    if (startPart === 0 && isAbsolute) {
      ret.name = path.slice(1, startDot);
      ret.base = path.slice(1, end);
    } else {
      ret.name = path.slice(startPart, startDot);
      ret.base = path.slice(startPart, end);
    }
    ret.ext = path.slice(startDot, end);
  }

  if (startPart > 0) {
    ret.dir = path.slice(0, startPart - 1);
  } else if (isAbsolute) {
    ret.dir = '/';
  }

  return ret;
};

/**
 * Solve the relative path from `from` to `to`.
 *
 * @param {string} from
 * @param {string} to
 * @return {string}
 * @public
 */

path.relative = function relative(from, to) {
  assertPath(from);
  assertPath(to);

  if (from === to) return '';

  from = path.resolve(from);
  to = path.resolve(to);

  if (from === to) return '';

  // Trim any leading backslashes
  var fromStart = 1;
  for (; fromStart < from.length; ++fromStart) {
    if (from.charCodeAt(fromStart) !== SLASH_CODE) break;
  }
  var fromEnd = from.length;
  var fromLen = fromEnd - fromStart;

  // Trim any leading backslashes
  var toStart = 1;
  for (; toStart < to.length; ++toStart) {
    if (to.charCodeAt(toStart) !== SLASH_CODE) break;
  }
  var toEnd = to.length;
  var toLen = toEnd - toStart;

  // Compare paths to find the longest common path from root
  var length = fromLen < toLen ? fromLen : toLen;
  var lastCommonSep = -1;
  var i = 0;
  for (; i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === SLASH_CODE) {
          // We get here if `from` is the exact base path for `to`.
          // For example: from='/foo/bar'; to='/foo/bar/baz'
          return to.slice(toStart + i + 1);
        } else if (i === 0) {
          // We get here if `from` is the root
          // For example: from='/'; to='/foo'
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === SLASH_CODE) {
          // We get here if `to` is the exact base path for `from`.
          // For example: from='/foo/bar/baz'; to='/foo/bar'
          lastCommonSep = i;
        } else if (i === 0) {
          // We get here if `to` is the root.
          // For example: from='/foo'; to='/'
          lastCommonSep = 0;
        }
      }
      break;
    }
    var fromCode = from.charCodeAt(fromStart + i);
    var toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode) break;
    else if (fromCode === SLASH_CODE) lastCommonSep = i;
  }

  var out = '';
  // Generate the relative path based on the path difference between `to`
  // and `from`
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || from.charCodeAt(i) === SLASH_CODE) {
      if (out.length === 0) {
        out += '..';
      } else {
        out += '/..';
      }
    }
  }

  // Lastly, append the rest of the destination (`to`) path that comes after
  // the common path parts
  if (out.length > 0) {
    return out + to.slice(toStart + lastCommonSep);
  } else {
    toStart += lastCommonSep;
    if (to.charCodeAt(toStart) === SLASH_CODE) ++toStart;
    return to.slice(toStart);
  }
};

/**
 * Path separator.
 * @public
 */

path.sep = '/';

/**
 * Path delimiter.
 * @public
 */

path.delimiter = ':';

/**
 * Posix specific pathing.
 * @public
 */

path.posix = path;

/**
 * Win32 specific pathing.
 * @public
 */

path.win32 = null;
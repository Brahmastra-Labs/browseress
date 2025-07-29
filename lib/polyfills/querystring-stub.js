/*!
 * querystring-stub
 * Minimal querystring implementation for browser
 */

'use strict';

exports.parse = function parse(str, sep, eq) {
  if (!str || typeof str !== 'string') return {};
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};
  var pairs = str.split(sep);
  
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    if (!pair) continue;
    
    var idx = pair.indexOf(eq);
    var key, val;
    
    if (idx >= 0) {
      key = decodeURIComponent(pair.slice(0, idx));
      val = decodeURIComponent(pair.slice(idx + 1));
    } else {
      key = decodeURIComponent(pair);
      val = '';
    }
    
    // Handle array values
    if (obj.hasOwnProperty(key)) {
      if (Array.isArray(obj[key])) {
        obj[key].push(val);
      } else {
        obj[key] = [obj[key], val];
      }
    } else {
      obj[key] = val;
    }
  }
  
  return obj;
};

exports.stringify = function stringify(obj, sep, eq) {
  sep = sep || '&';
  eq = eq || '=';
  var pairs = [];
  
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      pairs.push(encodeURIComponent(key) + eq + encodeURIComponent(obj[key]));
    }
  }
  
  return pairs.join(sep);
};
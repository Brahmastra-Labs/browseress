/*!
 * Net Stub Polyfill
 * Minimal net module implementation for Express compatibility
 * Only provides the isIP function that Express needs
 */

'use strict';

// IPv4 regex pattern
const IPv4_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv6 regex pattern (simplified)
const IPv6_REGEX = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

/**
 * Tests if input is an IP address. 
 * Returns 0 for invalid, 4 for IPv4, and 6 for IPv6
 * 
 * @param {string} input
 * @return {number} 0, 4, or 6
 */
function isIP(input) {
  if (typeof input !== 'string') {
    return 0;
  }
  
  if (IPv4_REGEX.test(input)) {
    return 4;
  }
  
  if (IPv6_REGEX.test(input)) {
    return 6;
  }
  
  return 0;
}

/**
 * Returns true if input is a version 4 IP address
 * 
 * @param {string} input
 * @return {boolean}
 */
function isIPv4(input) {
  return isIP(input) === 4;
}

/**
 * Returns true if input is a version 6 IP address
 * 
 * @param {string} input
 * @return {boolean}
 */
function isIPv6(input) {
  return isIP(input) === 6;
}

module.exports = {
  isIP,
  isIPv4,
  isIPv6
};
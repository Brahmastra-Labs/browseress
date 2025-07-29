/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 * 
 * Browser-compatible version of view.js
 * Modified to work without fs.statSync and dynamic require()
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */

var debug = require('debug')('express:view');
var path = require('node:path');

/**
 * Module variables.
 * @private
 */

var dirname = path.dirname;
var basename = path.basename;
var extname = path.extname;
var join = path.join;
var resolve = path.resolve;

/**
 * Module exports.
 * @public
 */

module.exports = View;

/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name
 *   - `engines` template engine require() cache
 *   - `root` root path for view lookup
 *
 * @param {string} name
 * @param {object} options
 * @public
 */

function View(name, options) {
  var opts = options || {};

  this.defaultEngine = opts.defaultEngine;
  this.ext = extname(name);
  this.name = name;
  this.root = opts.root;

  if (!this.ext && !this.defaultEngine) {
    throw new Error('No default engine was specified and no extension was provided.');
  }

  var fileName = name;

  if (!this.ext) {
    // get extension from default engine name
    this.ext = this.defaultEngine[0] !== '.'
      ? '.' + this.defaultEngine
      : this.defaultEngine;

    fileName += this.ext;
  }

  // In browser environment, engines must be explicitly registered
  if (!opts.engines[this.ext]) {
    throw new Error('No engine was registered for the "' + this.ext + '" extension. Register the engine with app.engine("' + this.ext + '", engineFunction).');
  }

  // store loaded engine
  this.engine = opts.engines[this.ext];

  // Browser version: simplified path resolution
  this.path = this.lookup(fileName);
}

/**
 * Lookup view by the given `name`
 * 
 * Browser version: Simplified to just resolve the path without file system checks
 *
 * @param {string} name
 * @private
 */

View.prototype.lookup = function lookup(name) {
  var path;
  var roots = [].concat(this.root);

  debug('lookup "%s"', name);

  // For browser environment, we simply resolve the path
  // The actual "finding" of the template is delegated to the engine
  var root = roots[0] || '';
  path = resolve(root, name);

  return path;
};

/**
 * Render with the given options.
 *
 * @param {object} options
 * @param {function} callback
 * @private
 */

View.prototype.render = function render(options, callback) {
  var sync = true;

  debug('render "%s"', this.path);

  // render, normalizing sync callbacks
  this.engine(this.path, options, function onRender() {
    if (!sync) {
      return callback.apply(this, arguments);
    }

    // copy arguments
    var args = new Array(arguments.length);
    var cntx = this;

    for (var i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }

    // force callback to be async
    var nextTick = typeof process !== 'undefined' && process.nextTick
      ? process.nextTick
      : function(fn) { setTimeout(fn, 0); };
    
    return nextTick(function renderTick() {
      return callback.apply(cntx, args);
    });
  });

  sync = false;
};

/**
 * Resolve the file within the given directory.
 * 
 * Browser version: Simplified to just join paths without file system checks
 *
 * @param {string} dir
 * @param {string} file
 * @private
 */

View.prototype.resolve = function resolve(dir, file) {
  // In browser, we don't check file existence
  // Just return the joined path
  return join(dir, file);
};
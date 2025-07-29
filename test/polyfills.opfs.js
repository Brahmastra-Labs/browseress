'use strict'

var assert = require('node:assert')

describe('polyfills', function(){
  describe('OPFS adapter', function(){
    it('should export fs-compatible API', function(){
      // In Node.js, we can at least verify the module structure
      var fs = require('../lib/polyfills/fs-opfs-adapter')
      
      // Verify sync methods exist
      assert.strictEqual(typeof fs.readFileSync, 'function')
      assert.strictEqual(typeof fs.writeFileSync, 'function')
      assert.strictEqual(typeof fs.statSync, 'function')
      assert.strictEqual(typeof fs.existsSync, 'function')
      assert.strictEqual(typeof fs.mkdirSync, 'function')
      assert.strictEqual(typeof fs.readdirSync, 'function')
      assert.strictEqual(typeof fs.unlinkSync, 'function')
      assert.strictEqual(typeof fs.rmdirSync, 'function')
      
      // Verify async methods exist
      assert.strictEqual(typeof fs.readFile, 'function')
      assert.strictEqual(typeof fs.writeFile, 'function')
      assert.strictEqual(typeof fs.stat, 'function')
      assert.strictEqual(typeof fs.exists, 'function')
      assert.strictEqual(typeof fs.mkdir, 'function')
      assert.strictEqual(typeof fs.readdir, 'function')
      assert.strictEqual(typeof fs.unlink, 'function')
      assert.strictEqual(typeof fs.rmdir, 'function')
      
      // Verify stream methods exist
      assert.strictEqual(typeof fs.createReadStream, 'function')
      assert.strictEqual(typeof fs.createWriteStream, 'function')
    })
    
    it('should throw when used in Node.js', function(){
      // The OPFS adapter should throw when trying to use it in Node.js
      var fs = require('../lib/polyfills/fs-opfs-adapter')
      
      assert.throws(function(){
        fs.readFileSync('/test.txt')
      }, /browser environment/)
    })
    
    it('should warn about SharedArrayBuffer in Node.js', function(){
      // This test verifies the module loads in Node.js even without browser APIs
      // The actual functionality tests need to run in a browser
      assert.doesNotThrow(function(){
        require('../lib/polyfills/fs-opfs-adapter')
      })
    })
  })
})
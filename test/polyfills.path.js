'use strict'

var assert = require('node:assert')
var path = require('../lib/polyfills/path')

describe('polyfills', function(){
  describe('path', function(){
    describe('.join()', function(){
      it('should join path segments', function(){
        assert.strictEqual(path.join('/foo', 'bar', 'baz'), '/foo/bar/baz')
        assert.strictEqual(path.join('foo', 'bar', 'baz'), 'foo/bar/baz')
      })

      it('should normalize paths', function(){
        assert.strictEqual(path.join('/foo', '..', 'bar'), '/bar')
        assert.strictEqual(path.join('foo', '.', 'bar'), 'foo/bar')
      })

      it('should handle empty arguments', function(){
        assert.strictEqual(path.join(''), '.')
        assert.strictEqual(path.join('', ''), '.')
      })

      it('should preserve spaces', function(){
        assert.strictEqual(path.join(' ', 'bar'), ' /bar')
      })
    })

    describe('.resolve()', function(){
      it('should resolve to absolute paths', function(){
        assert.strictEqual(path.resolve('/foo/bar', './baz'), '/foo/bar/baz')
        assert.strictEqual(path.resolve('/foo/bar', '../baz'), '/foo/baz')
      })

      it('should handle relative paths', function(){
        assert.strictEqual(path.resolve('foo', 'bar'), '/foo/bar')
      })

      it('should handle absolute paths in arguments', function(){
        assert.strictEqual(path.resolve('/foo', '/bar'), '/bar')
      })

      it('should handle empty string', function(){
        assert.strictEqual(path.resolve(''), '/')
      })
    })

    describe('.dirname()', function(){
      it('should return directory name', function(){
        assert.strictEqual(path.dirname('/foo/bar/baz'), '/foo/bar')
        assert.strictEqual(path.dirname('/foo/bar'), '/foo')
        assert.strictEqual(path.dirname('/foo'), '/')
        assert.strictEqual(path.dirname('/'), '/')
      })

      it('should handle relative paths', function(){
        assert.strictEqual(path.dirname('foo/bar'), 'foo')
        assert.strictEqual(path.dirname('foo'), '.')
      })

      it('should handle empty string', function(){
        assert.strictEqual(path.dirname(''), '.')
      })
    })

    describe('.basename()', function(){
      it('should return last portion of path', function(){
        assert.strictEqual(path.basename('/foo/bar/baz.html'), 'baz.html')
        assert.strictEqual(path.basename('/foo/bar'), 'bar')
        assert.strictEqual(path.basename('bar.html'), 'bar.html')
      })

      it('should handle extension parameter', function(){
        assert.strictEqual(path.basename('/foo/bar/baz.html', '.html'), 'baz')
        assert.strictEqual(path.basename('baz.html', '.html'), 'baz')
      })

      it('should handle trailing slashes', function(){
        assert.strictEqual(path.basename('/foo/bar/'), 'bar')
      })

      it('should handle empty string', function(){
        assert.strictEqual(path.basename(''), '')
      })
    })

    describe('.extname()', function(){
      it('should return file extension', function(){
        assert.strictEqual(path.extname('index.html'), '.html')
        assert.strictEqual(path.extname('index.coffee.js'), '.js')
        assert.strictEqual(path.extname('/path/to/file.ext'), '.ext')
      })

      it('should handle edge cases', function(){
        assert.strictEqual(path.extname('index.'), '.')
        assert.strictEqual(path.extname('index'), '')
        assert.strictEqual(path.extname('.index'), '')
        assert.strictEqual(path.extname(''), '')
      })
    })

    describe('.parse()', function(){
      it('should parse absolute paths', function(){
        var parsed = path.parse('/home/user/dir/file.txt')
        assert.strictEqual(parsed.root, '/')
        assert.strictEqual(parsed.dir, '/home/user/dir')
        assert.strictEqual(parsed.base, 'file.txt')
        assert.strictEqual(parsed.ext, '.txt')
        assert.strictEqual(parsed.name, 'file')
      })

      it('should parse relative paths', function(){
        var parsed = path.parse('dir/file.txt')
        assert.strictEqual(parsed.root, '')
        assert.strictEqual(parsed.dir, 'dir')
        assert.strictEqual(parsed.base, 'file.txt')
        assert.strictEqual(parsed.ext, '.txt')
        assert.strictEqual(parsed.name, 'file')
      })
    })

    describe('.format()', function(){
      it('should format path from object', function(){
        assert.strictEqual(path.format({
          root: '/',
          dir: '/home/user/dir',
          base: 'file.txt'
        }), '/home/user/dir/file.txt')
      })

      it('should handle name and ext', function(){
        assert.strictEqual(path.format({
          dir: 'home/user/dir',
          name: 'file',
          ext: '.txt'
        }), 'home/user/dir/file.txt')
      })
    })

    describe('.isAbsolute()', function(){
      it('should detect absolute paths', function(){
        assert.strictEqual(path.isAbsolute('/foo/bar'), true)
        assert.strictEqual(path.isAbsolute('/'), true)
      })

      it('should detect relative paths', function(){
        assert.strictEqual(path.isAbsolute('foo/bar'), false)
        assert.strictEqual(path.isAbsolute('.'), false)
        assert.strictEqual(path.isAbsolute(''), false)
      })
    })

    describe('.normalize()', function(){
      it('should normalize paths', function(){
        assert.strictEqual(path.normalize('/foo/bar//baz/qux/..'), '/foo/bar/baz')
        assert.strictEqual(path.normalize('foo/bar//baz/./qux'), 'foo/bar/baz/qux')
      })

      it('should handle empty string', function(){
        assert.strictEqual(path.normalize(''), '.')
      })

      it('should preserve root', function(){
        assert.strictEqual(path.normalize('/'), '/')
      })
    })

    describe('.relative()', function(){
      it('should find relative paths', function(){
        assert.strictEqual(path.relative('/foo/bar', '/foo/baz'), '../baz')
        assert.strictEqual(path.relative('/foo/bar', '/foo/bar/baz'), 'baz')
        assert.strictEqual(path.relative('/foo/bar/baz', '/foo/bar'), '..')
      })

      it('should handle different roots', function(){
        assert.strictEqual(path.relative('/foo', '/bar'), '../bar')
      })

      it('should handle same paths', function(){
        assert.strictEqual(path.relative('/foo', '/foo'), '')
      })
    })
  })
})
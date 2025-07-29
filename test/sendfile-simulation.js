'use strict'

var assert = require('assert')

describe('Express sendFile Simulation', function() {
  it('should simulate how send module uses fs.createReadStream', function(done) {
    // Mock fs with our OPFS adapter pattern
    const mockFs = {
      readFileSync: function(path) {
        if (path === '/static/index.html') {
          return Buffer.from('<h1>Hello World</h1>')
        }
        const err = new Error('ENOENT: no such file')
        err.code = 'ENOENT'
        throw err
      },
      statSync: function(path) {
        if (path === '/static/index.html') {
          return {
            isFile: () => true,
            isDirectory: () => false,
            size: 20,
            mtime: new Date()
          }
        }
        const err = new Error('ENOENT: no such file')
        err.code = 'ENOENT'
        throw err
      },
      createReadStream: function(path, options) {
        // Use a simple event emitter for Node.js testing
        const EventEmitter = require('events').EventEmitter
        const stream = new EventEmitter()
        
        // Add pipe method like our OPFS adapter
        stream.pipe = function(destination) {
          this.on('data', (data) => {
            if (destination.write) {
              destination.write(data)
            }
          })
          
          this.on('end', () => {
            if (destination.end) {
              destination.end()
            }
          })
          
          this.on('error', (err) => {
            if (destination.destroy) {
              destination.destroy(err)
            }
          })
          
          return destination
        }
        
        // Simulate async file read
        setTimeout(() => {
          try {
            const data = this.readFileSync(path)
            stream.emit('open')
            stream.emit('data', data)
            stream.emit('end')
          } catch (err) {
            stream.emit('error', err)
          }
        }, 0)
        
        return stream
      }
    }
    
    // Mock response (like Express res object)
    const chunks = []
    const mockRes = {
      statusCode: 200,
      headers: {},
      write: function(chunk) {
        chunks.push(chunk)
        return true
      },
      end: function(chunk) {
        if (chunk) chunks.push(chunk)
        
        // Verify the file was piped correctly
        const result = Buffer.concat(chunks).toString()
        assert.equal(result, '<h1>Hello World</h1>')
        done()
      },
      destroy: function(err) {
        done(new Error('Stream error: ' + err))
      },
      setHeader: function(name, value) {
        this.headers[name] = value
      }
    }
    
    // Simulate send module behavior
    const stream = mockFs.createReadStream('/static/index.html')
    
    // This is what Express/send does
    stream.pipe(mockRes)
  })
  
  it('should handle non-existent files', function(done) {
    const mockFs = {
      readFileSync: function(path) {
        const err = new Error('ENOENT: no such file')
        err.code = 'ENOENT'
        throw err
      },
      createReadStream: function(path) {
        // Use a simple event emitter for Node.js testing
        const EventEmitter = require('events').EventEmitter
        const stream = new EventEmitter()
        
        stream.pipe = function(destination) {
          this.on('error', (err) => {
            if (destination.destroy) {
              destination.destroy(err)
            }
          })
          return destination
        }
        
        setTimeout(() => {
          const err = new Error('ENOENT: no such file')
          err.code = 'ENOENT'
          stream.emit('error', err)
        }, 0)
        
        return stream
      }
    }
    
    const mockRes = {
      destroy: function(err) {
        assert.equal(err.code, 'ENOENT')
        done()
      }
    }
    
    const stream = mockFs.createReadStream('/non-existent.html')
    stream.pipe(mockRes)
  })
})
'use strict'

var assert = require('node:assert')
var http = require('node:http')
var WebSocket = require('ws')
var spawn = require('node:child_process').spawn

describe('relay server', function(){
  var relayProcess
  
  before(function(done){
    this.timeout(5000)
    
    // Start relay server as child process
    relayProcess = spawn('node', ['relay-server.js'], {
      env: Object.assign({}, process.env, {
        HTTP_PORT: '8888',
        WS_PORT: '3333'
      })
    })
    
    var started = false
    
    relayProcess.stdout.on('data', function(data){
      if (!started && data.toString().includes('WebSocket Server listening')) {
        started = true
        setTimeout(done, 500) // Give it time to fully start
      }
    })
    
    relayProcess.stderr.on('data', function(data){
      console.error('Relay stderr:', data.toString())
    })
  })
  
  after(function(done){
    if (relayProcess) {
      relayProcess.on('exit', function(){
        done()
      })
      relayProcess.kill('SIGINT')
    } else {
      done()
    }
  })
  
  it('should reject HTTP requests when no browser connected', function(done){
    http.get('http://localhost:8888/', function(res){
      assert.strictEqual(res.statusCode, 503)
      
      var body = ''
      res.on('data', function(chunk){ body += chunk })
      res.on('end', function(){
        assert.ok(body.includes('Browser Express app not connected'))
        done()
      })
    })
  })
  
  it('should accept WebSocket connections', function(done){
    var ws = new WebSocket('ws://localhost:3333')
    
    ws.on('open', function(){
      ws.on('message', function(data){
        var message = JSON.parse(data.toString())
        assert.strictEqual(message.type, 'welcome')
        assert.strictEqual(message.httpPort, '8888')
        ws.close()
        done()
      })
    })
    
    ws.on('error', done)
  })
  
  it('should relay HTTP requests to browser', function(done){
    var ws = new WebSocket('ws://localhost:3333')
    
    ws.on('open', function(){
      // Wait for welcome message
      ws.once('message', function(){
        // Now listen for HTTP request
        ws.on('message', function(data){
          var message = JSON.parse(data.toString())
          
          if (message.type === 'http-request') {
            assert.strictEqual(message.method, 'GET')
            assert.strictEqual(message.url, '/test')
            assert.ok(message.id > 0)
            
            // Send response back
            ws.send(JSON.stringify({
              id: message.id,
              type: 'http-response',
              statusCode: 200,
              statusMessage: 'OK',
              headers: { 'content-type': 'text/plain' },
              body: 'Hello from browser!'
            }))
          }
        })
        
        // Make HTTP request
        http.get('http://localhost:8888/test', function(res){
          assert.strictEqual(res.statusCode, 200)
          
          var body = ''
          res.on('data', function(chunk){ body += chunk })
          res.on('end', function(){
            assert.strictEqual(body, 'Hello from browser!')
            ws.close()
            done()
          })
        })
      })
    })
    
    ws.on('error', done)
  })
})
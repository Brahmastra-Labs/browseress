const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  // Set CORS headers for SharedArrayBuffer
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './examples/browseress-demo/index.html';
  }
  
  // Handle directory requests
  if (filePath.endsWith('/')) {
    filePath += 'index.html';
  }
  
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
  }
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 9000;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
  console.log(`\nTo test Browseress:`);
  console.log(`1. Make sure relay server is running: node relay-server.js`);
  console.log(`2. Choose a demo:`);
  console.log(`   - Basic demo: http://localhost:${PORT}/examples/browseress-demo/`);
  console.log(`   - Todo API: http://localhost:${PORT}/examples/todo-app/`);
  console.log(`3. Click "Start Express App" or "Start Todo Server"`);
  console.log(`4. Visit http://localhost:8080 in a new tab`);
});
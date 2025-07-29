#!/usr/bin/env node

/**
 * Simple HTTP server with COOP/COEP headers for SharedArrayBuffer support
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = path.join(__dirname, '../..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Add COOP/COEP headers for SharedArrayBuffer support
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  let filePath = path.join(ROOT, req.url);
  
  // Default to index.html for directories
  if (filePath.endsWith('/')) {
    filePath += 'index.html';
  }

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('Not found');
      } else if (err.code === 'EISDIR') {
        // Try to list directory
        res.setHeader('Content-Type', 'text/html');
        fs.readdir(filePath, (err, files) => {
          if (err) {
            res.statusCode = 500;
            res.end('Error reading directory');
            return;
          }
          
          const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Index of ${req.url}</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    a { text-decoration: none; color: blue; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Index of ${req.url}</h1>
  <ul>
    ${req.url !== '/' ? '<li><a href="../">../</a></li>' : ''}
    ${files.map(file => `<li><a href="${file}">${file}</a></li>`).join('\n    ')}
  </ul>
</body>
</html>`;
          res.end(html);
        });
      } else {
        res.statusCode = 500;
        res.end('Server error');
      }
    } else {
      // Set content type
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      res.statusCode = 200;
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('');
  console.log('This server includes headers for SharedArrayBuffer support:');
  console.log('  Cross-Origin-Opener-Policy: same-origin');
  console.log('  Cross-Origin-Embedder-Policy: require-corp');
  console.log('');
  console.log('Open http://localhost:8080/test/browser/polyfills.opfs.html to run tests');
});
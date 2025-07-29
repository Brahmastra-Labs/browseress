#!/usr/bin/env node

/*!
 * Browseress Local Relay Server
 * Bridges HTTP requests to browser-based Express app via WebSocket
 */

'use strict';

const http = require('http');
const WebSocket = require('ws');
const { URL } = require('url');

// Configuration
const HTTP_PORT = process.env.HTTP_PORT || 8080;
const WS_PORT = process.env.WS_PORT || 3001;

// Request tracking
let requestId = 0;
const pendingRequests = new Map();

// WebSocket client tracking
let browserClient = null;

// Create HTTP server to receive public requests
const httpServer = http.createServer((req, res) => {
  // Generate unique ID for this request
  const id = ++requestId;
  
  console.log(`[HTTP] ${req.method} ${req.url} (ID: ${id})`);
  
  // Check if browser client is connected
  if (!browserClient || browserClient.readyState !== WebSocket.OPEN) {
    console.error('[HTTP] No browser client connected');
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Service Unavailable: Browser Express app not connected\n');
    return;
  }
  
  // Store response object for later
  pendingRequests.set(id, {
    res,
    timestamp: Date.now()
  });
  
  // Collect request body
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    
    // Serialize request for browser
    const message = {
      id,
      type: 'http-request',
      method: req.method,
      url: req.url,
      headers: req.headers,
      httpVersion: req.httpVersion,
      remoteAddress: req.socket.remoteAddress,
      body
    };
    
    // Send to browser client
    try {
      console.log('[HTTP->WS] Sending request to browser:', message.method, message.url);
      browserClient.send(JSON.stringify(message));
    } catch (err) {
      console.error('[HTTP] Failed to send to browser:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error\n');
      pendingRequests.delete(id);
    }
  });
  
  // Handle client disconnect
  res.on('close', () => {
    if (pendingRequests.has(id)) {
      console.log(`[HTTP] Client disconnected (ID: ${id})`);
      pendingRequests.delete(id);
    }
  });
});

// Create WebSocket server for browser connection
const wsServer = new WebSocket.Server({ port: WS_PORT });

wsServer.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Browser client connected from ${clientIp}`);
  
  // Only allow one browser client
  if (browserClient && browserClient.readyState === WebSocket.OPEN) {
    console.log('[WS] Closing existing browser connection');
    browserClient.close();
  }
  
  browserClient = ws;
  
  // Handle messages from browser
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[WS] Received message:', message.type, message.id ? `(ID: ${message.id})` : '');
      
      if (message.type === 'http-response' && message.id) {
        handleHttpResponse(message);
      } else if (message.type === 'ping') {
        console.log('[WS] Received ping');
      } else {
        console.log('[WS] Unknown message type:', message.type, 'Full message:', JSON.stringify(message));
      }
    } catch (err) {
      console.error('[WS] Failed to parse message:', err.message, 'Data:', data.toString());
    }
  });
  
  ws.on('close', () => {
    console.log('[WS] Browser client disconnected');
    if (browserClient === ws) {
      browserClient = null;
    }
  });
  
  ws.on('error', (err) => {
    console.error('[WS] Browser client error:', err.message);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Browseress Relay Server',
    httpPort: HTTP_PORT
  }));
});

// Handle HTTP response from browser
function handleHttpResponse(message) {
  const pending = pendingRequests.get(message.id);
  
  if (!pending) {
    console.error(`[WS] No pending request for ID: ${message.id}`);
    return;
  }
  
  const { res } = pending;
  pendingRequests.delete(message.id);
  
  console.log(`[WS] Received response for ID: ${message.id} (${message.statusCode})`);
  
  // Write response
  try {
    // Set status and headers
    res.writeHead(
      message.statusCode || 200,
      message.statusMessage || 'OK',
      message.headers || {}
    );
    
    // Write body and end response
    if (message.body) {
      res.end(message.body);
    } else {
      res.end();
    }
  } catch (err) {
    console.error(`[WS] Failed to send response for ID ${message.id}:`, err.message);
  }
}

// Clean up old pending requests periodically
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 60 seconds
  
  for (const [id, pending] of pendingRequests) {
    if (now - pending.timestamp > timeout) {
      console.log(`[CLEANUP] Removing timed out request ID: ${id}`);
      pending.res.writeHead(504, { 'Content-Type': 'text/plain' });
      pending.res.end('Gateway Timeout\n');
      pendingRequests.delete(id);
    }
  }
}, 10000); // Check every 10 seconds

// Start servers
httpServer.listen(HTTP_PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       Browseress Local Relay Server          ║
╚══════════════════════════════════════════════╝

HTTP Server listening on: http://localhost:${HTTP_PORT}
WebSocket Server listening on: ws://localhost:${WS_PORT}

Waiting for browser Express app to connect...
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  
  wsServer.close(() => {
    console.log('WebSocket server closed');
  });
  
  // Close browser connection
  if (browserClient) {
    browserClient.close();
  }
  
  process.exit(0);
});
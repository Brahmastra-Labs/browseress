# Browseress - Express.js in the Browser

Browseress enables Express.js applications to run entirely in the browser using WebSockets for HTTP transport and OPFS (Origin Private File System) for file operations.

## ✅ Current Status: WORKING!

Browseress is fully functional with all core features working:
- Express.js runs unmodified in the browser
- Full routing and middleware support
- JSON APIs and RESTful endpoints
- Real HTTP requests handled via WebSocket relay

## What is Browseress?

Browseress consists of:
- **Browser polyfills** for Node.js modules (fs, path, http, net, stream, util, process, etc.)
- **WebSocket transport** that replaces HTTP server functionality
- **Relay server** that bridges HTTP requests to the browser
- **OPFS adapter** providing synchronous file operations using SharedArrayBuffer

## Quick Start

### 1. Start the Relay Server
```bash
node relay-server.js
```

You should see:
```
╔══════════════════════════════════════════════╗
║       Browseress Local Relay Server          ║
╚══════════════════════════════════════════════╝

HTTP Server listening on: http://localhost:8080
WebSocket Server listening on: ws://localhost:3001
```

### 2. Build the Browser Bundle
```bash
npm install
npm run build
```

This creates:
- `dist/browseress.bundle.js` - Main bundle with Express + polyfills
- `dist/ws-transport.bundle.js` - WebSocket transport only
- `dist/fs-opfs-adapter.bundle.js` - OPFS adapter only

### 3. Serve Your App
```bash
node test-server.js
```

### 4. Try the Examples

#### Basic Demo
Open: http://localhost:9000/examples/browseress-demo/
- Click "Start Express App"
- Visit http://localhost:8080 in a new tab

#### Todo API Demo
Open: http://localhost:9000/examples/todo-app/
- Click "Start Todo Server"
- Use curl to interact with the API:

```bash
# Get all todos
curl http://localhost:8080/todos

# Create a new todo
curl -X POST http://localhost:8080/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test from curl","completed":false}'

# Update a todo
curl -X PUT http://localhost:8080/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated todo","completed":true}'

# Delete a todo
curl -X DELETE http://localhost:8080/todos/1
```

## How It Works

```
[Browser Tab 1]                [Relay Server]              [Browser Tab 2]
Express.js App  <--WebSocket--> Port 3001/8080 <--HTTP--> Your Request
```

The Express app in Browser Tab 1 handles HTTP requests from Browser Tab 2!

## Working Example

Here's a complete Express app running in the browser:

```javascript
// In your HTML file
const express = window.browseress.express;
const WebSocketTransport = window.browseress.WebSocketTransport;

const app = express();

// Middleware for JSON parsing
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'application/json') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      req.body = JSON.parse(body || '{}');
      next();
    });
  } else {
    next();
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from browser Express!' });
});

app.post('/api/data', (req, res) => {
  res.status(201).json({ received: req.body });
});

// Start server
const transport = new WebSocketTransport('ws://localhost:3001');
app.listen(transport, () => {
  console.log('Express running in browser!');
});
```

## Test Results

### Unit Tests  
```bash
npm test -- --grep "polyfills|transport|app.listen"
```
- ✓ 51 path polyfill tests
- ✓ 13 WebSocket transport tests  
- ✓ 8 OPFS browser tests
- ✓ HTTP/Net/Stream/Util stub tests
- ✓ app.listen() transport tests

### Integration Testing
```bash
# Run the curl test script
./test-curl.sh

# Or test manually
curl http://localhost:8080/todos
curl -X POST http://localhost:8080/todos -H "Content-Type: application/json" -d '{"title":"New todo"}'
```

## API Usage

```javascript
// In the browser
const express = window.browseress.express;
const WebSocketTransport = window.browseress.WebSocketTransport;

const app = express();

app.get('/', (req, res) => {
  res.send('Hello from the browser!');
});

const transport = new WebSocketTransport('ws://localhost:3001');
app.listen(transport, () => {
  console.log('Express running in browser!');
});
```

## Components

### 1. OPFS File System (`lib/polyfills/fs-opfs-adapter.js`)
- Provides fs-compatible API using OPFS
- Synchronous operations via SharedArrayBuffer + Web Worker
- Requires COOP/COEP headers

### 2. WebSocket Transport (`lib/transports/ws-transport.js`)
- Replaces net.Server functionality
- Manages request/response cycle over WebSocket
- Compatible with Express middleware

### 3. Relay Server (`relay-server.js`)
- Bridges HTTP (port 8080) to WebSocket (port 3001)
- Maintains request ID mapping
- Handles streaming responses

### 4. Node.js Polyfills
- `path` - Full implementation
- `http` - Stub with METHODS export
- `net` - isIP functions only
- `querystring` - Basic parse/stringify
- `zlib` - No-op stubs

## Requirements

- Modern browser with SharedArrayBuffer support
- COOP/COEP headers for OPFS operations
- Node.js 18+ for relay server

## Limitations

- No real file system (OPFS is sandboxed)
- No native modules
- No child processes
- Limited crypto functionality
- Compression (zlib) is stubbed

## Next Steps

To package as a desktop app with the relay server built-in, consider:
- Electron with integrated relay
- Tauri with Rust-based relay
- PWA with service worker relay

It's a dumb-pipe production.
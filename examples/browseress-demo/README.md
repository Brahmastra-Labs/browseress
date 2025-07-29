# Browseress Demo

This example demonstrates Express.js running entirely in the browser using Browseress.

## How it Works

1. **Relay Server**: A Node.js server that bridges HTTP requests to the browser
2. **WebSocket Transport**: Connects the browser Express app to the relay server
3. **Browser Express**: Full Express.js functionality running in the browser

## Quick Start

1. Build the project (from project root):
   ```bash
   npm install
   npm run build
   ```

2. Start the relay server:
   ```bash
   node relay-server.js
   # or
   npx browseress-relay
   ```

3. Open the demo in your browser:
   ```bash
   # From the project root
   npx http-server -p 9000
   # Then visit: http://localhost:9000/examples/browseress-demo/
   ```

4. Click "Start Express App" in the browser

5. Visit http://localhost:8080 in a new tab to see your Express app!

## What's Happening

- The Express app runs entirely in your browser tab
- The relay server forwards HTTP requests via WebSocket
- Your browser handles all the routing, middleware, and responses
- Full Express.js API compatibility

## Try These Features

- **Routing**: Multiple routes with parameters
- **Middleware**: Request logging
- **JSON API**: Automatic JSON responses
- **Error Handling**: 404 pages
- **Headers**: Full request/response header support

## Architecture

```
[Browser Tab 1]                [Relay Server]              [Browser Tab 2]
Express.js App  <--WebSocket--> Port 3001/8080 <--HTTP--> Your Request
```

The Express app in Browser Tab 1 handles requests from Browser Tab 2!
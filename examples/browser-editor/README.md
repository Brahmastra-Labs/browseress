# Browser Express Editor

An interactive in-browser code editor for writing and testing Express.js APIs directly in the browser using Browseress.

## Features

- **Live Code Editor**: Write Express.js code directly in the browser
- **Instant Execution**: Run your Express server without any build process
- **API Tester**: Built-in REST client to test your endpoints
- **Console Output**: See logs and errors in real-time
- **Hot Reload**: Stop and restart your server with code changes

## Getting Started

1. **Start the Relay Server**:
   ```bash
   # From the browseress root directory
   node relay-server.js
   ```

2. **Serve the Example**:
   ```bash
   # From the browseress root directory
   npm run serve
   # Or use any static file server
   npx http-server -p 8080
   ```

3. **Open in Browser**:
   Navigate to `http://localhost:8080/examples/browser-editor/`

4. **Start Coding**:
   - Edit the Express code in the editor
   - Click "Run Server" to start your API
   - Use the API Tester to send requests
   - See responses and console output in real-time

## Example Code Structure

The editor comes pre-loaded with a sample Express API that includes:

```javascript
// Basic Express setup
const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Browser Express!' });
});

// Start server using WebSocket transport
app.listen(transport);
```

## API Tester

The built-in API tester allows you to:
- Select HTTP method (GET, POST, PUT, DELETE)
- Enter endpoint URLs (e.g., `/`, `/api/users`, `/api/users/1`)
- Send requests to your running Express server via the relay server
- View formatted JSON responses

**Note**: The API tester sends requests to `http://localhost:8080`, which the relay server forwards to your browser Express app via WebSocket.

## How It Works

1. **WebSocket Transport**: Instead of traditional HTTP, the browser app communicates with a local relay server via WebSockets
2. **Browser Polyfills**: Node.js APIs are polyfilled for browser compatibility
3. **Dynamic Execution**: Your Express code is executed in a sandboxed function context
4. **Real-time Updates**: Console output and API responses are captured and displayed

## Tips

- The server runs entirely in your browser - no server-side compilation needed
- All standard Express features work: middleware, routing, error handling
- You can use `console.log()` for debugging - output appears in the console panel
- The transport variable is automatically available in your code context

## Limitations

- File system operations use OPFS (Origin Private File System) - not the real file system
- Some Node.js modules may not be available or fully compatible
- Performance may differ from a traditional Node.js environment

## Use Cases

- **Learning Express.js**: Perfect for tutorials and workshops
- **API Prototyping**: Quickly test API designs
- **Live Demos**: Show Express concepts without server setup
- **Browser-Based Development**: Code anywhere without local Node.js installation
# Browser Express (Browseress) - Development Progress

READ ENTIRE FILES WHEN BROWSING CODE. THE DEFAULT BEHAVIOUR SHOULD BE TO READ FILES.

## Project Overview
Creating a browser-compatible version of Express.js that runs entirely in the browser using OPFS (Origin Private File System) and communicates with a local relay server via WebSockets.

## Current Status Summary

### ✅ Phase 1: Core Polyfill & Adapter Layer (COMPLETED)

#### 1. OPFS File System Adapter
- **Created**: `lib/polyfills/fs-opfs-adapter.js`
- **Created**: `lib/polyfills/fs-opfs-worker.js`
- **Features**:
  - Synchronous file operations using SharedArrayBuffer and Web Worker
  - Full fs API compatibility (readFileSync, writeFileSync, statSync, etc.)
  - Async methods that delegate to sync implementations
  - Basic stream support (createReadStream, createWriteStream)
  - Proper error handling with Node.js-compatible error codes
  - Node.js compatibility (loads without error, throws when used)
- **Status**: Complete with tests

#### 2. Node.js Polyfills
- **Created**: `lib/polyfills/path.js`
  - Full path module implementation (join, resolve, dirname, basename, etc.)
  - Express-style code formatting
  - Complete test coverage (29 passing tests)
  
- **Created**: `lib/polyfills/http-stub.js`
  - METHODS array export
  - IncomingMessage and ServerResponse base classes
  - createServer stub that throws in browser context
  - Full header management (setHeader, getHeader, removeHeader)
  
- **Created**: `lib/polyfills/net-stub.js`
  - isIP, isIPv4, isIPv6 implementations
  - IPv4 and IPv6 regex validation
  - Handles non-string inputs correctly

#### 3. Test Suite
Following Express testing conventions:

**Node.js Tests (All Passing)**:
- `test/polyfills.path.js` - 29 tests for path module
- `test/polyfills.http-net.js` - 19 tests for HTTP/Net stubs
- `test/polyfills.opfs.js` - 3 tests for OPFS adapter API

**Browser Tests (Working)**:
- `test/browser/polyfills.opfs.html` - Tests browser environment and OPFS operations
- `test/browser/README.md` - Clear instructions for running browser tests

**Test Results**:
- Node.js tests: 51 passing
- Browser tests: 7 passing (without SharedArrayBuffer), 8 with proper headers

### 🔄 Phase 2: WebSocket Transport Driver (IN PROGRESS)
**Next Steps**:
1. Create `lib/transports/ws-transport.js`
2. Implement WebSocketTransport class
3. Modify `lib/express.js` to support transport in app.listen()
4. Create mock request/response objects

### ⏳ Phase 3: Local Relay Server (PENDING)
**To Do**:
1. Create `local-relay/server.js`
2. Implement dual-protocol server (HTTP + WebSocket)
3. Request ID mapping and routing logic
4. Error handling and timeout management

### ⏳ Phase 4: Packaging (PENDING)
**To Do**:
1. Set up webpack configuration for browser bundling
2. Configure worker-loader for OPFS worker
3. Create npm package structure
4. Package relay server as standalone executable

## Technical Decisions

### File Organization
- Polyfills in `lib/polyfills/`
- Transport drivers in `lib/transports/`
- Tests follow Express naming: `test/polyfills.*.js`
- Browser tests in `test/browser/`

### Testing Strategy
- Node.js tests for API compatibility
- Browser tests for OPFS functionality
- Require SharedArrayBuffer (COOP/COEP headers)

### Key Challenges Solved
1. **Synchronous FS in Browser**: Used SharedArrayBuffer + Atomics.wait for blocking operations
2. **Worker Communication**: Inline worker code for easier bundling
3. **Node/Browser Compatibility**: Polyfills work in Node for testing, throw appropriate errors

## Current Working Directory
`/Users/tristen/expressrelay/browseress`

## Next Immediate Tasks
1. Create WebSocket transport driver
2. Implement request/response serialization protocol
3. Modify express.js for transport support
4. Create mock req/res objects that inherit from Express prototypes

## Dependencies
- Express 5.1.0 (base)
- Development: mocha, supertest, eslint
- No additional runtime dependencies (intentional)

## Important Notes
- OPFS requires cross-origin isolation headers
- SharedArrayBuffer needed for synchronous operations
- All original Express files remain unmodified (except express.js will need minimal changes)
- Tests use Express's style and conventions
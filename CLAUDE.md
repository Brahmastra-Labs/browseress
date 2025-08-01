# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Browser Express (Browseress) - A browser-compatible version of Express.js that runs entirely in the browser using OPFS (Origin Private File System) and communicates with a local relay server via WebSockets.

Based on Express 5.1.0, this project maintains compatibility with the Express API while enabling browser-based execution.

## Test-Driven Development Workflow

**IMPORTANT: Follow TDD principles when developing. Always run tests FIRST to identify what needs to be fixed.**

### 1. Running Tests

```bash
# Run E2E tests to see overall status
npm run test:e2e

# Run specific E2E test suite
npx playwright test express-test-harness.spec.js

# Debug E2E tests visually
npm run test:e2e:ui

# Run unit tests for polyfills
npm test

# Run browser tests with proper headers
node test/browser/serve-with-headers.js
# Then open http://localhost:8080/test/browser/polyfills.opfs.html
```

### 2. Using the Test Harness

The test harness at `/examples/express-test-harness/` lets you manually debug individual Express tests in the browser:

**For automated testing**: Just run `npm run test:e2e` (servers start automatically)

**For manual debugging**:
1. **Start the relay server**: `node relay-server.js`
2. **Start the test server**: `node test-server.js`
3. **Open test harness**: http://localhost:9000/examples/express-test-harness/
4. **Click "Start Test Server"** to connect
5. **Select a test** from the dropdown
6. **Click "Load Test"** to transform the test for browser
7. **Click "Run Loaded Test"** to execute

The harness will show:
- Test transformation details (what was changed)
- Test execution results
- Common error patterns

### 3. Test Categories

Tests are categorized as:
- **PASS**: Works without modification
- **ADAPTED**: Modified for browser compatibility (most tests)
- **NOT_APPLICABLE**: Cannot run in browser (uses Node-only features)
- **BUG**: Fails due to implementation differences

## Development Commands

### Build & Development
```bash
npm run build              # Webpack build
npm run build:watch        # Webpack watch mode
npm run lint               # ESLint check
```

### Test Manifest
```bash
npm run test:generate-manifest   # Regenerate test manifest for harness
```

## Architecture Overview

### Core Structure
The project extends Express.js with browser compatibility layers:

1. **Polyfills** (`lib/polyfills/`)
   - `fs-opfs-adapter.js` + `fs-opfs-worker.js`: Synchronous file system using SharedArrayBuffer
   - `path.js`: Complete Node.js path module
   - `http-stub.js`: HTTP module with IncomingMessage/ServerResponse
   - `net-stub.js`: Network utilities (isIP, isIPv4, isIPv6)
   - `events.js`: EventEmitter implementation
   - `stream-stub.js`: Basic stream implementation
   - `util-stub.js`: Utility functions
   - `process-stub.js`: Process global stub
   - `setimmediate.js`: setImmediate polyfill
   - `querystring-stub.js`: Query string parsing
   - `zlib-stub.js`: Compression stubs
   - `view-browser.js`: Browser-compatible view rendering
   - `express-utils-stub.js`: Express utility functions

2. **Transport Layer** (`lib/transports/`)
   - `ws-transport.js`: WebSocket transport for browser-server communication
   - Handles HTTP request/response serialization
   - Mock req/res objects with Express compatibility

3. **Test Harness** (`examples/express-test-harness/`)
   - `test-loader.js`: Loads Express test files
   - `test-transformer.js`: Transforms require() statements
   - `test-executor.js`: Runs tests with proper context
   - `test-utils.js`: Browser implementations of test utilities

4. **Webpack Configuration**
   - Bundles polyfills and Express for browser
   - Maps Node.js modules to browser polyfills
   - Handles worker compilation

## Common Test Failures and Solutions

### 1. Missing Module Errors

**Pattern**: `Unhandled require statements found: crypto, url, etc.`

**Solution Process**:
1. Check if it's in the "easy fix" list below
2. If not, ASK: "Should I find an existing polyfill or create a stub?"
3. Add to `test-transformer.js` require map
4. Add to webpack config if needed

**Easy Fixes** (create stubs for these):
- `crypto`: Basic hash/randomBytes stubs
- `url`: URL parsing (use native URL API)
- `querystring`: Extend existing stub
- `string_decoder`: TextDecoder wrapper

**Medium Complexity** (ask before implementing):
- Stream improvements (beyond basic stub)
- Buffer enhancements
- Process module features

**Complex** (always ask first):
- Full crypto implementation
- Child process simulation
- Cluster module
- Async hooks

### 2. Transform Errors

**Pattern**: `ERROR: Unhandled requires: ./some/path`

**Fix**: Add to `test-transformer.js`:
```javascript
const requireMap = {
  './some/path': 'window.someGlobal',
  // ... existing mappings
};
```

### 3. API Differences

**Pattern**: Tests expect Node.js-specific behavior

**Fix**: 
1. Check if polyfill needs enhancement
2. Update mock request/response in harness
3. Consider if test should be NOT_APPLICABLE

### 4. Timing Issues

**Pattern**: Tests timeout or race conditions

**Fix**:
1. Check WebSocket transport connection
2. Verify async operations complete
3. Add proper event handling

## Polyfill Implementation Guidelines

When adding new polyfills:

1. **Check Existing First**: Many modules have partial implementations
2. **Start Minimal**: Implement only what tests need
3. **Maintain API Compatibility**: Match Node.js signatures
4. **Browser-First**: Use native browser APIs when possible
5. **Test in Harness**: Verify with actual Express tests

Example stub pattern:
```javascript
// lib/polyfills/module-stub.js
module.exports = {
  requiredMethod() {
    // Minimal implementation
  },
  
  optionalMethod() {
    throw new Error('module.optionalMethod not implemented in browser');
  }
};
```

## Test Harness Modifications

To support new modules in tests:

1. **Update test-utils.js**: Add any test-specific utilities
2. **Update test-transformer.js**: Add require mappings
3. **Update webpack.config.js**: Add polyfill paths
4. **Test the transformation**: Load test in harness to verify

## Current Development Status

### ✅ Completed
- Core polyfills (fs, path, http, net, events)
- WebSocket transport layer
- Test harness with transformation
- E2E test infrastructure

### 🔄 In Progress
- Expanding module compatibility
- Improving test pass rates
- Stream implementation enhancements

### ⏳ Todo
- Complete missing module stubs
- Optimize polyfill implementations
- Increase test coverage

## Important Notes

- **SharedArrayBuffer**: Required for sync operations (needs COOP/COEP headers)
- **Always Test First**: Run failing tests before implementing fixes
- **Ask About Polyfills**: Don't assume - ask whether to find or create
- **Incremental Fixes**: Small changes, verify with tests
- **Express Compatibility**: Maintain API compatibility with Express 5.1.0

## Quick Debugging

1. **Test won't load**: Check test-transformer.js for unhandled requires
2. **Test times out**: Check WebSocket connection and async handling  
3. **Module not found**: Add to webpack config and transformer
4. **API mismatch**: Enhance polyfill or mark test as NOT_APPLICABLE

Remember: The goal is to get Express tests passing in the browser through incremental, test-driven improvements.
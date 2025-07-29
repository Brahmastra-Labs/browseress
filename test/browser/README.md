# Browser Tests

This directory contains tests that must run in a browser environment.

## Current Test Status

### Basic Browser Tests (Working)
The `polyfills.opfs.html` file contains basic tests that verify:
- Browser environment APIs are available
- OPFS (Origin Private File System) is accessible
- Basic OPFS operations work (create/read/delete files and directories)

### Full Adapter Tests (Require Build Step)
The complete fs-opfs-adapter tests require webpack bundling because:
- The adapter uses CommonJS modules (`require`, `module.exports`)
- The Web Worker needs to be bundled properly
- Dependencies like Buffer need to be polyfilled

## Running Browser Tests

### Quick Start (Recommended)
We've included a custom server that sets all the required headers:

```bash
node test/browser/serve-with-headers.js
```

Then open http://localhost:8080/test/browser/polyfills.opfs.html

### What are COOP/COEP Headers?
SharedArrayBuffer (required for synchronous file operations) is a powerful feature that can only be used in "cross-origin isolated" contexts for security reasons. This requires two headers:

- `Cross-Origin-Opener-Policy: same-origin` - Isolates the browsing context
- `Cross-Origin-Embedder-Policy: require-corp` - Ensures all resources are explicitly marked as shareable

Without these headers, the browser disables SharedArrayBuffer to prevent security vulnerabilities like Spectre attacks.

### Alternative: Using http-server
If you prefer using http-server, you need version 14.0.0 or later:
```bash
npx http-server@latest -p 8080 \
  -c-1 \
  --cors \
  --headers='{"Cross-Origin-Opener-Policy":"same-origin","Cross-Origin-Embedder-Policy":"require-corp"}'
```

## Test Results
- If you see tests passing: OPFS is working in your browser
- If you see "SharedArrayBuffer not available": You need the COOP/COEP headers
- The last test will always skip (it's a placeholder for the full adapter tests)

## Next Steps
To test the full fs-opfs-adapter:
1. Set up webpack configuration (Phase 4 of the project)
2. Bundle the polyfills for browser use
3. Create comprehensive tests that use the actual adapter
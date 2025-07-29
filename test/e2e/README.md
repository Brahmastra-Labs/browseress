# Browseress E2E Tests with Playwright

These end-to-end tests use Playwright to automatically manage browser apps and test the full integration.

## Setup

1. Install Playwright:
```bash
npm install
npm run playwright:install
```

2. Run tests:
```bash
npm run test:e2e
```

## Benefits

- **Automatic app switching**: Tests can start different apps as needed
- **No manual setup**: Playwright starts browsers and clicks buttons automatically
- **Better isolation**: Each test suite can have its own app instance
- **Visual debugging**: Use `npm run test:e2e:ui` to see tests run
- **Cross-browser testing**: Can test on Chrome, Firefox, Safari

## Test Structure

- `phase1.spec.js` - Tests Phase 1 features (cookies, headers, redirects)
- `todo-api.spec.js` - Tests the Todo API functionality

Each test:
1. Opens the appropriate app in the browser
2. Clicks "Start Server" 
3. Waits for connection
4. Runs API tests against localhost:8080
5. Cleans up after itself

## Running Individual Tests

```bash
# Run only Phase 1 tests
npx playwright test phase1.spec.js

# Run with UI mode for debugging
npm run test:e2e:ui

# Run with debug mode (opens browser inspector)
npm run test:e2e:debug
```

## Configuration

See `playwright.config.js` for:
- Server startup configuration
- Browser settings
- Test timeouts
- Screenshot/video settings
```
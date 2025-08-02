# ToMakePass.md - Browseress Express Test Compatibility Roadmap

## Prime Directive

To achieve the highest possible pass rate for the official Express.js test suite within the Browseress browser environment through systematic analysis and targeted implementation.

## Methodology

This document follows a **Test-Driven Development (TDD)** approach where:
1. Every polyfill and feature is built directly in response to failing tests
2. We prioritize work based on impact (fixing issues that unlock the most tests)
3. We document precise requirements extracted from actual test failures
4. We track progress systematically through test pass rates

## Categories Legend

- **[Missing Polyfill]**: Node.js module that needs browser implementation
- **[Incomplete Polyfill]**: Existing polyfill missing required functionality
- **[Transform Error]**: Test transformation preventing execution
- **[Harness Bug]**: Issue with test execution infrastructure
- **[API Incompatibility]**: Express API behavior differs from Node.js
- **[Not Applicable]**: Tests that fundamentally cannot run in browser

## Dependency Impact Matrix

### Critical Dependencies (Blocks 10+ tests)
1. **crypto** - Required for ETags, cookie signing, hashing
2. **node:async_hooks** - Used by modern Express tests
3. **url** - URL parsing and manipulation
4. **string_decoder** - Text encoding/decoding

### High Impact Dependencies (Blocks 5-10 tests)
1. **Example app requires** - Test files requiring sample applications
2. **__dirname** - File path resolution
3. **Test utilities** - ./support/utils mappings

### Medium Impact Dependencies (Blocks 2-5 tests)
1. **Enhanced stream support** - Piping, events
2. **Buffer improvements** - Methods beyond basic
3. **Process enhancements** - More env vars, methods

## Test Analysis

Below is a detailed analysis of each Express test file, documenting dependencies, current status, and required fixes.

### Test Results Tracking (86 Total Tests)

#### ✅ ANALYZED (43)

1. `express-test-harness-Expre-005e7--Test-Loading-res-format-js-chromium`
### `test/res.format.js`
* **Feature:** `res.format()` content negotiation based on Accept headers
* **Dependencies:**
    * `[Module]`: `after` (npm package for test callbacks)
    * `[Module]`: `node:assert` (assertions)
    * `[Missing]`: `crypto` module (for ETag generation)
* **Current Status:** **Failing** 
    * **Error:** `TypeError: crypto.createHash is not a function`
    * Tests timeout or fail when res.send() tries to generate ETags
* **Path to Green:**
    * `[Missing Polyfill]` Create `crypto-stub.js` with `createHash()` for ETag generation
    * `[Webpack]` Add crypto polyfill mapping

---

2. `express-test-harness-Expre-00975-Loading-app-routes-error-js-chromium`
### `test/app.routes.error.js`
* **Feature:** Error handling in Express routes
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `crypto.createHash is not a function`
    * First test expects error "boom!" in response but fails
    * Second test fails when res.sendStatus(204) tries to generate ETag
* **Path to Green:**
    * `[Missing Polyfill]` Same crypto issue as res.format.js - needs `createHash()`
    * Both tests failing due to crypto dependency in response handling

---

3. `express-test-harness-Expre-01673-ceptance-cookie-sessions-js-chromium`
### `test/acceptance/cookie-sessions.js`
* **Feature:** Cookie-based session management example
* **Dependencies:**
    * `[Module]`: `../../examples/cookie-sessions` (example app)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/cookie-sessions`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Transform Error]` Add mapping for example app requires in test-transformer.js
    * `[Alternative]` Mock the example app inline or create browser-compatible version

---

4. `express-test-harness-Expre-034c0-Test-Loading-app-options-js-chromium`
### `test/app.options.js`
* **Feature:** OPTIONS HTTP method handling and `app.options()` override
* **Dependencies:**
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** Multiple failures - response body duplication and crypto issue
    * Tests expect "GET, HEAD, PUT" but receive "GET, HEAD, PUTGET, HEAD, PUT" 
    * Last test: `crypto.createHash is not a function` 
    * 7 tests, all failing
* **Path to Green:**
    * `[API Incompatibility]` Response body being duplicated in OPTIONS handler
    * `[Missing Polyfill]` Same crypto issue for ETag generation
    * Likely issue with response.send() or write() being called multiple times

---

5. `express-test-harness-Expre-03b5e-namic-Test-Loading-Route-js-chromium`
### `test/Route.js`
* **Feature:** Express Route class - handles routing and method dispatch
* **Dependencies:**
    * `[Module]`: `after` (npm package for test callbacks)
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `express` (main module)
* **Current Status:** **Mostly Passing** 
    * **Error:** `this.timeout is not a function` in stack overflow test
    * 12 of 13 tests passing
    * Only failing test is the large sync stack test
* **Path to Green:**
    * `[Harness Bug]` Mocha's `this.timeout()` not available in browser test context
    * Could mock timeout function or skip this specific test
    * All core Route functionality appears to be working

---

6. `express-test-harness-Expre-06db4-ding-req-acceptsCharsets-js-chromium`
### `test/req.acceptsCharsets.js`
* **Feature:** `req.acceptsCharsets()` - charset content negotiation
* **Dependencies:**
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** All tests timing out
    * Tests hang and never complete
    * 3 tests, all failing with timeout
* **Path to Green:**
    * `[API Incompatibility]` Likely issue with response handling - tests use `res.end()` instead of `res.send()`
    * `[Possible]` res.end() may not properly trigger response completion in browser environment
    * Try changing to res.send() in tests or fix res.end() implementation

---

7. `express-test-harness-Expre-094dd-mic-Test-Loading-app-use-js-chromium`
### `test/app.use.js`
* **Feature:** `app.use()` middleware mounting and sub-app mounting
* **Dependencies:**
    * `[Module]`: `after` (npm package)
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Partially Failing** 
    * **Error:** Mixed failures - crypto issue and response duplication
    * 15 of 27 tests passing
    * 8 tests fail with `crypto.createHash is not a function`
    * 3 tests timeout
    * 1 test gets "blogblog" instead of "blog" (response duplication)
* **Path to Green:**
    * `[Missing Polyfill]` Primary issue is crypto dependency for ETags
    * `[API Incompatibility]` Response body duplication in mounted apps
    * Some timeouts may be related to sub-app mounting issues

---

8. `express-test-harness-Expre-10daf-mic-Test-Loading-res-get-js-chromium`
### `test/res.get.js`
* **Feature:** `res.get()` - get response header value
* **Dependencies:**
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `crypto.createHash is not a function`
    * Single test failing due to crypto dependency
* **Path to Green:**
    * `[Missing Polyfill]` Same crypto issue - ETag generation requires createHash
    * Once crypto is implemented, this test should pass

---

9. `express-test-harness-Expre-12394-mic-Test-Loading-app-all-js-chromium`
### `test/app.all.js`
* **Feature:** `app.all()` - register route handler for all HTTP methods
* **Dependencies:**
    * `[Module]`: `after` (npm package)
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** Two different issues
    * First test: response body duplication - expects "PUT" but gets "PUTPUT"
    * Second test: `request(...).del is not a function` - supertest API issue
* **Path to Green:**
    * `[API Incompatibility]` Response body duplication with res.end()
    * `[Transform Error]` supertest's `.del()` method needs to be mapped to `.delete()`
    * Both issues are fixable without crypto dependency

---

10. `express-test-harness-Expre-17688--Test-Loading-app-router-js-chromium`
### `test/app.router.js`
* **Feature:** Router functionality and HTTP method routing
* **Dependencies:**
    * `[Module]`: `after` (npm package)
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `./support/utils` (test utilities)
* **Current Status:** **Unknown/Mixed** 
    * Test loads successfully with 66 tests found
    * All transformations appear successful
    * Need full error output to determine specific failures
* **Path to Green:**
    * `[Unknown]` Tests may be failing due to crypto issues (common pattern)
    * `[Possible]` Router parameter handling may have issues
    * Need to see actual test execution results

---

11. `express-test-harness-Expre-18149-c-Test-Loading-req-query-js-chromium`
### `test/req.query.js`
* **Feature:** `req.query` - query string parsing functionality
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `express` (main module)
* **Current Status:** **Mostly Failing** 
    * **Error:** `crypto.createHash is not a function`
    * 1 of 9 tests passing (only the error throwing test)
    * 8 tests fail due to crypto dependency
* **Path to Green:**
    * `[Missing Polyfill]` Same crypto issue - ETag generation in responses
    * Once crypto is implemented, all query parsing tests should pass

---

12. `express-test-harness-Expre-188bb-est-Loading-res-download-js-chromium`
### `test/res.download.js`
* **Feature:** `res.download()` - file download functionality
* **Dependencies:**
    * `[Global]`: `__dirname` (file path resolution)
    * File system operations
* **Current Status:** **NOT_APPLICABLE** 
    * Uses `__dirname` which triggers compatibility check
    * 25 tests found but marked as incompatible
* **Path to Green:**
    * `[Transform]` Provide `__dirname` polyfill
    * `[Challenge]` File download tests heavily depend on file system
    * May need significant adaptation for OPFS-based file operations

---

13. `express-test-harness-Expre-1b433-Test-Loading-express-raw-js-chromium`
### `test/express.raw.js`
* **Feature:** `express.raw()` middleware for parsing raw body
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `node:async_hooks` (async context tracking)
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: node:async_hooks`
    * Tests cannot run - async_hooks module not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Missing Polyfill]` Same as express.json.js - needs async-hooks-stub.js
    * `[Transform]` Add node:async_hooks mapping

---

14. `express-test-harness-Expre-1ec6c-est-Loading-res-location-js-chromium`
### `test/res.location.js`
* **Feature:** `res.location()` - set Location response header
* **Dependencies:**
    * `[Module]`: `express` (main module)
    * `[Module]`: `node:url` (URL parsing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: node:url`
    * Tests cannot run - url module not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Missing Polyfill]` Create `url-stub.js` with URL parsing functionality
    * `[Transform]` Add node:url mapping in test-transformer.js

---

15. `express-test-harness-Expre-22c32-est-Loading-req-protocol-js-chromium`
### `test/req.protocol.js`
* **Feature:** `req.protocol` - get request protocol (http/https)
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Unknown** 
    * Test loads successfully with 7 tests found
    * Error context appears truncated - no test results shown
* **Path to Green:**
    * `[Unknown]` Need to see actual test execution results
    * Likely crypto issue based on pattern of other req.* tests

---

16. `express-test-harness-Expre-2344c-oading-req-signedCookies-js-chromium`
### `test/req.signedCookies.js`
* **Feature:** `req.signedCookies` - signed cookie parsing
* **Dependencies:**
    * `[Module]`: `express` (main module)
    * `[Module]`: `cookie-parser` (npm package for cookie parsing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: cookie-parser`
    * Tests cannot run - cookie-parser module not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Transform Error]` Add cookie-parser mapping in test-transformer.js
    * `[Alternative]` Mock cookie-parser functionality for tests

---

17. `express-test-harness-Expre-28ee8-t-Loading-acceptance-mvc-js-chromium`
### `test/acceptance/mvc.js`
* **Feature:** MVC pattern example test
* **Dependencies:**
    * `[Module]`: `supertest` (HTTP testing)
    * `[Module]`: `../../examples/mvc` (example app)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/mvc`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Transform Error]` Same as cookie-sessions - add example app mapping
    * `[Alternative]` Mock the MVC example app inline

---

18. `express-test-harness-Expre-2ab76--Test-Loading-app-locals-js-chromium`
### `test/app.locals.js`
* **Feature:** `app.locals` - application-level variables
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `express` (main module)
* **Current Status:** **Passing** ✅
    * All 2 tests passing successfully
    * No errors
* **Path to Green:**
    * Already green! No fixes needed

---

19. `express-test-harness-Expre-2e7bc--Loading-acceptance-auth-js-chromium`
### `test/acceptance/auth.js`
* **Feature:** Authentication example test
* **Dependencies:**
    * `[Module]`: `../../examples/auth` (example app)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/auth`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Transform Error]` Same pattern - add example app mapping
    * All acceptance tests with example apps have same issue

---

20. `express-test-harness-Expre-36a31-mic-Test-Loading-req-get-js-chromium`
### `test/req.get.js`
* **Feature:** `req.get()` - get request header value
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Failing** 
    * **Error:** Multiple issues - timeouts and type errors
    * 2 tests timeout waiting for response
    * 2 tests fail with `toLowerCase` errors on undefined/non-string
    * 0 of 4 tests passing
* **Path to Green:**
    * `[API Incompatibility]` req.get() implementation may have issues
    * `[Possible]` Header handling not working correctly
    * Type errors suggest header parameter validation issues

---

21. `express-test-harness-Expre-36e50-t-Loading-acceptance-ejs-js-chromium`
### `test/acceptance/ejs.js`
* **Feature:** EJS templating example test
* **Dependencies:**
    * `[Module]`: `supertest` (HTTP testing)
    * `[Module]`: `../../examples/ejs` (example app)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/ejs`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests
    * Need example app mapping solution

---

22. `express-test-harness-Expre-392eb-ding-acceptance-markdown-js-chromium`
### `test/acceptance/markdown.js`
* **Feature:** Markdown rendering example test
* **Dependencies:**
    * `[Module]`: `../../examples/markdown` (example app)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/markdown`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests
    * Need comprehensive example app mapping

---

23. `express-test-harness-Expre-3ee8c-amic-Test-Loading-config-js-chromium`
### `test/config.js`
* **Feature:** Express application configuration - `app.set()`, `app.get()`, `app.enable()`, `app.disable()`
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `express` (main module)
* **Current Status:** **Mostly Passing** 
    * **Error:** 2 of 26 tests failing due to test harness assertion issue
    * Tests: 24 passed, 2 failed
    * Error: `Cannot read properties of undefined (reading 'toBe')`
    * Both failing tests are checking app return values
* **Path to Green:**
    * `[Harness Bug]` Test transformer issue with expect assertion mapping
    * `[Fix]` Need to ensure .toBe() is properly available in test context
    * All core config functionality appears to be working correctly

---

24. `express-test-harness-Expre-4c4f8-ing-req-acceptsEncodings-js-chromium`
### `test/req.acceptsEncodings.js`
* **Feature:** `req.acceptsEncodings()` - encoding content negotiation
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Failing** 
    * **Error:** `crypto.createHash is not a function`
    * 2 tests, both failing due to crypto dependency
* **Path to Green:**
    * `[Missing Polyfill]` Same crypto issue - ETag generation requires createHash
    * Same root cause as many other tests - crypto module needed

---

25. `express-test-harness-Expre-4d0a0-ing-acceptance-downloads-js-chromium`
### `test/acceptance/downloads.js`
* **Feature:** File download example test
* **Dependencies:**
    * `[Module]`: `../../examples/downloads` (example app)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/downloads`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests - need example app mapping
    * Consistent with other acceptance test failures

---

26. `express-test-harness-Expre-4e3f8-ading-express-urlencoded-js-chromium`
### `test/express.urlencoded.js`
* **Feature:** `express.urlencoded()` middleware for parsing URL-encoded body data
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `node:async_hooks` (async context tracking)
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: node:async_hooks`
    * Tests cannot run - async_hooks module not transformed
    * Shows "0 passed, 0 failed" - no tests executed
    * 68 tests found but blocked by missing polyfill
* **Path to Green:**
    * `[Missing Polyfill]` Same as express.json.js and express.raw.js - needs async-hooks-stub.js
    * `[Transform]` Add node:async_hooks mapping in test-transformer.js
    * High-impact fix as this middleware is commonly used

---

27. `express-test-harness-Expre-50b04-est-Loading-app-response-js-chromium`
### `test/app.response.js`
* **Feature:** `app.response` - extending response prototype for custom methods
* **Dependencies:**
    * `[Module]`: `after` (npm package)
    * `[Module]`: `express` (main module)
* **Current Status:** **Failing** 
    * **Error:** Mixed failures - crypto and timeout issues
    * 5 tests, all failing
    * 4 tests fail with `crypto.createHash is not a function`
    * 1 test times out waiting for response
* **Path to Green:**
    * `[Missing Polyfill]` Primary issue is crypto dependency for ETags
    * `[API Incompatibility]` One timeout suggests response extension may have issues
    * Once crypto is fixed, most tests should pass

---

28. `express-test-harness-Expre-52f1a-amic-Test-Loading-req-ip-js-chromium`
### `test/req.ip.js`
* **Feature:** `req.ip` - get client IP address with trust proxy support
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Failing** 
    * **Error:** Multiple issues - timeouts, crypto, and property access errors
    * 6 tests, all failing
    * 3 tests timeout waiting for response
    * 2 tests fail with `Cannot read properties of undefined (reading 'address')`
    * 1 test fails with `crypto.createHash is not a function`
* **Path to Green:**
    * `[Missing Polyfill]` Crypto dependency for one test
    * `[API Incompatibility]` IP address handling not working - missing req.connection/socket.address
    * `[Incomplete Polyfill]` HTTP stub needs better socket/connection mocking
    * Complex fix involving network address simulation

---

29. `express-test-harness-Expre-552b8-est-Loading-res-sendFile-js-chromium`
### `test/res.sendFile.js`
* **Feature:** `res.sendFile()` - send file as response with options
* **Dependencies:**
    * `[Global]`: `__dirname` (file path resolution)
    * File system operations
* **Current Status:** **NOT_APPLICABLE** 
    * **Reason:** Uses `__dirname` which triggers compatibility check
    * 55 tests found but marked as incompatible
    * Test loads successfully but cannot run
* **Path to Green:**
    * `[Transform]` Provide `__dirname` polyfill
    * `[Challenge]` File sending tests heavily depend on file system operations
    * `[Alternative]` May need significant adaptation for OPFS-based file operations
    * Similar to res.download.js - complex file system dependency

---

30. `express-test-harness-Expre-61625-Test-Loading-app-request-js-chromium`
### `test/app.request.js`  
* **Feature:** `app.request` - extending request prototype for custom methods
* **Dependencies:**
    * `[Module]`: `after` (npm package)
    * `[Module]`: `node:url` (URL parsing)
    * `[Module]`: `express` (main module)
* **Current Status:** **Failing** 
    * **Error:** Mixed failures - crypto, timeout, and unhandled requires
    * 5 tests, all failing
    * 4 tests fail with `crypto.createHash is not a function`
    * 1 test times out waiting for response
    * `ERROR: Unhandled requires: node:url` blocking some functionality
* **Path to Green:**
    * `[Missing Polyfill]` Primary issue is crypto dependency for ETags
    * `[Missing Polyfill]` Also needs node:url polyfill (URL parsing)
    * `[API Incompatibility]` One timeout suggests request extension may have issues
    * Parallel to app.response.js - similar issues

---

31. `express-test-harness-Expre-676b5--Test-Loading-req-secure-js-chromium`
### `test/req.secure.js`
* **Feature:** `req.secure` - determine if request was made over HTTPS
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Unknown** 
    * **Error:** Test loads successfully with 6 tests found
    * Error context appears truncated - no test execution results shown
    * Transformations applied successfully
* **Path to Green:**
    * `[Unknown]` Need to see actual test execution results
    * Likely crypto issue based on pattern of other req.* tests
    * May also have HTTPS/TLS detection issues in browser environment

---

32. `express-test-harness-Expre-6a278-c-Test-Loading-app-param-js-chromium`
### `test/app.param.js`
* **Feature:** `app.param()` - parameter pre-processing middleware
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Unknown** 
    * **Error:** Test loads successfully with 13 tests found
    * Error context appears truncated - no test execution results shown
    * Transformations applied successfully
* **Path to Green:**
    * `[Unknown]` Need to see actual test execution results
    * Likely crypto issue based on pattern of other app.* tests
    * Parameter handling is core Express functionality

---

33. `express-test-harness-Expre-6e54d-ing-acceptance-route-map-js-chromium`
### `test/acceptance/route-map.js`
* **Feature:** Route mapping example test
* **Dependencies:**
    * `[Module]`: `../../examples/route-map` (example app)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/route-map`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
    * 5 tests found but blocked by missing example app
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests - need example app mapping
    * Consistent with other acceptance test failures

---

34. `express-test-harness-Expre-7109b-ading-acceptance-cookies-js-chromium`
### `test/acceptance/cookies.js`
* **Feature:** Cookie handling example test
* **Dependencies:**
    * `[Module]`: `../../examples/cookies` (example app)
    * `[Module]`: `../support/utils` (test utilities)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/cookies, ../support/utils`
    * Tests cannot run - both example app and test utils require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
    * 6 tests found but blocked by missing dependencies
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests - need example app mapping
    * `[Transform Error]` Also needs test utilities mapping for ../support/utils
    * Double dependency issue - both example and support utils

---

35. `express-test-harness-Expre-7279c--Test-Loading-regression-js-chromium`
### `test/regression.js`
* **Feature:** Regression tests for specific bug fixes
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Passing** ✅
    * **Success:** 1 of 1 tests passing
    * Test: "throw after .end() should fail gracefully"
    * Duration: 3ms
    * No errors
* **Path to Green:**
    * Already green! No fixes needed
    * This test validates Express error handling works correctly

---

36. `express-test-harness-Expre-74e59--acceptance-multi-router-js-chromium`
### `test/acceptance/multi-router.js`
* **Feature:** Multiple router example test
* **Dependencies:**
    * `[Module]`: `../../examples/multi-router` (example app)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/multi-router`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
    * 5 tests found but blocked by missing example app
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests - need example app mapping
    * Consistent with other acceptance test failures

---

37. `express-test-harness-Expre-75ecb-t-Loading-req-subdomains-js-chromium`
### `test/req.subdomains.js`
* **Feature:** `req.subdomains` - extract subdomain array from hostname
* **Dependencies:**
    * `[Module]`: `express` (main module)
* **Current Status:** **Failing** 
    * **Error:** `crypto.createHash is not a function`
    * 11 tests, all failing due to crypto dependency
    * Tests various subdomain extraction scenarios (IPv4, IPv6, trusted proxies)
* **Path to Green:**
    * `[Missing Polyfill]` Same crypto issue - ETag generation requires createHash
    * Once crypto is fixed, all subdomain parsing tests should pass
    * Subdomain functionality itself appears to work

---

38. `express-test-harness-Expre-7710d-mic-Test-Loading-res-set-js-chromium`  
### `test/res.set.js`
* **Feature:** `res.set()` - set response headers (single/multiple)
* **Dependencies:**
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Mostly Failing** 
    * **Error:** Multiple API compatibility issues - no crypto errors!
    * 8 tests: 1 passed, 7 failed
    * Response body duplication: "string" becomes "stringstring"
    * Status header issues: Expected Content-Type but got 200
    * Array response duplication: `["123","456"]` becomes doubled
    * 1 timeout, Content-Type array validation error
* **Path to Green:**
    * `[API Incompatibility]` Primary issue is response body/header duplication
    * `[Missing Implementation]` Header setting logic has bugs
    * Notable: No crypto dependency - this is a pure header handling issue
    * Fix response write/send mechanism to prevent duplication

---

39. `express-test-harness-Expre-7939f-Loading-acceptance-error-js-chromium`
### `test/acceptance/error.js`
* **Feature:** Error handling example test
* **Dependencies:**
    * `[Module]`: `../../examples/error` (example app)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/error`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
    * 3 tests found but blocked by missing example app
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests - need example app mapping
    * Consistent with other acceptance test failures

---

40. `express-test-harness-Expre-7abde-c-Test-Loading-req-range-js-chromium`
### `test/req.range.js`
* **Feature:** `req.range()` - parse Range header for partial content requests
* **Dependencies:**
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** Multiple issues - range parsing failures and crypto error
    * 7 tests, all failing
    * Expected parsed range objects but got empty responses
    * `Cannot read properties of undefined (reading 'type')` - range result missing properties
    * 1 test fails with `crypto.createHash is not a function`
* **Path to Green:**
    * `[API Incompatibility]` Range header parsing is not working correctly
    * `[Missing Implementation]` req.range() returns malformed or empty results
    * `[Missing Polyfill]` One test also has crypto dependency
    * Complex fix - needs HTTP range header parsing implementation

---

41. `express-test-harness-Expre-7cff9--Test-Loading-app-engine-js-chromium`
### `test/app.engine.js`
* **Feature:** `app.engine()` - register template engine
* **Dependencies:**
    * `[Global]`: `__dirname` (file path resolution)
    * Template engine file operations
* **Current Status:** **NOT_APPLICABLE** 
    * **Reason:** Uses `__dirname` which triggers compatibility check
    * 5 tests found but marked as incompatible
    * Test loads successfully but cannot run
* **Path to Green:**
    * `[Transform]` Provide `__dirname` polyfill
    * `[Challenge]` Template engine tests depend on file system operations
    * `[Alternative]` May need adaptation for OPFS-based template loading
    * Similar to other file-dependent tests

---

42. `express-test-harness-Expre-82bd0-est-Loading-express-text-js-chromium`
### `test/express.text.js`
* **Feature:** `express.text()` middleware for parsing text body
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `node:async_hooks` (async context tracking)
    * `[Module]`: `express` (main module)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: node:async_hooks`
    * Tests cannot run - async_hooks module not transformed
    * Shows "0 passed, 0 failed" - no tests executed
    * 45 tests found but blocked by missing polyfill
* **Path to Green:**
    * `[Missing Polyfill]` Same as express.json.js, express.raw.js, and express.urlencoded.js - needs async-hooks-stub.js
    * `[Transform]` Add node:async_hooks mapping in test-transformer.js
    * High-impact fix as this middleware is commonly used for text parsing

---

43. `express-test-harness-Expre-82c6e-ic-Test-Loading-res-send-js-chromium`
### `test/res.send.js`
* **Feature:** `res.send()` - send response data with content negotiation
* **Dependencies:**
    * `[Module]`: `node:assert` (assertions)
    * `[Module]`: `express` (main module)
    * `[Module]`: `../lib/utils` (Express utilities)
    * `[Module]`: `supertest` (HTTP testing)
    * `[Module]`: `./support/utils` (test utilities)
* **Current Status:** **Mostly Failing** 
    * **Error:** Multiple issues - crypto being primary blocker
    * 69 tests: 8 passed, 61 failed
    * 47 tests fail with `crypto.createHash is not a function` (ETag generation)
    * 6 tests fail with `Cannot read properties of undefined (reading 'toLowerCase')` (header issues)
    * 3 tests fail with `request(...)[method] is not a function` (supertest HTTP method issues)
    * 2 tests fail with status code mismatches (304 vs 200)
    * Buffer duplication issue: response appears doubled
* **Path to Green:**
    * `[Missing Polyfill]` Primary blocker is crypto dependency for ETag generation
    * `[API Incompatibility]` Header handling has toLowerCase errors
    * `[Missing Implementation]` HTTP freshness checks not working (304 status)
    * `[Transform Error]` Some HTTP methods not mapped correctly in supertest
    * `[API Incompatibility]` Response body duplication for buffers
    * Complex test - touches many core Express features

---

44. `express-test-harness-Expre-84adc-oading-acceptance-params-js-chromium`
### `test/acceptance/params.js`
* **Feature:** Route parameters example test
* **Dependencies:**
    * `[Module]`: `../../examples/params` (example app)
    * `[Module]`: `supertest` (HTTP testing)
* **Current Status:** **Failing** 
    * **Error:** `ERROR: Unhandled requires: ../../examples/params`
    * Tests cannot run - example app require not transformed
    * Shows "0 passed, 0 failed" - no tests executed
    * 5 tests found but blocked by missing example app
* **Path to Green:**
    * `[Transform Error]` Same pattern as all acceptance tests - need example app mapping
    * Consistent with other acceptance test failures

---
45. `express-test-harness-Expre-86a01-amic-Test-Loading-Router-js-chromium`
46. `express-test-harness-Expre-8b7e1-t-Loading-express-static-js-chromium`
47. `express-test-harness-Expre-8e0ed-ance-content-negotiation-js-chromium`
48. `express-test-harness-Expre-9287b--Test-Loading-app-render-js-chromium`
49. `express-test-harness-Expre-960cc--Test-Loading-res-status-js-chromium`
50. `express-test-harness-Expre-98d8d-mic-Test-Loading-req-xhr-js-chromium`
51. `express-test-harness-Expre-9b876-g-acceptance-error-pages-js-chromium`
52. `express-test-harness-Expre-9d3c3-ic-Test-Loading-res-json-js-chromium`
53. `express-test-harness-Expre-9e342-ic-Test-Loading-app-head-js-chromium`
54. `express-test-harness-Expre-a34c9--Loading-res-clearCookie-js-chromium`
55. `express-test-harness-Expre-a6651-t-Loading-res-sendStatus-js-chromium`
56. `express-test-harness-Expre-a6fd6-ic-Test-Loading-req-path-js-chromium`
57. `express-test-harness-Expre-adfc1-t-Loading-res-attachment-js-chromium`
58. `express-test-harness-Expre-ae2fa-amic-Test-Loading-req-is-js-chromium`
59. `express-test-harness-Expre-ae63a-est-Loading-req-hostname-js-chromium`
60. `express-test-harness-Expre-b0f72-est-Loading-express-json-js-chromium`
61. `express-test-harness-Expre-b3a98-ic-Test-Loading-res-type-js-chromium`
62. `express-test-harness-Expre-b8230-Dynamic-Test-Loading-app-js-chromium`
63. `express-test-harness-Expre-b8e09-c-Test-Loading-app-route-js-chromium`
64. `express-test-harness-Expre-bb33f-ic-Test-Loading-res-vary-js-chromium`
65. `express-test-harness-Expre-bdd0b--Test-Loading-res-render-js-chromium`
66. `express-test-harness-Expre-c14d5-eptance-route-separation-js-chromium`
67. `express-test-harness-Expre-c300f-Loading-acceptance-vhost-js-chromium`
68. `express-test-harness-Expre-c818a-c-Test-Loading-req-stale-js-chromium`
69. `express-test-harness-Expre-c9bc4--Test-Loading-res-cookie-js-chromium`
70. `express-test-harness-Expre-ce2d0-namic-Test-Loading-utils-js-chromium`
71. `express-test-harness-Expre-d3abe--Test-Loading-res-append-js-chromium`
72. `express-test-harness-Expre-d7a84-ding-acceptance-resource-js-chromium`
73. `express-test-harness-Expre-d7c84-c-Test-Loading-res-jsonp-js-chromium`
74. `express-test-harness-Expre-df387-mic-Test-Loading-req-ips-js-chromium`
75. `express-test-harness-Expre-e2d06-ing-req-acceptsLanguages-js-chromium`
76. `express-test-harness-Expre-e34b8-Test-Loading-req-accepts-js-chromium`
77. `express-test-harness-Expre-e4c8b-ic-Test-Loading-req-host-js-chromium`
78. `express-test-harness-Expre-e9ad5-g-acceptance-web-service-js-chromium`
79. `express-test-harness-Expre-ea094-c-Test-Loading-res-links-js-chromium`
80. `express-test-harness-Expre-eda53-est-Loading-res-redirect-js-chromium`
81. `express-test-harness-Expre-f02e0--Test-Loading-res-locals-js-chromium`
82. `express-test-harness-Expre-f76d1-c-Test-Loading-req-route-js-chromium`
83. `express-test-harness-Expre-fde45-Test-Loading-req-baseUrl-js-chromium`
84. `express-test-harness-Expre-fe60e-g-acceptance-hello-world-js-chromium`
85. `express-test-harness-Expre-fed46-c-Test-Loading-req-fresh-js-chromium`
86. `express-test-harness-Expre-ce2d0-namic-Test-Loading-utils-js-chromium`

---

## Test #45: `test/Router.js`
**Feature**: Express Router functionality and middleware handling  
**Dependencies**: 
- `after` module (minor/test util)  
**Current Status**: [Incomplete Polyfill] - 35/39 passing (4 failing due to harness issues)  
**Path to Green**: Fix test harness timeout handling and `this.timeout()` method issues. Good success rate indicates strong Router compatibility.

## Test #46: `test/express.text.js`  
**Feature**: Text middleware body parsing  
**Dependencies**: 
- `node:async_hooks` module (middleware tracking)  
**Current Status**: [Missing Polyfill] - Transform error blocks execution  
**Path to Green**: Add async_hooks polyfill stub for middleware context tracking.

## Test #47: `test/app.engine.js`
**Feature**: Template engine registration  
**Dependencies**: 
- `__dirname` usage (file system paths)  
**Current Status**: [Not Applicable] - Uses Node.js specific features  
**Path to Green**: Cannot be browser-compatible due to __dirname requirement.

## Test #48: `test/app.routes.error.js`
**Feature**: Route error handling  
**Dependencies**: 
- `crypto.createHash` (ETag generation)  
**Current Status**: [Missing Polyfill] - 0/2 passing  
**Path to Green**: Add crypto polyfill with createHash method implementation.

**Analyzed: 48/86 tests**


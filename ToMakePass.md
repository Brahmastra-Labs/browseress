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

#### ✅ ANALYZED (5)

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

### TO READ NEXT SEQUENTIALLY
# 6

#### 📋 TO READ (82)
6. `express-test-harness-Expre-06db4-ding-req-acceptsCharsets-js-chromium`
7. `express-test-harness-Expre-094dd-mic-Test-Loading-app-use-js-chromium`
8. `express-test-harness-Expre-10daf-mic-Test-Loading-res-get-js-chromium`
9. `express-test-harness-Expre-12394-mic-Test-Loading-app-all-js-chromium`
10. `express-test-harness-Expre-17688--Test-Loading-app-router-js-chromium`
11. `express-test-harness-Expre-18149-c-Test-Loading-req-query-js-chromium`
12. `express-test-harness-Expre-188bb-est-Loading-res-download-js-chromium`
13. `express-test-harness-Expre-1b433-Test-Loading-express-raw-js-chromium`
14. `express-test-harness-Expre-1ec6c-est-Loading-res-location-js-chromium`
15. `express-test-harness-Expre-22c32-est-Loading-req-protocol-js-chromium`
16. `express-test-harness-Expre-2344c-oading-req-signedCookies-js-chromium`
17. `express-test-harness-Expre-28ee8-t-Loading-acceptance-mvc-js-chromium`
18. `express-test-harness-Expre-2ab76--Test-Loading-app-locals-js-chromium`
19. `express-test-harness-Expre-2e7bc--Loading-acceptance-auth-js-chromium`
20. `express-test-harness-Expre-36a31-mic-Test-Loading-req-get-js-chromium`
21. `express-test-harness-Expre-36e50-t-Loading-acceptance-ejs-js-chromium`
22. `express-test-harness-Expre-392eb-ding-acceptance-markdown-js-chromium`
23. `express-test-harness-Expre-3ee8c-amic-Test-Loading-config-js-chromium`
24. `express-test-harness-Expre-4c4f8-ing-req-acceptsEncodings-js-chromium`
25. `express-test-harness-Expre-4d0a0-ing-acceptance-downloads-js-chromium`
26. `express-test-harness-Expre-4e3f8-ading-express-urlencoded-js-chromium`
27. `express-test-harness-Expre-50b04-est-Loading-app-response-js-chromium`
28. `express-test-harness-Expre-52f1a-amic-Test-Loading-req-ip-js-chromium`
29. `express-test-harness-Expre-552b8-est-Loading-res-sendFile-js-chromium`
30. `express-test-harness-Expre-61625-Test-Loading-app-request-js-chromium`
31. `express-test-harness-Expre-676b5--Test-Loading-req-secure-js-chromium`
32. `express-test-harness-Expre-6a278-c-Test-Loading-app-param-js-chromium`
33. `express-test-harness-Expre-6e54d-ing-acceptance-route-map-js-chromium`
34. `express-test-harness-Expre-7109b-ading-acceptance-cookies-js-chromium`
35. `express-test-harness-Expre-7279c--Test-Loading-regression-js-chromium`
36. `express-test-harness-Expre-74e59--acceptance-multi-router-js-chromium`
37. `express-test-harness-Expre-75ecb-t-Loading-req-subdomains-js-chromium`
38. `express-test-harness-Expre-7710d-mic-Test-Loading-res-set-js-chromium`
39. `express-test-harness-Expre-7939f-Loading-acceptance-error-js-chromium`
40. `express-test-harness-Expre-7abde-c-Test-Loading-req-range-js-chromium`
41. `express-test-harness-Expre-7cff9--Test-Loading-app-engine-js-chromium`
42. `express-test-harness-Expre-82bd0-est-Loading-express-text-js-chromium`
43. `express-test-harness-Expre-82c6e-ic-Test-Loading-res-send-js-chromium`
44. `express-test-harness-Expre-84adc-oading-acceptance-params-js-chromium`
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


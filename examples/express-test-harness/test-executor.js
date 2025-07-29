// Test Executor for Express Test Harness
// Safely executes transformed tests in a controlled environment

class TestExecutor {
  constructor() {
    this.currentTest = null;
    this.testResults = [];
    this.timeout = 30000; // 30 second default timeout
  }

  /**
   * Execute a transformed test
   * @param {string} transformedCode - The transformed test code
   * @param {Object} testContext - Context object with test utilities
   * @returns {Promise<Object>} Test execution results
   */
  async executeTest(transformedCode, testContext) {
    try {
      console.log('[TestExecutor] Preparing to execute test');
      console.log('[TestExecutor] Code type:', typeof transformedCode);
      console.log('[TestExecutor] Code preview:', transformedCode.substring(0, 200) + '...');
      
      // Create the test function
      // The transformed code is already a function string, so we evaluate it directly
      const testFunction = eval(transformedCode);
      console.log('[TestExecutor] Test function created, type:', typeof testFunction);
      
      // Create execution context with all necessary utilities
      const context = this.createTestContext(testContext);
      
      // Execute with timeout
      const result = await this.runWithTimeout(
        () => testFunction(context),
        this.timeout
      );
      
      // Process results
      if (result.success) {
        console.log('[TestExecutor] Test function executed successfully');
        console.log('[TestExecutor] Collected describes:', context._describes.length);
        console.log('[TestExecutor] Collected root tests:', context._tests.length);
        
        // Wait for any pending tests to complete
        await this.waitForTestCompletion(context);
        
        return {
          success: true,
          results: this.collectTestResults(context),
          stats: this.getTestStats(context)
        };
      } else {
        return {
          success: false,
          error: result.error,
          stack: result.stack
        };
      }
      
    } catch (error) {
      console.error('[TestExecutor] Execution error:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Create a complete test execution context
   */
  createTestContext(userContext = {}) {
    const self = this;
    
    // Test tracking
    const tests = [];
    const describes = [];
    let currentDescribe = null;
    let describeStack = []; // Stack to track nested describes
    let beforeHooks = [];
    let afterHooks = [];
    let beforeEachHooks = [];
    let afterEachHooks = [];
    
    // Create context object
    const context = {
      // Test framework functions
      describe(name, fn) {
        const suite = {
          name,
          tests: [],
          beforeHooks: [],
          afterHooks: [],
          beforeEachHooks: [],
          afterEachHooks: [],
          parent: currentDescribe,
          level: describeStack.length
        };
        
        describes.push(suite);
        const previousDescribe = currentDescribe;
        currentDescribe = suite;
        describeStack.push(suite);
        
        // Execute the describe block to collect tests
        fn();
        
        describeStack.pop();
        currentDescribe = previousDescribe;
      },
      
      it(name, fn) {
        const test = {
          name,
          fn,
          suite: currentDescribe?.name || 'root',
          status: 'pending'
        };
        
        if (currentDescribe) {
          currentDescribe.tests.push(test);
        } else {
          tests.push(test);
        }
      },
      
      before(fn) {
        if (currentDescribe) {
          currentDescribe.beforeHooks.push(fn);
        } else {
          beforeHooks.push(fn);
        }
      },
      
      after(fn) {
        if (currentDescribe) {
          currentDescribe.afterHooks.push(fn);
        } else {
          afterHooks.push(fn);
        }
      },
      
      beforeEach(fn) {
        if (currentDescribe) {
          currentDescribe.beforeEachHooks.push(fn);
        } else {
          beforeEachHooks.push(fn);
        }
      },
      
      afterEach(fn) {
        if (currentDescribe) {
          currentDescribe.afterEachHooks.push(fn);
        } else {
          afterEachHooks.push(fn);
        }
      },
      
      // Assertion utilities (delegated to existing implementation)
      expect: window.expect || userContext.expect,
      assert: window.assert || userContext.assert,
      
      // Request utility
      request: window.request || userContext.request,
      
      // Express and transport
      express: window.browseress?.express || userContext.express,
      app: userContext.app,
      transport: userContext.transport,
      
      // Utility functions
      after: window.after || userContext.after,
      testUtils: window.testUtils || userContext.testUtils,
      
      // Store test execution data
      _tests: tests,
      _describes: describes,
      _beforeHooks: beforeHooks,
      _afterHooks: afterHooks,
      _beforeEachHooks: beforeEachHooks,
      _afterEachHooks: afterEachHooks
    };
    
    return context;
  }

  /**
   * Run a function with timeout
   */
  async runWithTimeout(fn, timeout) {
    return new Promise((resolve) => {
      let timeoutId;
      let completed = false;
      
      // Set up timeout
      timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          resolve({
            success: false,
            error: 'Test execution timeout',
            timeout: true
          });
        }
      }, timeout);
      
      // Execute function
      try {
        const result = fn();
        
        // Handle both sync and async results
        if (result && typeof result.then === 'function') {
          result
            .then(() => {
              if (!completed) {
                completed = true;
                clearTimeout(timeoutId);
                resolve({ success: true });
              }
            })
            .catch(error => {
              if (!completed) {
                completed = true;
                clearTimeout(timeoutId);
                resolve({
                  success: false,
                  error: error.message,
                  stack: error.stack
                });
              }
            });
        } else {
          // Sync execution completed
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            resolve({ success: true });
          }
        }
      } catch (error) {
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error.message,
            stack: error.stack
          });
        }
      }
    });
  }

  /**
   * Wait for all tests to complete
   */
  async waitForTestCompletion(context) {
    // Create root suite with global hooks
    const rootSuite = {
      name: 'root',
      tests: context._tests,
      beforeHooks: context._beforeHooks,
      afterHooks: context._afterHooks,
      beforeEachHooks: context._beforeEachHooks || [],
      afterEachHooks: context._afterEachHooks || [],
      parent: null,
      level: 0
    };
    
    // Set root suite as parent for top-level describes
    context._describes.forEach(suite => {
      if (!suite.parent) {
        suite.parent = rootSuite;
      }
    });
    
    // Run all suites
    const allSuites = [...context._describes];
    if (context._tests.length > 0) {
      allSuites.unshift(rootSuite);
    }
    
    for (const suite of allSuites) {
      await this.runTestSuite(suite, context);
    }
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suite, context) {
    console.log(`[TestExecutor] Running suite: ${suite.name}`);
    
    // Collect all beforeEach/afterEach hooks from parent chain
    const allBeforeEachHooks = this.collectHooksFromParents(suite, 'beforeEachHooks');
    const allAfterEachHooks = this.collectHooksFromParents(suite, 'afterEachHooks');
    
    // Run before hooks (only for this suite, not parents)
    for (const hook of suite.beforeHooks) {
      try {
        await this.runHookOrTest(hook, 'before hook');
      } catch (error) {
        console.error(`[TestExecutor] Before hook failed:`, error);
        throw error;
      }
    }
    
    // Run tests
    for (const test of suite.tests) {
      // Run all beforeEach hooks (including from parents)
      for (const hook of allBeforeEachHooks) {
        try {
          await this.runHookOrTest(hook, 'beforeEach hook');
        } catch (error) {
          test.status = 'failed';
          test.error = `BeforeEach hook failed: ${error.message}`;
          continue;
        }
      }
      
      // Run the test
      try {
        await this.runHookOrTest(test.fn, `test "${test.name}"`);
        test.status = 'passed';
      } catch (error) {
        test.status = 'failed';
        test.error = error.message;
        test.stack = error.stack;
      }
      
      // Run all afterEach hooks (including from parents, in reverse order)
      for (const hook of allAfterEachHooks.reverse()) {
        try {
          await this.runHookOrTest(hook, 'afterEach hook');
        } catch (error) {
          console.error(`[TestExecutor] AfterEach hook failed:`, error);
        }
      }
    }
    
    // Run after hooks (only for this suite, not parents)
    for (const hook of suite.afterHooks) {
      try {
        await this.runHookOrTest(hook, 'after hook');
      } catch (error) {
        console.error(`[TestExecutor] After hook failed:`, error);
      }
    }
  }

  /**
   * Collect hooks from parent chain
   */
  collectHooksFromParents(suite, hookType) {
    const hooks = [];
    let current = suite;
    
    // Walk up the parent chain collecting hooks
    while (current) {
      // Add parent hooks first (so they run before child hooks)
      hooks.unshift(...current[hookType]);
      current = current.parent;
    }
    
    return hooks;
  }

  /**
   * Run a test or hook function, handling both done callbacks and promises
   */
  async runHookOrTest(fn, description) {
    // Check if the function expects a done callback (function.length === 1)
    if (fn.length === 1) {
      // Function expects done callback
      return new Promise((resolve, reject) => {
        let finished = false;
        let timeoutId;
        
        // Create done callback
        const done = (err) => {
          if (finished) return; // Prevent multiple calls
          finished = true;
          clearTimeout(timeoutId);
          
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };
        
        // Set timeout for done callback
        timeoutId = setTimeout(() => {
          if (!finished) {
            finished = true;
            reject(new Error(`Timeout waiting for done() in ${description}`));
          }
        }, 5000); // 5 second timeout for individual tests
        
        try {
          // Call function with done callback
          const result = fn(done);
          
          // If function also returns a promise, wait for it
          if (result && typeof result.then === 'function') {
            result
              .then(() => {
                if (!finished) {
                  finished = true;
                  clearTimeout(timeoutId);
                  resolve();
                }
              })
              .catch((err) => {
                if (!finished) {
                  finished = true;
                  clearTimeout(timeoutId);
                  reject(err);
                }
              });
          }
        } catch (error) {
          if (!finished) {
            finished = true;
            clearTimeout(timeoutId);
            reject(error);
          }
        }
      });
    } else {
      // Function doesn't expect done callback - treat as sync or promise
      const result = await fn();
      return result;
    }
  }

  /**
   * Collect test results from context
   */
  collectTestResults(context) {
    const results = [];
    
    // Collect from all suites
    const allSuites = [...context._describes];
    if (context._tests.length > 0) {
      allSuites.unshift({
        name: 'root',
        tests: context._tests
      });
    }
    
    for (const suite of allSuites) {
      for (const test of suite.tests) {
        results.push({
          suite: suite.name,
          name: test.name,
          status: test.status,
          error: test.error,
          stack: test.stack
        });
      }
    }
    
    return results;
  }

  /**
   * Get test statistics
   */
  getTestStats(context) {
    const results = this.collectTestResults(context);
    
    return {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      pending: results.filter(r => r.status === 'pending').length
    };
  }

  /**
   * Create a test report
   */
  createTestReport(results, metadata) {
    const stats = results.stats || { total: 0, passed: 0, failed: 0 };
    const duration = results.duration || 0;
    
    return {
      metadata,
      stats,
      duration,
      results: results.results || [],
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in test harness
window.TestExecutor = TestExecutor;
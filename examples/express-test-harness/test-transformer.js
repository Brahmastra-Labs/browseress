// Test Transformer for Express Test Harness
// Transforms Node.js Express tests for browser compatibility

class TestTransformer {
  constructor() {
    this.transformations = new Map();
    this.categories = {
      PASS: 'Tests that work without modification',
      ADAPTED: 'Tests modified for browser compatibility',
      NOT_APPLICABLE: 'Tests that cannot run in browser',
      BUG: 'Tests that fail due to implementation differences'
    };
  }

  /**
   * Transform a test file for browser execution
   * @param {string} code - Raw test file content
   * @param {Object} metadata - Test metadata from loader
   * @returns {Object} Transformed code and categorization
   */
  transformTest(code, metadata = {}) {
    let transformed = code;
    let category = 'PASS';
    const modifications = [];

    // Strip 'use strict' as it's implicit in modules
    transformed = this.stripUseStrict(transformed);
    if (transformed !== code) {
      modifications.push('Removed "use strict"');
    }

    // Transform require statements
    const requiresResult = this.transformRequires(transformed);
    transformed = requiresResult.code;
    if (requiresResult.modified) {
      modifications.push(...requiresResult.modifications);
      category = 'ADAPTED';
    }

    // Check for Node-only features
    const compatibility = this.checkBrowserCompatibility(transformed);
    if (!compatibility.compatible) {
      category = 'NOT_APPLICABLE';
      return {
        code: transformed,
        category,
        reason: compatibility.reason,
        modifications
      };
    }

    // Transform assertions
    const assertResult = this.transformAssertions(transformed);
    transformed = assertResult.code;
    if (assertResult.modified) {
      modifications.push(...assertResult.modifications);
      category = 'ADAPTED';
    }

    // Wrap the test code for execution
    const wrapped = this.wrapTestCode(transformed, metadata);

    return {
      code: wrapped,
      category,
      modifications,
      metadata: {
        ...metadata,
        transformed: true,
        category
      }
    };
  }

  /**
   * Strip 'use strict' declarations
   */
  stripUseStrict(code) {
    return code.replace(/^['"]use strict['"];?\s*\n?/gm, '');
  }

  /**
   * Transform require statements to browser equivalents
   */
  transformRequires(code) {
    let modified = false;
    const modifications = [];
    let transformed = code;

    // Map of require transformations
    const requireMap = {
      '../': 'window.browseress.express',
      '..': 'window.browseress.express',
      '../.': 'window.browseress.express',  // Handle require('../.')
      'express': 'window.browseress.express',
      'supertest': 'window.supertest',
      'node:assert': 'window.assert',
      'assert': 'window.assert',
      'after': 'window.after',
      './support/utils': 'window.testUtils',
      '../lib/utils': 'window.expressUtils',  // Express internal utils - separate from test utils
      'crypto': 'window.browseress.crypto',
      'node:crypto': 'window.browseress.crypto',
      'url': 'window.browseress.url',
      'node:url': 'window.browseress.url',
      'parseurl': 'window.browseress.parseurl',
      // Additional commonly needed polyfills
      'node:fs': 'window.browseress.fs',
      'node:path': 'window.browseress.path',
      'node:buffer': '{ Buffer: window.Buffer }',
      'buffer': '{ Buffer: window.Buffer }',
      // Common Node.js modules that need browser alternatives
      'node:async_hooks': '{ AsyncResource: class {} }', // Minimal stub for async hooks
      'on-finished': 'window.onFinished || function() {}', // File download completion stub
      'cookie-parser': 'window.cookieParser || function() { return function(req, res, next) { next(); }; }' // Cookie parser middleware stub
    };

    // Transform require statements
    Object.entries(requireMap).forEach(([from, to]) => {
      const patterns = [
        // var/const/let name = require('module')
        new RegExp(`(var|const|let)\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*['"]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\)`, 'g'),
        // Direct require without assignment
        new RegExp(`require\\s*\\(\\s*['"]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\)`, 'g')
      ];

      patterns.forEach(pattern => {
        if (pattern.test(transformed)) {
          modified = true;
          if (from === '../' || from === '..' || from === 'express') {
            modifications.push('Transformed Express require');
          } else {
            modifications.push(`Transformed ${from} require`);
          }
        }
        
        // Replace with assignment
        transformed = transformed.replace(
          patterns[0],
          `$1 $2 = ${to}`
        );
        
        // Replace direct requires
        transformed = transformed.replace(
          patterns[1],
          to
        );
      });
    });

    // Handle destructuring requires
    // e.g., var { methods } = require('../lib/utils')
    transformed = transformed.replace(
      /(var|const|let)\s*{\s*([^}]+)\s*}\s*=\s*require\s*\(\s*['"][^'"]+['"]\s*\)/g,
      (match, declType, destructured) => {
        modified = true;
        modifications.push('Transformed destructuring require');
        // For now, assume utils are on window.testUtils
        return `${declType} { ${destructured} } = window.testUtils || {}`;
      }
    );
    
    // Handle Buffer requires specially
    transformed = transformed.replace(
      /(const|let|var)\s*{\s*Buffer\s*}\s*=\s*require\s*\(\s*['"]node:buffer['"]\s*\)/g,
      '$1 { Buffer } = { Buffer: window.testUtils?.Buffer || window.Buffer }'
    );
    
    // CRITICAL: Check for any remaining unhandled require statements
    const remainingRequires = transformed.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    if (remainingRequires) {
      // Extract the module names for better error reporting
      const unhandledModules = remainingRequires.map(req => {
        const match = req.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        return match ? match[1] : req;
      });
      
      const error = new Error(`Unhandled require statements found: ${unhandledModules.join(', ')}`);
      console.error('[Transformer] Unhandled requires:', unhandledModules);
      modifications.push(`ERROR: Unhandled requires: ${unhandledModules.join(', ')}`);
      
      // Return error state but don't throw - let the UI show the error
      return { 
        code: transformed, 
        modified: true, 
        modifications,
        error: error.message,
        unhandledRequires: unhandledModules
      };
    }

    return { code: transformed, modified, modifications };
  }

  /**
   * Check if code is browser compatible
   */
  checkBrowserCompatibility(code) {
    // List of Node-only modules/features
    const nodeOnlyPatterns = [
      { pattern: /require\s*\(\s*['"]fs['"]/, reason: 'Uses Node.js fs module' },
      { pattern: /require\s*\(\s*['"]child_process['"]/, reason: 'Uses child_process module' },
      { pattern: /require\s*\(\s*['"]cluster['"]/, reason: 'Uses cluster module' },
      { pattern: /require\s*\(\s*['"]crypto['"]/, reason: 'Uses crypto module' },
      { pattern: /process\.exit/, reason: 'Uses process.exit()' },
      { pattern: /__dirname/, reason: 'Uses __dirname' },
      { pattern: /__filename/, reason: 'Uses __filename' }
    ];

    for (const { pattern, reason } of nodeOnlyPatterns) {
      if (pattern.test(code)) {
        return { compatible: false, reason };
      }
    }

    return { compatible: true };
  }

  /**
   * Transform assertion statements
   */
  transformAssertions(code) {
    let modified = false;
    const modifications = [];
    let transformed = code;

    // Transform assert.strictEqual to expect().toBe()
    transformed = transformed.replace(
      /assert\.strictEqual\s*\(\s*([^,]+),\s*([^)]+)\)/g,
      (match, actual, expected) => {
        modified = true;
        modifications.push('Transformed assert.strictEqual to expect');
        return `expect(${actual.trim()}).toBe(${expected.trim()})`;
      }
    );

    // Transform assert.equal to expect().toBe()
    transformed = transformed.replace(
      /assert\.equal\s*\(\s*([^,]+),\s*([^)]+)\)/g,
      (match, actual, expected) => {
        modified = true;
        modifications.push('Transformed assert.equal to expect');
        return `expect(${actual.trim()}).toBe(${expected.trim()})`;
      }
    );

    // Transform assert.deepEqual to expect().toEqual()
    transformed = transformed.replace(
      /assert\.deepEqual\s*\(\s*([^,]+),\s*([^)]+)\)/g,
      (match, actual, expected) => {
        modified = true;
        modifications.push('Transformed assert.deepEqual to expect');
        return `expect(${actual.trim()}).toEqual(${expected.trim()})`;
      }
    );

    // Keep assert() as-is rather than transforming to expect
    // The assert() calls should work with window.assert
    // No transformation needed for simple assert() calls

    return { code: transformed, modified, modifications };
  }

  /**
   * Wrap test code in an executable function
   */
  wrapTestCode(code, metadata) {
    // Since we're using dynamic script injection instead of eval,
    // the code will execute in the true global scope where window.process
    // is available as just 'process'
    
    // Create a function that can be executed with proper context
    const wrapped = `
(function(context) {
  // Destructure context
  const { 
    describe, it, before, after, beforeEach, afterEach,
    expect, assert, request, express, app, transport,
    after: afterUtil, testUtils
  } = context;
  
  // Make expect and assert globally available in this execution context
  window.expect = expect;
  window.assert = assert;
  
  // Create a wrapper for the test
  const runTest = function() {
    ${code}
  };
  
  // Execute the test
  try {
    runTest();
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
})`;

    return wrapped;
  }

  /**
   * Categorize a test based on its content and transformations
   */
  categorizeTest(code, modifications) {
    // If no modifications were needed, it's a PASS
    if (!modifications || modifications.length === 0) {
      return 'PASS';
    }

    // If we made adaptations, it's ADAPTED
    if (modifications.length > 0) {
      return 'ADAPTED';
    }

    return 'PASS';
  }

  /**
   * Create a detailed transformation report
   */
  createTransformationReport(originalCode, transformedResult) {
    const report = {
      category: transformedResult.category,
      modifications: transformedResult.modifications,
      lineCount: {
        original: originalCode.split('\n').length,
        transformed: transformedResult.code.split('\n').length
      },
      requiresTransformed: transformedResult.modifications.filter(m => 
        m.includes('require')).length,
      assertionsTransformed: transformedResult.modifications.filter(m => 
        m.includes('assert')).length
    };

    return report;
  }
}

// Export for use in test harness
window.TestTransformer = TestTransformer;
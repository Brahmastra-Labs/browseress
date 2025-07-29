// Enhanced Test Loader for Express Test Harness
// Handles dynamic loading and caching of Express test files

class EnhancedTestLoader {
  constructor() {
    this.testCache = new Map();
    this.testMetadata = new Map();
    this.baseUrl = window.location.origin;
    this.testsPath = './express-tests/';
  }

  /**
   * Load a test file from the server
   * @param {string} testName - Name of the test file (e.g., 'res.json.js')
   * @returns {Promise<string>} The raw test file content
   */
  async loadTestFile(testName) {
    // Check cache first
    if (this.testCache.has(testName)) {
      console.log(`[TestLoader] Loading ${testName} from cache`);
      return this.testCache.get(testName);
    }

    try {
      console.log(`[TestLoader] Fetching ${testName} from server`);
      const url = `${this.testsPath}${testName}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load test: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      
      // Cache the content
      this.testCache.set(testName, content);
      
      // Extract metadata
      this.extractMetadata(testName, content);
      
      return content;
    } catch (error) {
      console.error(`[TestLoader] Error loading ${testName}:`, error);
      throw error;
    }
  }

  /**
   * Discover available test files
   * @returns {Promise<Array>} List of available test files
   */
  async discoverTests() {
    // In a real implementation, this would fetch from a directory listing endpoint
    // For now, we'll use a predefined list that matches our copied files
    const availableTests = [
      {
        name: 'res.json.js',
        category: 'response',
        description: 'Tests for res.json() method'
      },
      {
        name: 'res.send.js',
        category: 'response',
        description: 'Tests for res.send() method'
      },
      {
        name: 'res.status.js',
        category: 'response',
        description: 'Tests for res.status() method'
      },
      {
        name: 'app.use.js',
        category: 'application',
        description: 'Tests for app.use() middleware'
      }
    ];
    
    return availableTests;
  }

  /**
   * Extract metadata from test file content
   * @param {string} testName - Name of the test file
   * @param {string} content - Raw test file content
   */
  extractMetadata(testName, content) {
    const metadata = {
      name: testName,
      lineCount: content.split('\n').length,
      hasDescribe: content.includes('describe('),
      hasIt: content.includes('it('),
      testCount: (content.match(/it\(/g) || []).length,
      requireStatements: this.extractRequireStatements(content),
      usesFs: content.includes("require('fs')") || content.includes('fs.'),
      usesChildProcess: content.includes('child_process'),
      usesAsync: content.includes('async') || content.includes('await'),
      usesSupertest: content.includes('supertest'),
      usesAssert: content.includes('assert')
    };
    
    this.testMetadata.set(testName, metadata);
    return metadata;
  }

  /**
   * Extract require statements from code
   * @param {string} content - Test file content
   * @returns {Array} List of require statements
   */
  extractRequireStatements(content) {
    const requirePattern = /(?:var|const|let)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const requires = [];
    let match;
    
    while ((match = requirePattern.exec(content)) !== null) {
      requires.push({
        variable: match[1],
        module: match[2]
      });
    }
    
    return requires;
  }

  /**
   * Get metadata for a test file
   * @param {string} testName - Name of the test file
   * @returns {Object|null} Test metadata or null if not loaded
   */
  getTestMetadata(testName) {
    return this.testMetadata.get(testName) || null;
  }

  /**
   * Clear the test cache
   */
  clearCache() {
    this.testCache.clear();
    this.testMetadata.clear();
    console.log('[TestLoader] Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      cachedTests: this.testCache.size,
      totalSize: Array.from(this.testCache.values())
        .reduce((sum, content) => sum + content.length, 0),
      tests: Array.from(this.testCache.keys())
    };
  }

  /**
   * Preload multiple test files
   * @param {Array<string>} testNames - Array of test file names
   * @returns {Promise<Array>} Results of loading attempts
   */
  async preloadTests(testNames) {
    const results = await Promise.allSettled(
      testNames.map(name => this.loadTestFile(name))
    );
    
    return results.map((result, index) => ({
      name: testNames[index],
      success: result.status === 'fulfilled',
      error: result.reason?.message
    }));
  }
}

// Export for use in test harness
window.EnhancedTestLoader = EnhancedTestLoader;
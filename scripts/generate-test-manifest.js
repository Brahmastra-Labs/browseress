#!/usr/bin/env node
/*!
 * Test Manifest Generator
 * Scans the test directory and generates a manifest of runnable tests
 */

'use strict';

const fs = require('fs');
const path = require('path');

const testDir = path.resolve(__dirname, '../test');
const manifestPath = path.resolve(__dirname, '../examples/express-test-harness/test-manifest.json');

// Tests that are known to work with the browser test harness
// We'll expand this list as we fix more tests
const runnableTests = new Set([
  // Empty for now - we need to test each one individually
]);

// Tests we know won't work in browser (they test Node-specific features)
const browserIncompatible = new Set([
  'app.listen.js',          // Tests net.Server
  'app.listen-transport.js', // Tests our transport which is browser-specific
  'exports.js'               // Tests module.exports
]);

const manifest = [];

// Recursive function to walk directories
function walkTestDirectory(dir, relativePath = '') {
  const files = fs.readdirSync(dir);
  
  files.sort().forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip special directories
      if (file === 'node_modules' || file === '.git' || file === 'fixtures' || file === 'support') {
        return;
      }
      
      // Recursively walk subdirectories
      const newRelativePath = relativePath ? `${relativePath}/${file}` : file;
      walkTestDirectory(fullPath, newRelativePath);
    } else if (file.endsWith('.js')) {
      // Skip special test files that aren't actual tests
      if (file === 'support.js' || file.startsWith('_') || file.startsWith('.')) {
        return;
      }
      
      // Build the full test name including path
      const testName = relativePath ? `${relativePath}/${file}` : file;
      
      // Extract category and method from filename
      const parts = file.replace('.js', '').split('.');
      const category = parts[0];
      const method = parts.slice(1).join('.');
      
      // If in a subdirectory, use the directory as category prefix
      const fullCategory = relativePath ? `${relativePath}/${category}` : category;
      
      let status = 'untested';
      // Check against basename for runnable/incompatible lists
      if (runnableTests.has(file)) {
        status = 'runnable';
      } else if (browserIncompatible.has(file)) {
        status = 'browser-incompatible';
      }
      
      manifest.push({
        name: testName,
        path: relativePath,
        basename: file,
        category: fullCategory,
        description: method ? `Tests for ${fullCategory}.${method}()` : `Tests for ${fullCategory}`,
        status: status
      });
    }
  });
}

// Start the recursive walk
walkTestDirectory(testDir);

// Create directory if it doesn't exist
const manifestDir = path.dirname(manifestPath);
if (!fs.existsSync(manifestDir)) {
  fs.mkdirSync(manifestDir, { recursive: true });
}

// Write manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Test manifest generated with ${manifest.length} tests:`);
console.log(`   - ${manifest.filter(t => t.status === 'runnable').length} runnable`);
console.log(`   - ${manifest.filter(t => t.status === 'untested').length} untested`);
console.log(`   - ${manifest.filter(t => t.status === 'browser-incompatible').length} browser incompatible`);
console.log(`\nManifest written to: ${path.relative(process.cwd(), manifestPath)}`);
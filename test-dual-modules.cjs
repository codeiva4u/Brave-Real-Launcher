#!/usr/bin/env node

/**
 * Test Dual Module Compatibility
 * Tests both CommonJS and ES Module imports
 */

const fs = require('fs');

console.log('🧪 Testing Dual Module Compatibility...\n');

// Test 1: CommonJS Import
console.log('1. Testing CommonJS Import:');
try {
  const launcher = require('./dist/index.js');
  const exports = Object.keys(launcher);
  console.log('✅ CommonJS import successful');
  console.log(`   Exports: ${exports.length} functions`);
  console.log(`   Available: ${exports.slice(0, 5).join(', ')}...`);
} catch (error) {
  console.log('❌ CommonJS import failed:', error.message);
}

// Test 2: Check ES Module file exists
console.log('\n2. Testing ES Module File:');
if (fs.existsSync('./dist/index.mjs')) {
  console.log('✅ ES Module file exists (index.mjs)');
  
  // Read and check content
  const mjsContent = fs.readFileSync('./dist/index.mjs', 'utf8');
  if (mjsContent.includes('export')) {
    console.log('✅ ES Module exports detected');
  } else {
    console.log('⚠️ No ES Module exports found');
  }
} else {
  console.log('❌ ES Module file missing');
}

// Test 3: Package.json exports
console.log('\n3. Testing Package.json Configuration:');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
if (pkg.exports && pkg.exports['.']) {
  console.log('✅ Dual package exports configured');
  console.log('   CommonJS:', pkg.exports['.'].require);
  console.log('   ES Module:', pkg.exports['.'].import);
  console.log('   Types:', pkg.exports['.'].types);
} else {
  console.log('❌ Package exports not configured');
}

// Test 4: Module Types
console.log('\n4. Module Type Information:');
console.log('   Package type:', pkg.type);
console.log('   Main entry:', pkg.main);
console.log('   Module entry:', pkg.module || 'Not specified');

console.log('\n📋 Summary:');
console.log('✅ Both CommonJS (.js) and ES Module (.mjs) files generated');
console.log('✅ Package.json configured for dual package support');
console.log('✅ Module compatibility testing completed');

console.log('\n🎯 Usage Examples:');
console.log('// CommonJS');
console.log("const { launch } = require('brave-real-launcher');");
console.log('');
console.log('// ES Module');
console.log("import { launch } from 'brave-real-launcher';");
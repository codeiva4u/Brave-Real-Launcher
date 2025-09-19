#!/usr/bin/env node

/**
 * Basic test runner for CI environments
 * Provides cross-platform compatibility testing
 */

console.log('🧪 Running brave-real-launcher basic tests...\n');

// Test 1: Node.js version compatibility
console.log('📋 Test 1: Node.js compatibility');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion >= 12) {
  console.log('✅ Node.js version check passed:', nodeVersion);
} else {
  console.log('❌ Node.js version too old:', nodeVersion);
  process.exit(1);
}

// Test 2: Module loading
console.log('\n📋 Test 2: Module exports');
try {
  const launcher = require('../dist/index.js');
  const requiredExports = ['launch', 'getBravePath', 'BraveLauncher', 'XvfbManager', 'braveFinder'];
  const availableExports = Object.keys(launcher);
  
  const missing = requiredExports.filter(exp => !availableExports.includes(exp));
  if (missing.length > 0) {
    console.log('❌ Missing exports:', missing);
    process.exit(1);
  }
  
  console.log('✅ All required exports available:', requiredExports.length);
} catch (error) {
  console.log('❌ Module loading failed:', error.message);
  process.exit(1);
}

// Test 3: Platform detection
console.log('\n📋 Test 3: Platform detection');
try {
  const { getPlatform } = require('../dist/index.js');
  const platform = getPlatform();
  const supportedPlatforms = ['win32', 'darwin', 'linux', 'wsl'];
  
  if (supportedPlatforms.includes(platform)) {
    console.log('✅ Platform detection successful:', platform);
  } else {
    console.log('❌ Unsupported platform:', platform);
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Platform detection failed:', error.message);
  process.exit(1);
}

// Test 4: Browser detection (non-blocking)
console.log('\n📋 Test 4: Browser detection (optional)');
try {
  const { braveFinder, getPlatform } = require('../dist/index.js');
  const platform = getPlatform();
  
  let installations;
  if (platform === 'win32') {
    installations = braveFinder.win32();
  } else if (platform === 'darwin') {
    installations = braveFinder.darwin();
  } else if (platform === 'linux') {
    installations = braveFinder.linux();
  } else {
    installations = [];
  }
  
  console.log('✅ Browser detection completed - found:', installations.length, 'installation(s)');
  if (installations.length > 0) {
    console.log('   Primary installation:', installations[0]);
  }
} catch (error) {
  console.log('⚠️  Browser detection failed (expected in CI):', error.message);
  // Don't fail the test - this is expected in CI environments without Brave
}

// Test 5: TypeScript types
console.log('\n📋 Test 5: TypeScript definitions');
try {
  const fs = require('fs');
  const typesExist = fs.existsSync('../dist/index.d.ts');
  
  if (typesExist) {
    console.log('✅ TypeScript definitions available');
  } else {
    console.log('❌ TypeScript definitions missing');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ TypeScript definitions check failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 All basic tests passed successfully!');
console.log('📦 brave-real-launcher is ready for use!');

process.exit(0);
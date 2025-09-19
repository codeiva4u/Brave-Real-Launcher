#!/bin/bash

# Basic test runner for brave-real-launcher

echo "Running basic tests for brave-real-launcher..."

# Test build
echo "Testing build..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed"
    exit 1
fi

# Test exports
echo "Testing exports..."
node -e "
const launcher = require('./dist/index.js');
const requiredExports = ['launch', 'getBravePath', 'BraveLauncher', 'XvfbManager', 'braveFinder'];
const availableExports = Object.keys(launcher);
const missing = requiredExports.filter(exp => !availableExports.includes(exp));
if (missing.length > 0) {
    console.error('Missing exports:', missing);
    process.exit(1);
}
console.log('All required exports available:', requiredExports);
"

# Test browser detection
echo "Testing browser detection..."
node -e "
const { braveFinder, getPlatform } = require('./dist/index.js');
const platform = getPlatform();
console.log('Platform:', platform);

try {
    let installations;
    if (platform === 'win32') {
        installations = braveFinder.win32();
    } else if (platform === 'darwin') {
        installations = braveFinder.darwin();
    } else {
        installations = braveFinder.linux();
    }
    console.log('Found', installations.length, 'Brave installations');
    if (installations.length > 0) {
        console.log('Primary installation:', installations[0]);
    }
} catch (error) {
    console.log('Browser detection test completed (expected if Brave not installed):', error.message);
}
"

# Test binary
echo "Testing binary executable..."
node bin/print-brave-path.cjs
if [ $? -ne 0 ]; then
    echo "Binary test failed"
    exit 1
fi

echo "All basic tests passed!"
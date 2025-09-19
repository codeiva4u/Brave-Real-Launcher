#!/usr/bin/env pwsh

# Basic test runner for brave-real-launcher (PowerShell version)

Write-Host "Running basic tests for brave-real-launcher..." -ForegroundColor Green

# Test build
Write-Host "Testing build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

# Test exports
Write-Host "Testing exports..." -ForegroundColor Yellow
$testExports = @'
const launcher = require('./dist/index.js');
const requiredExports = ['launch', 'getBravePath', 'BraveLauncher', 'XvfbManager', 'braveFinder'];
const availableExports = Object.keys(launcher);
const missing = requiredExports.filter(exp => !availableExports.includes(exp));
if (missing.length > 0) {
    console.error('Missing exports:', missing);
    process.exit(1);
}
console.log('All required exports available:', requiredExports);
'@

node -e $testExports
if ($LASTEXITCODE -ne 0) {
    Write-Error "Export test failed"
    exit 1
}

# Test browser detection
Write-Host "Testing browser detection..." -ForegroundColor Yellow
$testDetection = @'
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
'@

node -e $testDetection
if ($LASTEXITCODE -ne 0) {
    Write-Error "Detection test failed"
    exit 1
}

# Test binary
Write-Host "Testing binary executable..." -ForegroundColor Yellow
node bin/print-brave-path.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Binary test failed"
    exit 1
}

Write-Host "All basic tests passed!" -ForegroundColor Green
#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Brave Real Launcher
 * Tests all browser functionality across different modes and configurations
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}[TEST]${colors.reset} ${msg}`),
  result: (msg) => console.log(`${colors.magenta}[RESULT]${colors.reset} ${msg}`)
};

class BraveTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    this.launcher = null;
    this.activeBraves = [];
  }

  async importLauncher() {
    try {
      // Dynamic import for ES module from CommonJS (Windows compatible)
      const modulePath = path.resolve('./dist/index.js');
      const fileUrl = `file:///${modulePath.replace(/\\/g, '/')}`;
      const module = await import(fileUrl);
      this.launcher = module;
      log.success('Brave launcher imported successfully');
      return true;
    } catch (error) {
      log.error(`Failed to import launcher: ${error.message}`);
      return false;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;
    log.test(`Running: ${testName}`);
    
    try {
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.passed++;
      log.success(`✅ ${testName} (${duration}ms)`);
    } catch (error) {
      this.testResults.failed++;
      log.error(`❌ ${testName}: ${error.message}`);
      console.error(error.stack);
    }
  }

  async skipTest(testName, reason) {
    this.testResults.total++;
    this.testResults.skipped++;
    log.warn(`⏭️  Skipped: ${testName} (${reason})`);
  }


  // Test 2: Basic Brave launch and kill
  async testBasicLaunch() {
    log.info('Launching Brave with basic configuration...');
    
    const brave = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>Brave Real Launcher Test</h1>',
      logLevel: 'silent',
      chromeFlags: ['--no-first-run', '--no-default-browser-check']
    });

    this.activeBraves.push(brave);

    // Verify launch properties
    if (!brave.pid || brave.pid <= 0) {
      throw new Error('Invalid process ID');
    }

    if (!brave.port || brave.port <= 0) {
      throw new Error('Invalid debug port');
    }

    if (!brave.process) {
      throw new Error('Process object not available');
    }

    log.info(`Brave launched - PID: ${brave.pid}, Port: ${brave.port}`);

    // Wait for a moment to ensure it's running
    await this.delay(2000);

    // Kill the process
    await brave.kill();
    log.info('Brave process killed successfully');
  }

  // Test 3: Headless mode
  async testHeadlessMode() {
    log.info('Testing headless mode...');
    
    const brave = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>Headless Test</h1>',
      headless: true,
      logLevel: 'silent',
      chromeFlags: ['--no-first-run']
    });

    this.activeBraves.push(brave);

    log.info(`Headless Brave launched - PID: ${brave.pid}, Port: ${brave.port}`);
    
    // Test if it's actually running
    await this.delay(2000);
    
    if (!brave.process || brave.process.killed) {
      throw new Error('Headless Brave process died unexpectedly');
    }

    await brave.kill();
    log.info('Headless Brave killed successfully');
  }

  // Test 4: Custom flags and preferences
  async testCustomConfiguration() {
    log.info('Testing custom flags and preferences...');
    
    const customFlags = [
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'
    ];

    const customPrefs = {
      'profile.default_content_setting_values.notifications': 2,
      'profile.managed_default_content_settings.images': 2
    };

    const brave = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>Custom Config Test</h1>',
      chromeFlags: customFlags,
      prefs: customPrefs,
      logLevel: 'silent'
    });

    this.activeBraves.push(brave);
    
    log.info(`Custom configured Brave launched - PID: ${brave.pid}`);
    
    await this.delay(2000);
    await brave.kill();
    log.info('Custom configured Brave killed successfully');
  }

  // Test 5: Port management
  async testPortManagement() {
    log.info('Testing port management...');
    
    // Launch first instance
    const brave1 = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>Port Test 1</h1>',
      logLevel: 'silent',
      chromeFlags: ['--no-first-run']
    });

    this.activeBraves.push(brave1);
    const port1 = brave1.port;
    log.info(`First Brave instance on port: ${port1}`);

    // Launch second instance (should get different port)
    const brave2 = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>Port Test 2</h1>',
      logLevel: 'silent',
      chromeFlags: ['--no-first-run']
    });

    this.activeBraves.push(brave2);
    const port2 = brave2.port;
    log.info(`Second Brave instance on port: ${port2}`);

    if (port1 === port2) {
      throw new Error('Both instances got the same port');
    }

    await this.delay(2000);
    
    await brave1.kill();
    await brave2.kill();
    log.info('Both Brave instances killed successfully');
  }

  // Test 6: API Validation & Error Boundaries
  async testAPIValidation() {
    log.info('Testing API validation and error boundaries...');
    
    // Test 1: Validate that getInstallations works
    const installations = this.launcher.Launcher.getInstallations();
    if (!Array.isArray(installations)) {
      throw new Error('getInstallations should return an array');
    }
    if (installations.length === 0) {
      throw new Error('No Brave installations found - this should not happen since we already verified installation');
    }
    log.info(`✓ Installation detection working: ${installations.length} installation(s) found`);
    
    // Test 2: Validate defaultFlags method
    const defaultFlags = this.launcher.Launcher.defaultFlags();
    if (!Array.isArray(defaultFlags)) {
      throw new Error('defaultFlags should return an array');
    }
    if (defaultFlags.length === 0) {
      throw new Error('Default flags should not be empty');
    }
    log.info(`✓ Default flags working: ${defaultFlags.length} flags available`);
    
    // Test 3: Port availability check
    let brave1 = null;
    try {
      // Launch a browser and check port assignment
      brave1 = await this.launcher.launch({
        logLevel: 'silent',
        chromeFlags: ['--no-first-run']
      });
      
      const assignedPort = brave1.port;
      if (!assignedPort || assignedPort <= 0) {
        throw new Error('Invalid port assignment');
      }
      
      log.info(`✓ Port assignment working: assigned port ${assignedPort}`);
      
      // Test port connectivity (basic check)
      if (assignedPort < 1024 || assignedPort > 65535) {
        throw new Error(`Port ${assignedPort} is outside valid range`);
      }
      
    } finally {
      if (brave1) {
        await brave1.kill();
        log.info('Cleaned up test browser');
      }
    }
    
    // Test 4: Validate launch options are processed correctly
    const testFlags = ['--test-flag-1', '--test-flag-2'];
    let brave2 = null;
    try {
      brave2 = await this.launcher.launch({
        logLevel: 'silent',
        chromeFlags: [...testFlags, '--no-first-run'],
        startingUrl: 'data:text/html,<h1>API Test</h1>'
      });
      
      if (!brave2.pid || !brave2.port || !brave2.process) {
        throw new Error('Launch result missing required properties');
      }
      
      log.info(`✓ Launch options processing working: PID ${brave2.pid}`);
      
    } finally {
      if (brave2) {
        await brave2.kill();
      }
    }
    
    log.info('All API validation tests completed successfully');
  }

  // Test 7: Remote debugging pipes (if supported)
  async testRemoteDebuggingPipes() {
    log.info('Testing remote debugging pipes...');
    
    const brave = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>Pipes Test</h1>',
      chromeFlags: ['--remote-debugging-pipe', '--no-first-run'],
      logLevel: 'silent'
    });

    this.activeBraves.push(brave);
    
    if (!brave.remoteDebuggingPipes) {
      throw new Error('Remote debugging pipes not available');
    }

    if (!brave.remoteDebuggingPipes.incoming || !brave.remoteDebuggingPipes.outgoing) {
      throw new Error('Invalid pipe streams');
    }

    log.info('Remote debugging pipes are available');
    
    await this.delay(2000);
    await brave.kill();
    log.info('Remote debugging pipes test completed');
  }

  // Test 8: Multiple instances management
  async testMultipleInstances() {
    log.info('Testing multiple instances management...');
    
    const instances = [];
    const instanceCount = 3;

    // Launch multiple instances
    for (let i = 0; i < instanceCount; i++) {
      const brave = await this.launcher.launch({
        startingUrl: `data:text/html,<h1>Instance ${i + 1}</h1>`,
        logLevel: 'silent',
        chromeFlags: ['--no-first-run']
      });
      
      instances.push(brave);
      this.activeBraves.push(brave);
      log.info(`Instance ${i + 1} launched - PID: ${brave.pid}, Port: ${brave.port}`);
    }

    // Verify all are running
    await this.delay(3000);
    
    for (let i = 0; i < instances.length; i++) {
      const brave = instances[i];
      if (!brave.process || brave.process.killed) {
        throw new Error(`Instance ${i + 1} died unexpectedly`);
      }
    }

    // Kill all instances
    for (let i = 0; i < instances.length; i++) {
      await instances[i].kill();
      log.info(`Instance ${i + 1} killed`);
    }
  }

  // Test 9: Kill all functionality
  async testKillAll() {
    log.info('Testing killAll functionality...');
    
    // Launch a few instances
    const brave1 = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>KillAll Test 1</h1>',
      logLevel: 'silent',
      chromeFlags: ['--no-first-run']
    });

    const brave2 = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>KillAll Test 2</h1>',
      logLevel: 'silent',
      chromeFlags: ['--no-first-run']
    });

    this.activeBraves.push(brave1, brave2);
    
    log.info(`Launched 2 instances for killAll test`);
    await this.delay(2000);

    // Kill all
    const errors = await this.launcher.killAll();
    
    if (errors.length > 0) {
      throw new Error(`killAll returned ${errors.length} errors`);
    }

    log.info('killAll executed successfully');
  }

  // Test 10: Performance test
  async testPerformance() {
    log.info('Running performance test...');
    
    const startTime = Date.now();
    
    const brave = await this.launcher.launch({
      startingUrl: 'data:text/html,<h1>Performance Test</h1>',
      logLevel: 'silent',
      chromeFlags: ['--no-first-run']
    });

    const launchTime = Date.now() - startTime;
    this.activeBraves.push(brave);
    
    log.info(`Launch time: ${launchTime}ms`);
    
    if (launchTime > 30000) { // 30 seconds
      log.warn(`Launch time is high: ${launchTime}ms`);
    }

    const killStartTime = Date.now();
    await brave.kill();
    const killTime = Date.now() - killStartTime;
    
    log.info(`Kill time: ${killTime}ms`);
    
    if (killTime > 10000) { // 10 seconds
      log.warn(`Kill time is high: ${killTime}ms`);
    }
  }

  // Cleanup function
  async cleanup() {
    log.info('Cleaning up any remaining processes...');
    
    for (const brave of this.activeBraves) {
      try {
        if (brave.process && !brave.process.killed) {
          await brave.kill();
        }
      } catch (error) {
        log.warn(`Failed to cleanup process ${brave.pid}: ${error.message}`);
      }
    }
    
    this.activeBraves = [];
    
    // Also try killAll as final cleanup
    try {
      await this.launcher.killAll();
    } catch (error) {
      log.warn(`Final killAll failed: ${error.message}`);
    }
  }

  // Main test runner
  async runAllTests() {
    console.log(`${colors.bold}${colors.cyan}🚀 Brave Real Launcher Test Suite${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
    
    const overallStartTime = Date.now();

    try {
      // Import the launcher
      const imported = await this.importLauncher();
      if (!imported) {
        log.error('Failed to import launcher. Make sure to run "npm run build" first.');
        return;
      }

      // Run all tests
      await this.runTest('Brave Installations Check', () => this.testBraveInstallations());
      await this.runTest('Basic Launch & Kill', () => this.testBasicLaunch());
      await this.runTest('Headless Mode', () => this.testHeadlessMode());
      await this.runTest('Custom Configuration', () => this.testCustomConfiguration());
      await this.runTest('Port Management', () => this.testPortManagement());
      await this.runTest('API Validation', () => this.testAPIValidation());
      await this.runTest('Remote Debugging Pipes', () => this.testRemoteDebuggingPipes());
      await this.runTest('Multiple Instances', () => this.testMultipleInstances());
      await this.runTest('Kill All Functionality', () => this.testKillAll());
      await this.runTest('Performance Test', () => this.testPerformance());

    } catch (error) {
      log.error(`Test suite failed: ${error.message}`);
    } finally {
      await this.cleanup();
    }

    const overallDuration = Date.now() - overallStartTime;

    // Print results
    console.log(`\n${colors.bold}${colors.cyan}📊 Test Results${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(30)}${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${this.testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${this.testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}⏭️  Skipped: ${this.testResults.skipped}${colors.reset}`);
    console.log(`${colors.blue}📋 Total: ${this.testResults.total}${colors.reset}`);
    console.log(`${colors.magenta}⏱️  Duration: ${overallDuration}ms${colors.reset}`);
    
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    console.log(`${colors.cyan}📈 Success Rate: ${successRate}%${colors.reset}\n`);

    if (this.testResults.failed > 0) {
      console.log(`${colors.red}${colors.bold}❌ Some tests failed!${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${colors.green}${colors.bold}🎉 All tests passed!${colors.reset}`);
      process.exit(0);
    }
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  if (global.testSuite) {
    await global.testSuite.cleanup();
  }
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  if (global.testSuite) {
    await global.testSuite.cleanup();
  }
  process.exit(1);
});

// Run the test suite
async function main() {
  const testSuite = new BraveTestSuite();
  global.testSuite = testSuite; // For cleanup in signal handlers
  await testSuite.runAllTests();
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
});

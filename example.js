#!/usr/bin/env node

/**
 * Example usage of Brave Real Launcher
 * This demonstrates basic functionality and key features
 */

import * as BraveLauncher from './dist/index.js';

async function main() {
  try {
    console.log('🚀 Brave Real Launcher Example');
    console.log('==============================\n');

    // Check available Brave installations
    console.log('📍 Checking for Brave installations...');
    const installations = BraveLauncher.Launcher.getInstallations();
    console.log('Found installations:', installations);

    if (installations.length === 0) {
      console.log('❌ No Brave installations found. Please install Brave Browser first.');
      process.exit(1);
    }

    console.log('✅ Using Brave from:', installations[0]);
    console.log();

    // Launch Brave
    console.log('🌟 Launching Brave Browser...');
    const brave = await BraveLauncher.launch({
      startingUrl: 'https://brave.com',
      headless: process.env.HEADLESS === 'true' || process.argv.includes('--headless'),
      logLevel: 'info',
      chromeFlags: ['--disable-web-security'], // For demo purposes
    });

    console.log(`🎯 Brave launched successfully!`);
    console.log(`   - PID: ${brave.pid}`);
    console.log(`   - Debug Port: ${brave.port}`);
    console.log(`   - Xvfb Display: ${brave.xvfb ? brave.xvfb.getDisplayString() : 'Not used'}`);
    console.log();

    // Keep running for a few seconds
    console.log('⏱️  Running for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Clean up
    console.log('🧹 Cleaning up...');
    await brave.kill();
    console.log('✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  process.exit(0);
});

main().catch(console.error);

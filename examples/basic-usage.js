#!/usr/bin/env node

/**
 * Basic usage examples for brave-real-launcher
 */

const { launch, getBravePath, XvfbManager, detectDesktopEnvironment, getPlatform } = require('../dist/index.js');

async function basicExample() {
  console.log('=== Basic Example ===');
  
  try {
    const bravePath = getBravePath();
    console.log('Found Brave at:', bravePath);
    
    // Launch Brave in headless mode
    const brave = await launch({
      braveFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
      logLevel: 'info'
    });
    
    console.log('Brave launched successfully!');
    console.log('PID:', brave.pid);
    console.log('Debug port:', brave.port);
    
    // Close after 3 seconds
    setTimeout(() => {
      console.log('Closing Brave...');
      brave.kill();
    }, 3000);
    
  } catch (error) {
    console.error('Error in basic example:', error.message);
  }
}

async function xvfbExample() {
  console.log('\n=== Xvfb Example (Linux only) ===');
  
  if (getPlatform() !== 'linux') {
    console.log('Xvfb is only supported on Linux, skipping...');
    return;
  }
  
  try {
    const xvfb = new XvfbManager({
      display: ':99',
      width: 1920,
      height: 1080
    });
    
    await xvfb.start();
    console.log('Xvfb started successfully');
    
    // Launch Brave using the virtual display
    const brave = await launch({
      enableXvfb: true,
      braveFlags: ['--disable-gpu', '--no-sandbox'],
      logLevel: 'info'
    });
    
    console.log('Brave launched with Xvfb!');
    
    setTimeout(async () => {
      brave.kill();
      await xvfb.stop();
      console.log('Brave and Xvfb stopped');
    }, 3000);
    
  } catch (error) {
    console.error('Error in Xvfb example:', error.message);
  }
}

async function autoDetectionExample() {
  console.log('\n=== Auto-Detection Example ===');
  
  const platform = getPlatform();
  const environment = detectDesktopEnvironment();
  
  console.log('Platform:', platform);
  console.log('Desktop environment:', environment);
  
  try {
    const brave = await launch({
      launchMode: 'auto', // Automatically detects best mode
      logLevel: 'verbose'
    });
    
    console.log('Brave launched in auto-detected mode');
    console.log('Mode used:', environment);
    
    setTimeout(() => {
      brave.kill();
    }, 3000);
    
  } catch (error) {
    console.error('Error in auto-detection example:', error.message);
  }
}

async function customFlagsExample() {
  console.log('\n=== Custom Flags Example ===');
  
  try {
    const brave = await launch({
      braveFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1280,720',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox'
      ],
      startingUrl: 'https://example.com',
      userDataDir: false, // Use temporary directory
      logLevel: 'verbose'
    });
    
    console.log('Brave launched with custom flags');
    console.log('Starting URL: https://example.com');
    
    setTimeout(() => {
      brave.kill();
    }, 5000);
    
  } catch (error) {
    console.error('Error in custom flags example:', error.message);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🦁 Brave Real Launcher Examples\n');
  
  await basicExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await xvfbExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await autoDetectionExample();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await customFlagsExample();
  
  console.log('\n✅ All examples completed!');
}

if (require.main === module) {
  runAllExamples().catch(console.error);
}
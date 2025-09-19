#!/usr/bin/env node

/**
 * Utility to rename JS files to CJS and copy to main dist folder
 */

const fs = require('fs');
const path = require('path');

function copyAndRenameCJS() {
  const cjsDir = path.join(__dirname, '..', 'dist', 'cjs');
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(cjsDir)) {
    console.log('❌ CJS directory not found');
    return;
  }
  
  // Get all JS files from CJS directory
  const files = fs.readdirSync(cjsDir).filter(file => file.endsWith('.js'));
  
  for (const file of files) {
    const srcPath = path.join(cjsDir, file);
    const cjsFileName = file.replace('.js', '.cjs');
    const destPath = path.join(distDir, cjsFileName);
    
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${file} -> ${cjsFileName}`);
    } catch (err) {
      console.error(`❌ Failed to copy ${file}:`, err.message);
    }
  }
  
  // Clean up CJS directory
  fs.rmSync(cjsDir, { recursive: true, force: true });
  console.log('🧹 Cleaned up temporary CJS directory');
}

copyAndRenameCJS();

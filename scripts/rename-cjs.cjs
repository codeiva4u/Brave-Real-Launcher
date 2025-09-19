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
      // Read the file content
      let content = fs.readFileSync(srcPath, 'utf8');
      
      // Fix the import/require references to use .cjs extensions
      content = content.replace(/require\("\.\/([^"]+)\.js"\)/g, 'require("./$1.cjs")');
      content = content.replace(/require\('\.\/([^']+)\.js'\)/g, "require('./$1.cjs')");
      
      // Write the corrected content
      fs.writeFileSync(destPath, content);
      console.log(`✅ Copied and fixed ${file} -> ${cjsFileName}`);
    } catch (err) {
      console.error(`❌ Failed to process ${file}:`, err.message);
    }
  }
  
  // Clean up CJS directory
  fs.rmSync(cjsDir, { recursive: true, force: true });
  console.log('🧹 Cleaned up temporary CJS directory');
}

copyAndRenameCJS();

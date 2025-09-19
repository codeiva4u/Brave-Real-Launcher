#!/usr/bin/env node

/**
 * ESM Build Post-Processing Script
 * Converts dist-esm to proper ES modules with .mjs extensions
 */

const fs = require('fs');
const path = require('path');

const distEsmDir = path.resolve(__dirname, '../dist-esm');
const distDir = path.resolve(__dirname, '../dist');

console.log('🔄 Processing ESM build...');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Function to rename files and fix imports
function processFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) {
    console.log('⚠️ ESM dist directory not found, skipping...');
    return;
  }

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processFiles(fullPath, baseDir);
    } else if (file.endsWith('.js')) {
      // Read file content
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix import/export statements to use .mjs extensions
      // Step 1: Replace .js extensions with .mjs
      content = content.replace(/from ['"]\.\/([^'"]+)\.js['"]/g, "from './$1.mjs'");
      
      // Step 2: Add .mjs to imports without any extension
      content = content.replace(/from ['"]\.\/([^'"]*?)(?<!\.mjs|\.js)['"]/g, "from './$1.mjs'");
      
      // Step 3: Fix any potential double .mjs.mjs extensions
      content = content.replace(/\.mjs\.mjs/g, '.mjs');
      
      // Keep CommonJS requires as .js
      content = content.replace(/require\(['"]\.\/([^'"]+)\.js['"]\)/g, "require('./$1.js')");
      
      // Calculate relative path for output
      const relativePath = path.relative(baseDir, fullPath);
      const outputPath = path.join(distDir, relativePath.replace('.js', '.mjs'));
      const outputDir = path.dirname(outputPath);
      
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write the .mjs file
      fs.writeFileSync(outputPath, content);
      console.log(`✅ Created ${path.relative(process.cwd(), outputPath)}`);
    }
  });
}

try {
  processFiles(distEsmDir);
  
  // Create main index.mjs
  const indexMjsPath = path.join(distDir, 'index.mjs');
  if (fs.existsSync(indexMjsPath)) {
    console.log('✅ ESM build completed successfully!');
    
    // Clean up temporary directory
    if (fs.existsSync(distEsmDir)) {
      fs.rmSync(distEsmDir, { recursive: true, force: true });
      console.log('🗑️ Cleaned up temporary ESM directory');
    }
  } else {
    console.log('⚠️ index.mjs not created, something went wrong');
  }
  
} catch (error) {
  console.error('❌ ESM build failed:', error.message);
  process.exit(1);
}
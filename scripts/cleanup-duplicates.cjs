#!/usr/bin/env node

/**
 * Cleanup Duplicate Chrome Files
 * Removes any chrome-chrome-*.ts files that may cause build issues
 */

const fs = require('fs');
const path = require('path');

class DuplicateCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.srcDir = path.join(this.projectRoot, 'src');
  }

  async run() {
    console.log('🧹 Starting duplicate chrome files cleanup...\n');

    try {
      await this.cleanupSrcDirectory();
      await this.cleanupRootDirectory();
      
      console.log('\n✅ Cleanup completed successfully!');
      return true;
      
    } catch (error) {
      console.error('\n❌ Cleanup failed:', error.message);
      return false;
    }
  }

  async cleanupSrcDirectory() {
    console.log('📁 Cleaning src directory...');

    if (!fs.existsSync(this.srcDir)) {
      console.log('  ℹ️ src directory does not exist');
      return;
    }

    const files = fs.readdirSync(this.srcDir);
    let cleanedCount = 0;

    files.forEach(file => {
      // Remove chrome-chrome-* files
      if (file.startsWith('chrome-chrome-') && (file.endsWith('.ts') || file.endsWith('.js'))) {
        const fullPath = path.join(this.srcDir, file);
        try {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed: ${file}`);
          cleanedCount++;
        } catch (e) {
          console.log(`  ⚠️ Could not remove ${file}: ${e.message}`);
        }
      }
    });

    if (cleanedCount === 0) {
      console.log('  ✅ No duplicate files found in src/');
    } else {
      console.log(`  ✅ Removed ${cleanedCount} duplicate files from src/`);
    }
  }

  async cleanupRootDirectory() {
    console.log('📁 Cleaning root directory...');

    const rootFiles = fs.readdirSync(this.projectRoot);
    let cleanedCount = 0;

    rootFiles.forEach(file => {
      // Remove chrome-launcher reference files (optional)
      if (file.startsWith('chrome-launcher-') && 
          (file.endsWith('.json') || file.endsWith('.md') || file.endsWith('.txt'))) {
        
        // Skip if it's needed for dependency management
        if (file === 'chrome-launcher-package.json') {
          return;
        }

        const fullPath = path.join(this.projectRoot, file);
        try {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed reference file: ${file}`);
          cleanedCount++;
        } catch (e) {
          console.log(`  ⚠️ Could not remove ${file}: ${e.message}`);
        }
      }
    });

    if (cleanedCount === 0) {
      console.log('  ✅ No reference files to clean in root/');
    } else {
      console.log(`  ✅ Removed ${cleanedCount} reference files from root/`);
    }
  }

  // Static method for use in other scripts
  static async cleanupDuplicates() {
    const cleanup = new DuplicateCleanup();
    return await cleanup.run();
  }
}

// CLI interface
if (require.main === module) {
  const cleanup = new DuplicateCleanup();
  cleanup.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}

module.exports = DuplicateCleanup;
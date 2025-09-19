#!/usr/bin/env node

/**
 * Version Increment Utility
 * Smart version management for brave-real-launcher
 * Supports auto-increment with chrome-launcher synchronization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
  }

  /**
   * Get current version from package.json
   * @returns {string} Current version
   */
  getCurrentVersion() {
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json not found');
    }
    
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    return packageJson.version;
  }

  /**
   * Get chrome-launcher version from npm
   * @returns {string} Chrome-launcher version
   */
  getChromeVersion() {
    try {
      return execSync('npm view chrome-launcher version', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.warn('Could not fetch chrome-launcher version, using fallback logic');
      return null;
    }
  }

  /**
   * Parse version string into components
   * @param {string} version - Version string (e.g., "1.2.3")
   * @returns {object} Version components
   */
  parseVersion(version) {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
      original: version
    };
  }

  /**
   * Increment version based on strategy
   * @param {string} currentVersion - Current version
   * @param {string} strategy - Increment strategy: 'patch', 'minor', 'major', 'auto'
   * @param {string} chromeVersion - Chrome-launcher version (for sync comparison)
   * @returns {string} New incremented version
   */
  incrementVersion(currentVersion, strategy = 'auto', chromeVersion = null) {
    const current = this.parseVersion(currentVersion);
    const chrome = chromeVersion ? this.parseVersion(chromeVersion) : null;

    let newVersion;

    switch (strategy) {
      case 'major':
        newVersion = `${current.major + 1}.0.0`;
        break;
        
      case 'minor':
        newVersion = `${current.major}.${current.minor + 1}.0`;
        break;
        
      case 'patch':
        newVersion = `${current.major}.${current.minor}.${current.patch + 1}`;
        break;
        
      case 'auto':
      default:
        newVersion = this.autoIncrementStrategy(current, chrome);
        break;
    }

    console.log(`📦 Version increment: ${currentVersion} → ${newVersion}`);
    return newVersion;
  }

  /**
   * Auto-increment strategy based on chrome-launcher comparison
   * @param {object} current - Current version object  
   * @param {object} chrome - Chrome-launcher version object
   * @returns {string} New version
   */
  autoIncrementStrategy(current, chrome) {
    if (!chrome) {
      // If chrome version unavailable, default to patch increment
      return `${current.major}.${current.minor}.${current.patch + 1}`;
    }

    // Compare with chrome-launcher version
    if (chrome.major > current.major) {
      // Major version behind chrome-launcher
      console.log(`🚀 Major version sync: Chrome ${chrome.original} > Current ${current.original}`);
      return `${chrome.major}.${chrome.minor}.0`;
      
    } else if (chrome.major === current.major && chrome.minor > current.minor) {
      // Minor version behind chrome-launcher
      console.log(`🔄 Minor version sync: Chrome ${chrome.original} > Current ${current.original}`);
      return `${current.major}.${chrome.minor}.0`;
      
    } else if (chrome.major === current.major && chrome.minor === current.minor) {
      // Same major.minor as chrome-launcher
      if (chrome.patch > current.patch) {
        // Patch version behind chrome-launcher
        console.log(`🔧 Patch version sync: Chrome ${chrome.original} > Current ${current.original}`);
        return `${current.major}.${current.minor}.${chrome.patch}`;
      } else {
        // Same or ahead of chrome-launcher - increment patch for brave-specific updates
        console.log(`📈 Patch increment: Keeping ahead of Chrome ${chrome.original}`);
        return `${current.major}.${current.minor}.${current.patch + 1}`;
      }
      
    } else {
      // Ahead of chrome-launcher - regular patch increment
      console.log(`🎯 Regular patch increment: Current ${current.original} >= Chrome ${chrome.original}`);
      return `${current.major}.${current.minor}.${current.patch + 1}`;
    }
  }

  /**
   * Update package.json with new version
   * @param {string} newVersion - New version to set
   * @returns {boolean} Success status
   */
  updatePackageVersion(newVersion) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const oldVersion = packageJson.version;
      
      packageJson.version = newVersion;
      
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      console.log(`✅ package.json updated: ${oldVersion} → ${newVersion}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to update package.json:', error.message);
      return false;
    }
  }

  /**
   * Check if version should be incremented
   * @param {object} options - Check options
   * @returns {object} Check result
   */
  shouldIncrement(options = {}) {
    const currentVersion = this.getCurrentVersion();
    const chromeVersion = this.getChromeVersion();
    const forceIncrement = options.force || false;
    const strategy = options.strategy || 'auto';

    console.log(`🔍 Version Check:`);
    console.log(`  Current: ${currentVersion}`);
    console.log(`  Chrome:  ${chromeVersion || 'N/A'}`);
    console.log(`  Force:   ${forceIncrement}`);

    // Always increment in these cases:
    const shouldIncrement = 
      forceIncrement ||                                    // Force flag
      !chromeVersion ||                                   // Chrome version unavailable
      this.versionsAreDifferent(currentVersion, chromeVersion) || // Versions differ
      strategy === 'patch' ||                             // Explicit patch increment
      strategy === 'minor' ||                             // Explicit minor increment  
      strategy === 'major';                               // Explicit major increment

    return {
      should: shouldIncrement,
      current: currentVersion,
      chrome: chromeVersion,
      reason: this.getIncrementReason(currentVersion, chromeVersion, forceIncrement, strategy)
    };
  }

  /**
   * Check if versions are different enough to warrant increment
   * @param {string} current - Current version
   * @param {string} chrome - Chrome version
   * @returns {boolean} Whether versions differ significantly
   */
  versionsAreDifferent(current, chrome) {
    if (!chrome) return true;
    
    const curr = this.parseVersion(current);
    const chr = this.parseVersion(chrome);
    
    // Consider different if major or minor versions differ
    return (curr.major !== chr.major) || (curr.minor !== chr.minor);
  }

  /**
   * Get reason for increment decision
   * @param {string} current - Current version
   * @param {string} chrome - Chrome version  
   * @param {boolean} force - Force flag
   * @param {string} strategy - Strategy
   * @returns {string} Reason description
   */
  getIncrementReason(current, chrome, force, strategy) {
    if (force) return 'Force increment requested';
    if (!chrome) return 'Chrome-launcher version unavailable';
    if (strategy !== 'auto') return `Explicit ${strategy} increment requested`;
    if (this.versionsAreDifferent(current, chrome)) return 'Version sync with chrome-launcher';
    return 'Regular patch increment for continuous updates';
  }

  /**
   * Main execution method
   * @param {object} options - Execution options
   */
  async run(options = {}) {
    console.log('🚀 Version Management Starting...\n');

    try {
      const check = this.shouldIncrement(options);
      
      if (!check.should && !options.dryRun) {
        console.log('ℹ️ No version increment needed');
        return {
          success: true,
          incremented: false,
          version: check.current,
          reason: 'No increment needed'
        };
      }

      const newVersion = this.incrementVersion(
        check.current, 
        options.strategy || 'auto', 
        check.chrome
      );

      if (options.dryRun) {
        console.log(`\n🧪 DRY RUN - Would increment: ${check.current} → ${newVersion}`);
        console.log(`📋 Reason: ${check.reason}`);
        return {
          success: true,
          incremented: false,
          version: newVersion,
          reason: 'Dry run completed'
        };
      }

      // Update package.json
      const updateSuccess = this.updatePackageVersion(newVersion);
      
      if (updateSuccess) {
        console.log(`\n🎉 Version successfully incremented!`);
        console.log(`📦 New version: ${newVersion}`);
        console.log(`📋 Reason: ${check.reason}`);
        
        return {
          success: true,
          incremented: true,
          oldVersion: check.current,
          newVersion: newVersion,
          chromeVersion: check.chrome,
          reason: check.reason
        };
      } else {
        throw new Error('Failed to update package.json');
      }

    } catch (error) {
      console.error('\n❌ Version management failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  args.forEach(arg => {
    if (arg === '--force') options.force = true;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg.startsWith('--strategy=')) options.strategy = arg.split('=')[1];
  });

  const versionManager = new VersionManager();
  versionManager.run(options).then(result => {
    if (!result.success) {
      process.exit(1);
    }
  }).catch(console.error);
}

module.exports = VersionManager;
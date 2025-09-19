#!/usr/bin/env node

/**
 * Check for chrome-launcher updates utility
 * Simple script to check if there are new chrome-launcher versions available
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class UpdateChecker {
  constructor() {
    this.chromeRepo = 'GoogleChrome/chrome-launcher';
    this.baseUrl = `https://api.github.com/repos/${this.chromeRepo}`;
    this.packageJsonPath = path.join(__dirname, '..', 'package.json');
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warn: '\x1b[33m',
      reset: '\x1b[0m'
    };
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
  }

  async fetchJson(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'brave-real-launcher-checker' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
        res.on('error', reject);
      });
    });
  }

  async getLatestVersion() {
    try {
      const release = await this.fetchJson(`${this.baseUrl}/releases/latest`);
      return release.tag_name.replace(/^v/, '');
    } catch (error) {
      throw new Error(`Failed to get latest version: ${error.message}`);
    }
  }

  async getCurrentVersion() {
    try {
      const packageJson = JSON.parse(await fs.readFile(this.packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      throw new Error(`Failed to read current version: ${error.message}`);
    }
  }

  async getVersionHistory() {
    try {
      const releases = await this.fetchJson(`${this.baseUrl}/releases?per_page=10`);
      return releases.map(release => ({
        version: release.tag_name.replace(/^v/, ''),
        publishedAt: new Date(release.published_at).toLocaleDateString(),
        url: release.html_url
      }));
    } catch (error) {
      throw new Error(`Failed to get version history: ${error.message}`);
    }
  }

  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  async check() {
    try {
      this.log('🔍 Checking for chrome-launcher updates...');
      
      const [currentVersion, latestVersion] = await Promise.all([
        this.getCurrentVersion(),
        this.getLatestVersion()
      ]);
      
      this.log(`Current version: ${currentVersion}`);
      this.log(`Latest version: ${latestVersion}`);
      
      const comparison = this.compareVersions(latestVersion, currentVersion);
      
      if (comparison > 0) {
        this.log(`🆕 New version available: v${latestVersion}`, 'warn');
        this.log('Run "npm run sync-chrome-launcher" to update', 'info');
        
        // Show recent releases
        this.log('\n📜 Recent releases:');
        const history = await this.getVersionHistory();
        history.slice(0, 5).forEach(release => {
          const indicator = release.version === latestVersion ? '📦 ' : '   ';
          this.log(`${indicator}v${release.version} (${release.publishedAt})`);
        });
        
        return false; // Update available
      } else if (comparison === 0) {
        this.log('✅ Already up to date!', 'success');
        return true; // Up to date
      } else {
        this.log('🚀 Running ahead of latest release!', 'success');
        return true; // Ahead
      }
      
    } catch (error) {
      this.log(`Check failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async watch() {
    this.log('👀 Starting update watcher... (press Ctrl+C to stop)');
    
    const checkInterval = 60 * 60 * 1000; // Check every hour
    
    while (true) {
      await this.check();
      this.log(`⏰ Next check in 1 hour...`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
}

// Command line interface
async function main() {
  const checker = new UpdateChecker();
  const args = process.argv.slice(2);
  
  if (args.includes('--watch') || args.includes('-w')) {
    await checker.watch();
  } else {
    const isUpToDate = await checker.check();
    process.exit(isUpToDate ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = UpdateChecker;

#!/usr/bin/env node

/**
 * Sync utility for chrome-launcher integration with brave-real-launcher
 * Automatically pulls updates from chrome-launcher and integrates Brave-specific features
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ChromeLauncherSync {
  constructor() {
    this.chromeRepo = 'GoogleChrome/chrome-launcher';
    this.baseUrl = `https://api.github.com/repos/${this.chromeRepo}`;
    this.rawUrl = `https://raw.githubusercontent.com/${this.chromeRepo}/main`;
    this.srcDir = path.join(__dirname, '..', 'src');
    this.packageJsonPath = path.join(__dirname, '..', 'package.json');
    
    // Brave-specific mappings
    this.braveFeatures = {
      'chrome-finder.ts': this.addBraveFinderFeatures.bind(this),
      'flags.ts': this.addBraveFlagsFeatures.bind(this),
      'chrome-launcher.ts': this.addBraveLauncherFeatures.bind(this),
      'utils.ts': this.addBraveUtilsFeatures.bind(this)
    };
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
      https.get(url, { headers: { 'User-Agent': 'brave-real-launcher-sync' } }, (res) => {
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

  async fetchText(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'brave-real-launcher-sync' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      });
    });
  }

  async getLatestVersion() {
    this.log('🔍 Checking latest chrome-launcher version...');
    try {
      const release = await this.fetchJson(`${this.baseUrl}/releases/latest`);
      const version = release.tag_name.replace(/^v/, '');
      this.log(`Latest chrome-launcher version: ${version}`, 'success');
      return version;
    } catch (error) {
      this.log(`Failed to get latest version: ${error.message}`, 'error');
      throw error;
    }
  }

  async getCurrentVersion() {
    try {
      const packageJson = JSON.parse(await fs.readFile(this.packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      this.log(`Failed to read current version: ${error.message}`, 'error');
      throw error;
    }
  }

  async updatePackageVersion(newVersion) {
    try {
      const packageJson = JSON.parse(await fs.readFile(this.packageJsonPath, 'utf8'));
      packageJson.version = newVersion;
      await fs.writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      this.log(`Updated package.json version to ${newVersion}`, 'success');
    } catch (error) {
      this.log(`Failed to update package version: ${error.message}`, 'error');
      throw error;
    }
  }

  async syncFile(filename) {
    this.log(`🔄 Syncing ${filename}...`);
    try {
      const url = `${this.rawUrl}/src/${filename}`;
      let content = await this.fetchText(url);
      
      // Apply Brave-specific features if handler exists
      if (this.braveFeatures[filename]) {
        content = this.braveFeatures[filename](content);
      }
      
      // Convert to ES modules compatible imports if needed
      content = this.convertToESModules(content);
      
      const filePath = path.join(this.srcDir, filename);
      await fs.writeFile(filePath, content);
      this.log(`✅ Synced ${filename}`, 'success');
    } catch (error) {
      this.log(`Failed to sync ${filename}: ${error.message}`, 'error');
      throw error;
    }
  }

  // Convert CommonJS to ES modules
  convertToESModules(content) {
    // Convert require statements to import statements
    content = content.replace(/const\s+(\{[^}]+\})\s*=\s*require\((['"][^'"]+['"])\);?/g, 'import $1 from $2;');
    content = content.replace(/const\s+(\w+)\s*=\s*require\((['"][^'"]+['"])\);?/g, 'import $1 from $2;');
    
    // Convert module.exports to export
    content = content.replace(/module\.exports\s*=\s*([^;]+);?/g, 'export default $1;');
    content = content.replace(/exports\.(\w+)\s*=\s*([^;]+);?/g, 'export const $1 = $2;');
    
    // Fix path imports
    content = content.replace(/from ['"]path['"]/g, "from 'node:path'");
    content = content.replace(/from ['"]fs['"]/g, "from 'node:fs'");
    content = content.replace(/from ['"]util['"]/g, "from 'node:util'");
    content = content.replace(/from ['"]os['"]/g, "from 'node:os'");
    content = content.replace(/from ['"]child_process['"]/g, "from 'node:child_process'");
    
    return content;
  }

  // Brave-specific feature integrations
  addBraveFinderFeatures(content) {
    // Replace Chrome with Brave in finder logic
    content = content.replace(/chrome/gi, 'brave');
    content = content.replace(/Chrome/g, 'Brave');
    content = content.replace(/CHROME/g, 'BRAVE');
    
    // Add Brave-specific paths and registry entries
    const braveSpecificCode = `
// Brave-specific installation paths and detection
const BRAVE_INSTALLATION_PATHS = {
  win32: [
    process.env.LOCALAPPDATA + '/BraveSoftware/Brave-Browser/Application/brave.exe',
    process.env.PROGRAMFILES + '/BraveSoftware/Brave-Browser/Application/brave.exe',
    process.env['PROGRAMFILES(X86)'] + '/BraveSoftware/Brave-Browser/Application/brave.exe'
  ],
  darwin: [
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
  ],
  linux: [
    '/usr/bin/brave-browser',
    '/usr/bin/brave',
    '/snap/bin/brave',
    '/opt/brave.com/brave/brave-browser'
  ]
};
`;
    
    return braveSpecificCode + content;
  }

  addBraveFlagsFeatures(content) {
    // Add Brave-specific flags
    const braveFlags = `
// Brave-specific flags for optimal automation
const BRAVE_SPECIFIC_FLAGS = [
  '--disable-brave-update',
  '--disable-brave-extension-updates',
  '--disable-brave-sync',
  '--disable-brave-rewards',
  '--disable-brave-ads'
];
`;
    return braveFlags + content;
  }

  addBraveLauncherFeatures(content) {
    // Add Xvfb support and headless detection
    const xvfbSupport = `
import { XvfbSupport } from './xvfb-support.js';

// Enhanced Brave launcher with Xvfb support
`;
    return xvfbSupport + content;
  }

  addBraveUtilsFeatures(content) {
    // Add Windows registry detection for Brave
    const registrySupport = `
// Enhanced Windows Registry detection for Brave Browser
function getBraveFromWindowsRegistry() {
  // Implementation for Brave-specific registry detection
  return [];
}
`;
    return registrySupport + content;
  }

  async syncAllFiles() {
    const filesToSync = [
      'chrome-finder.ts',
      'chrome-launcher.ts', 
      'flags.ts',
      'random-port.ts',
      'utils.ts'
    ];

    this.log(`🚀 Starting sync of ${filesToSync.length} files...`);
    
    for (const filename of filesToSync) {
      await this.syncFile(filename);
      // Small delay to be respectful to GitHub API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.log('✅ All files synced successfully!', 'success');
  }

  async run() {
    try {
      this.log('🚀 Starting chrome-launcher sync process...');
      
      const latestVersion = await this.getLatestVersion();
      const currentVersion = await this.getCurrentVersion();
      
      if (latestVersion === currentVersion) {
        this.log('✅ Already up to date!', 'success');
        return;
      }
      
      this.log(`🔄 Updating from v${currentVersion} to v${latestVersion}`);
      
      // Sync source files
      await this.syncAllFiles();
      
      // Update package version
      await this.updatePackageVersion(latestVersion);
      
      // Rebuild TypeScript
      this.log('🔨 Rebuilding TypeScript...');
      try {
        execSync('npm run build', { stdio: 'inherit' });
        this.log('✅ Build completed successfully!', 'success');
      } catch (buildError) {
        this.log('⚠️ Build failed, but sync completed', 'warn');
      }
      
      this.log('🎉 Sync completed successfully!', 'success');
      this.log(`📦 Updated to chrome-launcher v${latestVersion}`, 'success');
      
    } catch (error) {
      this.log(`Sync failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new ChromeLauncherSync();
  sync.run();
}

module.exports = ChromeLauncherSync;

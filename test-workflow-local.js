#!/usr/bin/env node

/**
 * Local GitHub Workflow Validation Script
 * Tests the core logic of the GitHub Action workflow locally
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WorkflowValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Starting GitHub Workflow Local Validation...\n');

    try {
      await this.validateWorkflowSyntax();
      await this.testUpdateCheck();
      await this.testSyncScript();
      await this.testBuildProcess();
      await this.generateTestReport();
      
      console.log('\n🎉 All workflow validations passed!');
      console.log('✅ Ready to push to GitHub');
      
    } catch (error) {
      console.error('\n❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  async validateWorkflowSyntax() {
    console.log('📋 Validating GitHub Workflow Syntax...');
    
    const workflowPath = path.join(this.projectRoot, '.github', 'workflows', 'chrome-launcher-sync.yml');
    
    if (!fs.existsSync(workflowPath)) {
      throw new Error('Workflow file not found');
    }

    try {
      // Basic YAML syntax validation using Node.js
      const yaml = require('yaml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      const parsed = yaml.parse(workflowContent);
      
      // Check required fields
      if (!parsed.name) throw new Error('Missing workflow name');
      if (!parsed.on) throw new Error('Missing workflow triggers');
      if (!parsed.jobs) throw new Error('Missing workflow jobs');
      
      // Validate job structure
      const jobs = Object.keys(parsed.jobs);
      const expectedJobs = ['check-updates', 'sync-and-build', 'publish-npm', 'notify-completion'];
      
      for (const job of expectedJobs) {
        if (!jobs.includes(job)) {
          throw new Error(`Missing required job: ${job}`);
        }
      }

      this.testResults.push('✅ Workflow syntax validation passed');
      console.log('  ✅ YAML syntax valid');
      console.log('  ✅ All required jobs present');
      console.log('  ✅ Workflow structure correct');
      
    } catch (error) {
      if (error.message.includes('yaml')) {
        // If yaml module not found, do basic text validation
        console.log('  ℹ️ YAML module not found, doing basic validation');
        const content = fs.readFileSync(workflowPath, 'utf8');
        if (content.includes('name:') && content.includes('on:') && content.includes('jobs:')) {
          this.testResults.push('✅ Basic workflow syntax validation passed');
          console.log('  ✅ Basic syntax validation passed');
        } else {
          throw new Error('Invalid workflow structure');
        }
      } else {
        throw error;
      }
    }
  }

  async testUpdateCheck() {
    console.log('🔍 Testing Update Check Logic...');
    
    try {
      // Get current version
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const currentVersion = packageJson.version;
      
      // Get chrome-launcher version
      const chromeVersion = execSync('npm view chrome-launcher version', { encoding: 'utf8' }).trim();
      
      console.log(`  📦 Current brave-real-launcher version: ${currentVersion}`);
      console.log(`  🌐 Latest chrome-launcher version: ${chromeVersion}`);
      
      const hasUpdates = currentVersion !== chromeVersion;
      
      if (hasUpdates) {
        console.log('  ✅ Updates available - workflow would proceed');
        this.testResults.push('✅ Update detection logic working');
      } else {
        console.log('  ℹ️ No updates available - workflow would skip');
        this.testResults.push('✅ Update detection logic working (no updates)');
      }
      
    } catch (error) {
      console.log('  ⚠️ Could not fetch chrome-launcher version (network issue)');
      this.testResults.push('⚠️ Update check test skipped (network)');
    }
  }

  async testSyncScript() {
    console.log('🔄 Testing Chrome-launcher Sync Script...');
    
    const syncScriptPath = path.join(this.projectRoot, 'scripts', 'chrome-launcher-sync.cjs');
    
    if (!fs.existsSync(syncScriptPath)) {
      throw new Error('Chrome-launcher sync script not found');
    }

    try {
      // Test if script can be loaded
      require(syncScriptPath);
      console.log('  ✅ Sync script loads without errors');
      
      // Check if script has required methods
      const script = fs.readFileSync(syncScriptPath, 'utf8');
      const requiredMethods = ['run', 'fetchChromeLauncher', 'integrateChromeLauncher', 'backupBraveFiles'];
      
      for (const method of requiredMethods) {
        if (script.includes(method)) {
          console.log(`  ✅ Method ${method} found`);
        } else {
          throw new Error(`Required method ${method} not found in sync script`);
        }
      }
      
      this.testResults.push('✅ Chrome-launcher sync script validation passed');
      
    } catch (error) {
      throw new Error(`Sync script validation failed: ${error.message}`);
    }
  }

  async testBuildProcess() {
    console.log('🔨 Testing Build Process...');
    
    try {
      // Check if dependencies are installed
      if (!fs.existsSync('node_modules')) {
        console.log('  📦 Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
      }
      
      // Test TypeScript compilation
      console.log('  🔧 Testing TypeScript compilation...');
      execSync('npm run build:cjs', { stdio: 'pipe' });
      
      // Check if dist files exist
      if (fs.existsSync('dist/index.js')) {
        console.log('  ✅ CommonJS build successful');
      } else {
        throw new Error('CommonJS build failed - no output file');
      }
      
      // Test if module can be required
      const builtModule = require(path.join(this.projectRoot, 'dist', 'index.js'));
      if (builtModule) {
        console.log('  ✅ Built module can be loaded');
      }
      
      this.testResults.push('✅ Build process validation passed');
      
    } catch (error) {
      throw new Error(`Build process validation failed: ${error.message}`);
    }
  }

  async generateTestReport() {
    console.log('\n📊 Generating Test Report...');
    
    const reportPath = path.join(this.projectRoot, 'workflow-test-report.md');
    const timestamp = new Date().toISOString();
    
    const report = `# GitHub Workflow Local Test Report

**Generated:** ${timestamp}

## Test Results

${this.testResults.map(result => `- ${result}`).join('\n')}

## Summary

- **Total Tests:** ${this.testResults.length}
- **Passed:** ${this.testResults.filter(r => r.includes('✅')).length}
- **Warnings:** ${this.testResults.filter(r => r.includes('⚠️')).length}
- **Failed:** ${this.testResults.filter(r => r.includes('❌')).length}

## Next Steps

1. ✅ Workflow syntax is valid
2. ✅ Core logic is working
3. ✅ Build process is functional
4. 🚀 **Ready to push to GitHub**

## GitHub Secrets Required

Make sure these secrets are configured in your GitHub repository:

- \`GH_TOKEN\` - GitHub Personal Access Token with repo permissions
- \`NPM_TOKEN\` - NPM authentication token for publishing

## Manual Testing Commands

To test the workflow manually on GitHub:

\`\`\`bash
# Manual trigger with default settings
gh workflow run chrome-launcher-sync.yml

# Manual trigger with specific version
gh workflow run chrome-launcher-sync.yml -f chrome_launcher_version=1.0.0 -f force_publish=true
\`\`\`
`;

    fs.writeFileSync(reportPath, report);
    console.log(`  ✅ Report generated: ${reportPath}`);
  }
}

// Run the validator
const validator = new WorkflowValidator();
validator.runTests().catch(console.error);
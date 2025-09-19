# GitHub Action Setup Guide

यह guide आपको brave-real-launcher के लिए GitHub Action workflow setup करने में मदद करेगी।

## 🔑 Required GitHub Secrets

GitHub repository में निम्नलिखित secrets configure करना आवश्यक है:

### 1. GH_TOKEN (GitHub Personal Access Token)

```bash
# GitHub Personal Access Token with these permissions:
- repo (Full control of private repositories)
- workflow (Update GitHub Action workflows)
- write:packages (Write packages to GitHub Package Registry)
```

**कैसे बनाएं:**
1. GitHub.com पर जाएं → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)" पर click करें
3. ऊपर दिए गए permissions select करें
4. Token generate करें और copy करें

### 2. NPM_TOKEN (NPM Authentication Token)

```bash
# NPM Token with publish permissions
- Type: Automation token (recommended)
- Scope: brave-real-launcher package
```

**कैसे बनाएं:**
1. NPM.js पर login करें → Account Settings → Access Tokens
2. "Generate New Token" → "Automation" select करें
3. Token generate करें और copy करें

## 📝 Secrets Configuration

GitHub repository में secrets add करें:

```bash
# Repository में जाएं
Settings → Secrets and variables → Actions → New repository secret

# Add करें:
Name: GH_TOKEN
Value: {{your_github_token}}

Name: NPM_TOKEN  
Value: {{your_npm_token}}
```

## 🚀 Workflow Features

### 📈 Auto-increment Version Logic
- **Smart Versioning**: हमेशा version increment होता है (1.2.0 → 1.2.1 → 1.2.2...)
- **Chrome-launcher Sync**: Chrome-launcher के version के साथ intelligent sync
- **Continuous Updates**: जब chrome-launcher version same हो तब भी patch increment
- **Strategy Support**: Major, Minor, Patch, और Auto increment strategies

### Automatic Triggers
- **Daily Check**: हर रोज सुबह 6 बजे UTC (11:30 AM IST)
- **Push Trigger**: scripts या workflow files में changes पर
- **Always Proceeds**: अब workflow हमेशा run होगी continuous updates के लिए

### Manual Triggers
```bash
# GitHub UI से:
Actions → Chrome Launcher Sync & Publish → Run workflow

# GitHub CLI से:
gh workflow run chrome-launcher-sync.yml

# Custom parameters के साथ:
gh workflow run chrome-launcher-sync.yml \
  -f chrome_launcher_version=1.2.0 \
  -f force_publish=true \
  -f skip_tests=false
```

## 📋 Workflow Jobs

### 1. check-updates
- chrome-launcher के latest version को check करता है
- Current version से compare करता है
- Update available है तो आगे proceed करता है

### 2. sync-and-build
- Chrome-launcher को sync करता है
- Brave-specific features preserve करता है
- Project को build करता है
- Tests run करता है
- Changes को commit करता है

### 3. publish-npm
- NPM पर package publish करता है
- GitHub release create करता है
- Version tags add करता है

### 4. notify-completion
- Workflow summary generate करता है
- Success/failure status report करता है

## 🔧 Local Testing

Workflow को push करने से पहले local testing कर सकते हैं:

```bash
# Local validation script run करें
node test-workflow-local.js

# Version increment test करें
node scripts/version-increment.cjs --dry-run
node scripts/version-increment.cjs --dry-run --force
node scripts/version-increment.cjs --dry-run --strategy=patch

# Actually increment version
node scripts/version-increment.cjs --force

# Sync script manually test करें
node scripts/chrome-launcher-sync.cjs latest

# Build process test करें
npm run build
npm run test:ci
```

## 🎯 Manual Workflow Execution

### Basic Run
```bash
# Default settings के साथ
gh workflow run chrome-launcher-sync.yml
```

### Advanced Run
```bash
# Specific version target करें
gh workflow run chrome-launcher-sync.yml \
  -f chrome_launcher_version=1.1.0

# Force publish करें
gh workflow run chrome-launcher-sync.yml \
  -f force_publish=true

# Tests skip करें (careful!)
gh workflow run chrome-launcher-sync.yml \
  -f skip_tests=true
```

## 📊 Monitoring

### Workflow Status Check
```bash
# Recent workflow runs देखें
gh run list

# Specific run details
gh run view <run-id>

# Logs देखें
gh run view <run-id> --log
```

### NPM Package Verification
```bash
# Published version check करें
npm view brave-real-launcher version

# Package info देखें
npm info brave-real-launcher
```

## 🚨 Troubleshooting

### Common Issues

#### 1. GH_TOKEN Permission Error
```
Error: Resource not accessible by integration
```
**Solution:** GH_TOKEN में `repo` और `workflow` permissions check करें

#### 2. NPM_TOKEN Authentication Error
```
Error: Unable to authenticate with npm
```
**Solution:** NPM_TOKEN valid है और `automation` type का है verify करें

#### 3. Build Failures
```
Error: TypeScript compilation failed
```
**Solution:** Local build test करें और dependencies update करें

#### 4. Sync Script Failures
```
Error: Chrome-launcher sync failed
```
**Solution:** Internet connection check करें और git access verify करें

## 📈 Success Metrics

Workflow successfully run होने पर:
- ✅ brave-real-launcher npm पर published
- ✅ GitHub release created
- ✅ Version tags updated
- ✅ All Brave features preserved
- ✅ Tests passing
- ✅ Documentation updated

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Chrome-launcher Repository](https://github.com/GoogleChrome/chrome-launcher)
- [Brave-real-launcher NPM](https://www.npmjs.com/package/brave-real-launcher)

---

**Next Step:** Push करने से पहले सुनिश्चित करें कि GitHub secrets properly configured हैं।
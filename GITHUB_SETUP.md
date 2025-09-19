# 🔐 GitHub Secrets Setup Guide

यह guide आपको **brave-real-launcher** के लिए GitHub Actions workflow को setup करने में मदद करेगी।

## आवश्यक Secrets

आपको अपनी GitHub repository में निम्नलिखित secrets add करने होंगे:

### 1. NPM_TOKEN (आवश्यक)
NPM पर package publish करने के लिए:

```bash
# NPM में login करें
npm login

# Access token generate करें
npm token create --type=publish
```

**GitHub में add करें:**
1. Repository → Settings → Secrets and variables → Actions
2. "New repository secret" click करें
3. Name: `NPM_TOKEN`
4. Value: आपका NPM access token

### 2. GH_TOKEN (Optional)
Repository में changes commit करने के लिए:

**Option A: Default GITHUB_TOKEN (Recommended)**
- Workflow automatically `GITHUB_TOKEN` का use करेगी
- कोई extra setup की जरूरत नहीं

**Option B: Personal Access Token**
अगर extra permissions चाहिए तो:

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token" → "Fine-grained personal access token"
3. Repository access: Select repository
4. Permissions: Contents (Write), Metadata (Read)
5. Token copy करें

**GitHub में add करें:**
- Name: `GH_TOKEN`
- Value: आपका personal access token

## 🚀 Simple Workflow Triggers

### 1. ऑटोमेटिक Triggers
```yaml
# हफ्ते में दो बार automatic check
schedule:
  - cron: '0 6 * * 1,4'  # सोमवार और गुरुवार सुबह 6:00 UTC
```

### 2. Manual Triggers
Repository पर जाकर:
1. Actions tab → "Brave Real Launcher - Auto Sync & Publish"
2. "Run workflow" button click करें
3. Simple Options:
   - **Force Sync**: जबरदस्ती chrome-launcher sync करें
   - **Skip Tests**: तेजी execution के लिए tests skip करें

### 3. Push/PR Triggers
```yaml
# हर push और PR पर (बिना publish के)
push:
  branches: [ main, master ]
pull_request:
  branches: [ main, master ]
```

## 🔄 Sync Modes

| Mode | Description |
|------|-------------|
| `auto` | Chrome-launcher update होने पर sync करें |
| `force` | जबरदस्ती sync करें |
| `check` | सिर्फ check करें, कोई changes न करें |

## 🚀 Publish Modes

| Mode | Description |
|------|-------------|
| `auto` | Version change पर automatic publish |
| `force` | जबरदस्ती publish करें |
| `skip` | Publish न करें |

## 🔍 Workflow Status Check

Workflow की status check करने के लिए:

1. Repository → Actions tab
2. Latest workflow run देखें
3. Logs में detailed information मिलेगी

## 🛠️ Troubleshooting

### NPM Publish Failed
- NPM_TOKEN valid है या नहीं check करें
- NPM में login status verify करें
- Package name conflicts check करें

### Git Push Failed
- GH_TOKEN permissions check करें
- Branch protection rules check करें

### Chrome-launcher Sync Failed
- Network connectivity check करें
- GitHub API rate limits check करें

## 📊 Simple Workflow Features

✅ **Auto Chrome-launcher Sync**: ऑटोमेटिक chrome-launcher integration with all features  
✅ **Smart Version Management**: Intelligent version increment and NPM publish  
✅ **Dual Module Support**: CommonJS + ES Module builds maintained  
✅ **Comprehensive Testing**: Full test suite with browser environment  
✅ **Security First**: Secure token handling + NPM security audit  
✅ **Simple Controls**: Just 2 options - Force Sync + Skip Tests  
✅ **Complete Automation**: One workflow does everything automatically

---

## 🎉 Setup Complete!

सभी secrets add करने के बाद, workflow automatically काम करना शुरू कर देगी। पहली run manually trigger करें test करने के लिए।
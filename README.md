# brave-real-launcher

Launch Brave Browser with ease from Node.js. Based on [chrome-launcher](https://github.com/GoogleChrome/chrome-launcher) but specifically adapted for Brave Browser with additional features.

## Features

- 🦁 **Brave Browser Detection**: Automatically detects Brave Browser installations across all platforms
- 🖥️ **Multi-Platform Support**: Linux (x64/ARM64), macOS (Intel/Apple Silicon), Windows (x64/ARM64)
- 🐧 **Xvfb Support**: Built-in Xvfb support for headless operation on Linux
- 🎯 **Launch Modes**: Headless mode, GUI mode, or automatic detection
- 🔄 **Auto-Sync**: Automatically syncs with chrome-launcher updates while preserving Brave-specific features
- 🛠️ **Full API Compatibility**: Drop-in replacement for chrome-launcher but for Brave

## Installation

```bash
npm install brave-real-launcher
```

## Quick Start

```javascript
const { launch } = require('brave-real-launcher');

// Launch Brave in headless mode
const brave = await launch({
  braveFlags: ['--headless', '--disable-gpu'],
  logLevel: 'info'
});

console.log('Brave is running on port', brave.port);

// Kill Brave
brave.kill();
```

## API

### `launch(options)`

Launches Brave Browser with the specified options.

**Options:**
- `bravePath?: string` - Path to Brave executable (auto-detected if not provided)
- `braveFlags?: string[]` - Array of Brave flags to pass
- `launchMode?: 'auto' | 'headless' | 'gui'` - Launch mode (default: 'auto')
- `enableXvfb?: boolean` - Enable Xvfb on Linux (default: false)
- `xvfbOptions?: XvfbOptions` - Xvfb configuration options
- `port?: number` - Debug port (default: random)
- `userDataDir?: string | boolean` - User data directory
- `startingUrl?: string` - URL to navigate to on start
- And more options compatible with chrome-launcher

### `getBravePath()`

Returns the path to the Brave Browser executable.

### `XvfbManager`

Manages Xvfb virtual display for headless environments.

```javascript
const { XvfbManager } = require('brave-real-launcher');

const xvfb = new XvfbManager({
  display: ':99',
  width: 1920,
  height: 1080
});

await xvfb.start();
// ... use Brave
await xvfb.stop();
```

## Platform Support

### Linux
- x64 and ARM64 architectures
- Detects installations in standard paths: `/opt/brave.com/brave/`, `/usr/bin/brave-browser`, etc.
- Supports Flatpak and Snap installations
- Built-in Xvfb support for headless environments

### macOS  
- Intel and Apple Silicon (M1/M2) support
- Detects Brave Browser, Brave Browser Beta, Nightly, and Dev versions
- Standard installation paths in `/Applications/`

### Windows
- x64 and ARM64 support  
- Registry-based detection
- Standard installation paths in Program Files and Local AppData

## Environment Variables

- `BRAVE_PATH`: Path to Brave executable
- `HEADLESS`: Force headless mode when set
- `DISPLAY`: X11 display (Linux)

## Examples

### Headless Mode with Xvfb
```javascript
const brave = await launch({
  launchMode: 'headless',
  enableXvfb: true,
  xvfbOptions: { width: 1920, height: 1080 }
});
```

### Custom Flags
```javascript  
const brave = await launch({
  braveFlags: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});
```

### Auto-Detection
```javascript
const brave = await launch({
  launchMode: 'auto', // Automatically detects headless vs GUI environment
  logLevel: 'verbose'
});
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Auto-Sync with chrome-launcher

This project automatically syncs with chrome-launcher updates while preserving Brave-specific functionality. The GitHub Action workflow:

- Checks for chrome-launcher updates daily
- Automatically integrates compatible changes
- Preserves Brave-specific browser detection and features
- Runs comprehensive tests across all supported platforms
- Publishes updated versions to npm

## License

Apache-2.0 - Based on chrome-launcher by The Chromium Authors
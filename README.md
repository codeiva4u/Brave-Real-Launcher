# Brave Real Launcher [![GitHub Actions Status Badge](https://github.com/your-username/brave-real-launcher/workflows/🛠/badge.svg)](https://github.com/your-username/brave-real-launcher/actions) [![NPM brave-real-launcher package](https://img.shields.io/npm/v/brave-real-launcher.svg)](https://npmjs.org/package/brave-real-launcher)

<img src="https://brave.com/static-assets/images/brave-logo-without-text.svg" align=right height=200>

Launch Brave Browser with ease from node across all platforms including Linux x64/ARM64, macOS Intel/Apple Silicon, Windows x64/ARM64.

* [Disables many Brave services](https://github.com/your-username/brave-real-launcher/blob/main/src/flags.ts) that add noise to automated scenarios
* Opens up the browser's `remote-debugging-port` on an available port
* Automagically locates a Brave Browser binary across all platforms (Linux x64/ARM64, macOS Intel/Apple Silicon, Windows x64/ARM64)
* Built-in **Xvfb support** for Linux headless environments with auto-detection
* **Headless mode** and **Desktop GUI mode** with intelligent auto-detection
* Uses a fresh Brave profile for each launch, and cleans itself up on `kill()`
* Binds `Ctrl-C` (by default) to terminate the Brave process
* **Windows Registry detection** for comprehensive Brave installation discovery
* Exposes a comprehensive set of [options](#api) for configurability over these details

Once launched, interacting with the browser must be done over the [devtools protocol](https://chromedevtools.github.io/devtools-protocol/), typically via [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface/) or [puppeteer-core](https://github.com/puppeteer/puppeteer).

## Supported Platforms

- **Linux x64** - Full support including Xvfb virtual display
- **Linux ARM64** - Full support including Xvfb virtual display  
- **macOS Intel** - Full support with native binary detection
- **macOS Apple Silicon** - Full support with native ARM64 binary detection
- **Windows x64** - Full support with Registry-based detection
- **Windows ARM64** - Full support with Registry-based detection

### Installing

```sh
yarn add brave-real-launcher

# or with npm:
npm install brave-real-launcher
```


## API

### `.launch([opts])`

#### Launch options

```js
{
  // (optional) remote debugging port number to use. If provided port is already busy, launch() will reject
  // Default: an available port is autoselected
  port: number;

  // (optional) When `port` is specified *and* no Brave is found at that port,
  // * if `false` (default), brave-real-launcher will launch a new Brave with that port.
  // * if `true`, throw an error
  // This option is useful when you wish to explicitly connect to a running Brave, such as on a mobile device via adb
  // Default: false
  portStrictMode: boolean;

  // (optional) Additional flags to pass to Brave, for example: ['--headless', '--disable-gpu']
  // See: https://github.com/your-username/brave-real-launcher/blob/main/docs/chrome-flags-for-tools.md
  // Do note, many flags are set by default: https://github.com/your-username/brave-real-launcher/blob/main/src/flags.ts
  chromeFlags: Array<string>;

  // (optional) Additional preferences to be set in Brave, for example: {'download.default_directory': __dirname}
  // See: https://chromium.googlesource.com/chromium/src/+/main/chrome/common/pref_names.cc
  // Do note, if you set preferences when using your default profile it will overwrite these
  prefs: {[key: string]: Object};

  // (optional) Close the Brave process on `Ctrl-C`
  // Default: true
  handleSIGINT: boolean;

  // (optional) Explicit path of intended Brave binary
  // * If this `chromePath` option is defined, it will be used.
  // * Otherwise, the `BRAVE_PATH` env variable will be used if set.
  // * Otherwise, a detected Brave Browser (stable) will be used
  // * Otherwise, a detected Brave Browser Beta/Dev/Nightly will be used
  chromePath: string;

  // (optional) Brave profile path to use, if set to `false` then the default profile will be used.
  // By default, a fresh Brave profile will be created
  userDataDir: string | boolean;

  // (optional) Starting URL to open the browser with
  // Default: `about:blank`
  startingUrl: string;

  // (optional) Logging level
  // Default: 'silent'
  logLevel: 'verbose'|'info'|'error'|'silent';

  // (optional) Flags specific in [flags.ts](src/flags.ts) will not be included.
  // Typically used with the defaultFlags() method and chromeFlags option.
  // Default: false
  ignoreDefaultFlags: boolean;

  // (optional) Interval in ms, which defines how often launcher checks browser port to be ready.
  // Default: 500
  connectionPollInterval: number;

  // (optional) A number of retries, before browser launch considered unsuccessful.
  // Default: 50
  maxConnectionRetries: number;

  // (optional) A dict of environmental key value pairs to pass to the spawned brave process.
  envVars: {[key: string]: string};

  // ===== NEW BRAVE-SPECIFIC OPTIONS =====
  
  // (optional) Launch in headless mode (without GUI)
  // Automatically adds --headless, --disable-gpu, --no-sandbox flags
  // Default: false
  headless: boolean;

  // (optional) Auto-detect if display is available and setup Xvfb if needed on Linux
  // Only works on Linux platforms
  // Default: true
  autoDetectDisplay: boolean;

  // (optional) Force enable/disable Xvfb support on Linux
  // * if `true`, always try to start Xvfb (error if fails)
  // * if `false`, never use Xvfb
  // * if `undefined`, use autoDetectDisplay logic
  // Default: undefined
  enableXvfb: boolean;

  // (optional) Xvfb configuration options (Linux only)
  // Default: {displayNum: 99, reuse: false, timeout: 10000, silent: false, xvfbArgs: [...]}
  xvfbOptions: {
    displayNum?: number;      // X display number to use (default: auto-detect)
    reuse?: boolean;          // Reuse existing display if running (default: false)
    timeout?: number;         // Timeout in ms for Xvfb to start (default: 10000)
    silent?: boolean;         // Suppress Xvfb logs (default: false)
    xvfbArgs?: string[];      // Custom Xvfb arguments
  };
};
```

#### Launched chrome interface

#### `.launch().then(brave => ...`

```js
// The remote debugging port exposed by the launched brave
brave.port: number;

// Method to kill Brave (and cleanup the profile folder and Xvfb if used)
brave.kill: () => Promise<void>;

// The process id
brave.pid: number;

// The childProcess object for the launched Brave
brave.process: childProcess

// If chromeFlags contains --remote-debugging-pipe. Otherwise remoteDebuggingPipes is null.
brave.remoteDebuggingPipes.incoming: ReadableStream
brave.remoteDebuggingPipes.outgoing: WritableStream

// Xvfb instance (Linux only, when Xvfb is used)
brave.xvfb?: XvfbSupport
```

When `--remote-debugging-pipe` is passed via `chromeFlags`, then `port` will be
unusable (0) by default. Instead, debugging messages are exchanged via
`remoteDebuggingPipes.incoming` and `remoteDebuggingPipes.outgoing`. The data
in these pipes are JSON values terminated by a NULL byte (`\x00`).
Data written to `remoteDebuggingPipes.outgoing` are sent to Chrome,
data read from `remoteDebuggingPipes.incoming` are received from Chrome.

### `BraveLauncher.Launcher.defaultFlags()`

Returns an `Array<string>` of the default [flags](docs/chrome-flags-for-tools.md) Brave is launched with. Typically used along with the `ignoreDefaultFlags` and `chromeFlags` options.

Note: This array will exclude the following flags: `--remote-debugging-port` `--disable-setuid-sandbox` `--user-data-dir`.

### `BraveLauncher.Launcher.getInstallations()`

Returns an `Array<string>` of paths to available Brave Browser installations across all supported platforms. When `chromePath` is not provided to `.launch()`, the first installation returned from this method is used instead.

Note: This method performs synchronous I/O operations and includes Windows Registry detection.

### `.killAll()`

Attempts to kill all Chrome instances created with [`.launch([opts])`](#launchopts). Returns a Promise that resolves to an array of errors that occurred while killing instances. If all instances were killed successfully, the array will be empty.

```js
import * as BraveLauncher from 'brave-real-launcher';

async function cleanup() {
  await BraveLauncher.killAll();
}
```

## Examples

#### Basic Brave launching:

```js
import * as BraveLauncher from 'brave-real-launcher';

BraveLauncher.launch({
  startingUrl: 'https://brave.com'
}).then(brave => {
  console.log(`Brave debugging port running on ${brave.port}`);
  console.log(`Brave PID: ${brave.pid}`);
  
  // Clean up when done
  // brave.kill();
});
```

#### Launching headless Brave (Method 1 - using headless option):

```js
import * as BraveLauncher from 'brave-real-launcher';

BraveLauncher.launch({
  startingUrl: 'https://brave.com',
  headless: true  // Automatically adds necessary headless flags
}).then(brave => {
  console.log(`Headless Brave debugging port running on ${brave.port}`);
  console.log(`Xvfb display: ${brave.xvfb ? brave.xvfb.getDisplayString() : 'Not used'}`);
});
```

#### Launching headless Brave (Method 2 - using flags):

```js
import * as BraveLauncher from 'brave-real-launcher';

BraveLauncher.launch({
  startingUrl: 'https://brave.com',
  chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
}).then(brave => {
  console.log(`Brave debugging port running on ${brave.port}`);
});
```

#### Linux with Xvfb (automatic detection):

```js
import * as BraveLauncher from 'brave-real-launcher';

// On Linux without DISPLAY, Xvfb will be automatically started
BraveLauncher.launch({
  startingUrl: 'https://brave.com',
  autoDetectDisplay: true  // default: true
}).then(brave => {
  console.log(`Brave running on ${brave.xvfb ? 'Xvfb ' + brave.xvfb.getDisplayString() : 'existing display'}`);
});
```

#### Linux with custom Xvfb configuration:

```js
import * as BraveLauncher from 'brave-real-launcher';

BraveLauncher.launch({
  startingUrl: 'https://brave.com',
  enableXvfb: true,
  xvfbOptions: {
    displayNum: 100,
    reuse: true,
    timeout: 15000,
    xvfbArgs: ['-screen', '0', '1920x1080x24', '-ac']
  }
}).then(brave => {
  console.log(`Brave running on Xvfb ${brave.xvfb.getDisplayString()}`);
});
```

#### Launching with support for extensions and audio:

```js
import * as BraveLauncher from 'brave-real-launcher';

const newFlags = BraveLauncher.Launcher.defaultFlags().filter(flag => 
  flag !== '--disable-extensions' && 
  flag !== '--mute-audio'
);

BraveLauncher.launch({
  ignoreDefaultFlags: true,
  chromeFlags: newFlags,
}).then(brave => {
  console.log(`Brave with extensions support running on port ${brave.port}`);
});
```

#### Cross-platform Brave detection:

```js
import * as BraveLauncher from 'brave-real-launcher';

// Get all available Brave installations
const installations = BraveLauncher.Launcher.getInstallations();
console.log('Available Brave installations:', installations);

// Launch with specific Brave binary
BraveLauncher.launch({
  chromePath: installations[0], // Use first found installation
  startingUrl: 'https://brave.com'
}).then(brave => {
  console.log(`Using Brave from: ${installations[0]}`);
});
```

To programatically load an extension at runtime, use `--remote-debugging-pipe`
as shown in [test/load-extension-test.ts](test/load-extension-test.ts).

### Continuous Integration

Brave Real Launcher works seamlessly in CI environments with built-in Xvfb support and automatic platform detection.

#### GitHub Actions (Recommended)

```yaml
name: Test with Brave
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '18'
      cache: 'npm'
      
  - name: Install dependencies
    run: |
      sudo apt-get update
      sudo apt-get install -y xvfb
      # Install Brave Browser
      sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-releases.s3.brave.com/brave-browser-archive-keyring.gpg
      echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg arch=amd64] https://brave-browser-apt-releases.s3.brave.com/ stable main" | sudo tee /etc/apt/sources.list.d/brave-browser-release.list
      sudo apt-get update
      sudo apt-get install -y brave-browser
      npm ci
      
  - name: Run tests
    run: |
      # Xvfb will be auto-started by brave-real-launcher if needed
      npm test
```

#### Travis CI

```yaml
language: node_js
node_js:
  - "18"
install:
  - npm ci
before_script:
  # Install Brave Browser
  - curl -fsSLo /tmp/brave-browser.deb https://github.com/brave/brave-browser/releases/download/v1.60.125/brave-browser_1.60.125_amd64.deb
  - sudo dpkg -i /tmp/brave-browser.deb || sudo apt-get install -f
  # Xvfb will be automatically managed by brave-real-launcher
script:
  - npm test
```

#### Environment Variables

- `BRAVE_PATH`: Explicit path to Brave binary
- `DISPLAY`: X11 display (auto-managed with Xvfb)
- `HEADLESS`: Set to any value to force headless mode

## Quick Start

After installation, try the example:

```bash
npm install brave-real-launcher
node -e "import('./example.js')"

# Or with headless mode
HEADLESS=true node -e "import('./example.js')"
```

## Platform-Specific Notes

### Linux
- **Xvfb Auto-Detection**: Automatically starts Xvfb when no DISPLAY is available
- **Package Installation**: Supports `.deb` packages and Snap installations
- **Desktop File Parsing**: Reads `.desktop` files for installation discovery

### macOS
- **Universal Binary Support**: Detects both Intel and Apple Silicon versions
- **Launch Services**: Uses macOS Launch Services for comprehensive app discovery
- **Multiple Installation Paths**: Supports `/Applications` and user-specific installations

### Windows
- **Registry Integration**: Queries Windows Registry for installation paths
- **Multi-Architecture**: Supports both x64 and ARM64 architectures
- **Path Normalization**: Handles Windows path formats correctly

## Comparison with chrome-launcher

| Feature | chrome-launcher | brave-real-launcher |
|---------|----------------|--------------------|
| Browser | Chrome/Chromium | Brave Browser |
| Platforms | Linux, macOS, Windows | Linux x64/ARM64, macOS Intel/Apple Silicon, Windows x64/ARM64 |
| Xvfb Support | Manual | Built-in with auto-detection |
| Registry Detection | Basic | Comprehensive Windows Registry support |
| Headless Mode | Manual flags | Built-in option with auto-configuration |
| Launch Modes | Standard | Headless + Desktop GUI with auto-detection |

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## License

Apache-2.0 License - see LICENSE file for details.

## Credits

Based on [chrome-launcher](https://github.com/GoogleChrome/chrome-launcher) by The Chromium Authors. Enhanced for Brave Browser with additional platform support and automation features.

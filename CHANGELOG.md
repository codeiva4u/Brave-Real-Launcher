# Changelog

All notable changes to brave-real-launcher will be documented in this file.

## [1.2.0] - Initial Release

### Added
- 🦁 **Brave Browser Detection**: Multi-platform Brave Browser detection across all architectures
  - Linux x64/ARM64 support with standard paths, Flatpak, and Snap detection
  - macOS Intel/Apple Silicon support for all Brave variants (Stable, Beta, Nightly, Dev)
  - Windows x64/ARM64 support with Registry-based and standard path detection
  
- 🐧 **Xvfb Integration**: Built-in Xvfb support for Linux headless environments
  - Automatic Xvfb management with configurable display, resolution, and depth
  - Smart detection to avoid conflicts with existing X11 sessions
  - Automatic cleanup on process termination
  
- 🎯 **Smart Launch Modes**: Intelligent browser launch mode detection
  - `auto`: Automatically detects headless vs GUI environment
  - `headless`: Forces headless mode with appropriate flags
  - `gui`: Forces GUI mode regardless of environment
  
- 🔄 **Auto-Sync with chrome-launcher**: Automated synchronization system
  - Daily checks for chrome-launcher updates via GitHub Actions
  - Automatic integration of compatible upstream changes
  - Preservation of Brave-specific functionality during sync
  - Version matching with chrome-launcher releases
  
- 🛠️ **Full API Compatibility**: Drop-in replacement for chrome-launcher
  - Compatible Options interface with Brave-specific extensions
  - All original chrome-launcher functionality preserved
  - Extended with Brave-specific browser flags and options
  
- 📦 **Comprehensive Platform Support**:
  - **Linux**: x64, ARM64 architectures
    - Standard paths: `/opt/brave.com/brave/`, `/usr/bin/brave-browser`
    - Package manager installations (APT, DNF, etc.)
    - Flatpak: `com.brave.Browser`
    - Snap: `brave`
    - Desktop file detection in XDG directories
    
  - **macOS**: Intel, Apple Silicon (M1/M2)
    - Application bundle detection in `/Applications/`
    - User-specific installations in `~/Applications/`
    - LSRegister integration for comprehensive discovery
    - Support for Brave Browser, Beta, Nightly, and Dev versions
    
  - **Windows**: x64, ARM64 architectures
    - Registry-based detection (HKLM, HKCU)
    - Standard installation paths in Program Files and AppData
    - Support for both system-wide and user-specific installations
    - Multiple Brave variants detection

- 🔧 **Enhanced Browser Flags**: Brave-optimized default flags
  - Disabled Brave-specific features for automation (Ads, Rewards, News, Wallet)
  - Optimized performance flags for headless operation
  - Security-focused defaults for CI/CD environments
  
- 🚀 **Advanced Features**:
  - Environment variable support (`BRAVE_PATH`, `HEADLESS`, `DISPLAY`)
  - Comprehensive error handling with specific error codes
  - Logging integration with lighthouse-logger
  - Process management with proper cleanup
  - Cross-platform process killing (Windows taskkill, Unix signals)

### Infrastructure
- **GitHub Actions Workflow**: Comprehensive CI/CD pipeline
  - Automatic sync with chrome-launcher updates
  - Multi-platform testing (Ubuntu, Windows, macOS)
  - Multi-Node.js version testing (16, 18, 20)
  - Automated NPM publishing
  - GitHub releases with detailed changelogs
  
- **Testing Infrastructure**:
  - Cross-platform test runners (Bash, PowerShell)
  - Browser detection validation
  - Build verification
  - Export validation
  - Integration testing with real Brave installations
  
- **Developer Experience**:
  - TypeScript with strict configuration
  - Comprehensive JSDoc documentation
  - Example usage files
  - Clear README with multiple use cases
  - Binary executable for path detection

### Technical Details
- **Base Version**: Synced with chrome-launcher v1.2.0
- **Node.js**: Requires >=12.13.0
- **TypeScript**: ES2019 target with ESNext modules
- **Architecture**: Modular design with clear separation of concerns
  - `brave-finder.ts`: Cross-platform browser detection
  - `brave-launcher.ts`: Main launcher logic with Xvfb integration
  - `utils.ts`: Utility functions including Xvfb management
  - `flags.ts`: Brave-optimized default flags
  - `random-port.ts`: Port management utilities

### Dependencies
- **Runtime Dependencies**:
  - `@types/node`: Node.js type definitions
  - `escape-string-regexp`: Regular expression escaping
  - `is-wsl`: WSL environment detection
  - `lighthouse-logger`: Logging framework
  - `which`: Cross-platform executable finding
  
- **Development Dependencies**:
  - `typescript`: TypeScript compiler
  - `@types/mocha`: Mocha type definitions
  - `@types/sinon`: Sinon type definitions
  - `@types/which`: Which type definitions
  - `clang-format`: Code formatting
  - `mocha`: Testing framework
  - `sinon`: Test spies and mocks
  - `ts-node`: TypeScript execution

### API Exports
- `launch(options)`: Main launcher function
- `getBravePath()`: Browser path detection
- `killAll()`: Kill all managed instances
- `BraveLauncher`: Launcher class
- `XvfbManager`: Xvfb management class
- `braveFinder`: Browser detection utilities
- `DEFAULT_FLAGS`: Brave-optimized flags
- `getRandomPort()`: Port utilities
- `getPlatform()`: Platform detection
- `detectDesktopEnvironment()`: Environment detection

### Breaking Changes from chrome-launcher
- Package name: `chrome-launcher` → `brave-real-launcher`
- Browser target: Chrome/Chromium → Brave Browser
- Options interface: `chromeFlags` → `braveFlags`, `chromePath` → `bravePath`
- Error classes: `ChromeNotInstalledError` → `BraveNotInstalledError`
- Environment variables: `CHROME_PATH` → `BRAVE_PATH`

### Future Roadmap
- Additional browser variant support (Brave Nightly, Dev, Beta)
- Extended platform support (FreeBSD, OpenBSD)
- Performance optimizations for browser discovery
- Enhanced Xvfb configuration options
- Integration with popular testing frameworks
- Docker container optimization
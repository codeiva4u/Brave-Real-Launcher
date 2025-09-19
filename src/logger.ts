/**
 * Custom Logger - Compatible replacement for lighthouse-logger
 * Fixes ESM import issues while maintaining API compatibility
 */

export interface Logger {
  log: (prefix: string, message: string, ...args: any[]) => void;
  warn: (prefix: string, message: string, ...args: any[]) => void;
  error: (prefix: string, message: string, ...args: any[]) => void;
  verbose: (prefix: string, message: string, ...args: any[]) => void;
  setLevel: (level: 'silent' | 'error' | 'warn' | 'info' | 'verbose') => void;
  greenify: (text: string) => string;
  redify: (text: string) => string;
  tick: string;
}

class BraveLauncherLogger implements Logger {
  private logLevel: 'silent' | 'error' | 'warn' | 'info' | 'verbose' = 'silent';
  
  private readonly levels = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4
  };

  public readonly tick = '✓';

  constructor() {
    // Auto-detect log level from environment
    if (process.env.DEBUG) {
      this.logLevel = 'verbose';
    } else if (process.env.CI) {
      this.logLevel = 'info';
    }
  }

  setLevel(level: 'silent' | 'error' | 'warn' | 'info' | 'verbose'): void {
    this.logLevel = level;
  }

  private shouldLog(messageLevel: keyof typeof this.levels): boolean {
    return this.levels[messageLevel] <= this.levels[this.logLevel];
  }

  private formatMessage(prefix: string, message: string, level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelPrefix = level.toUpperCase().padEnd(7);
    const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : message;
    return `[${timestamp}] ${levelPrefix} [${prefix}] ${fullMessage}`;
  }

  log(prefix: string, message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage(prefix, message, 'INFO', ...args));
    }
  }

  warn(prefix: string, message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(prefix, message, 'WARN', ...args));
    }
  }

  error(prefix: string, message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(prefix, message, 'ERROR', ...args));
    }
  }

  verbose(prefix: string, message: string, ...args: any[]): void {
    if (this.shouldLog('verbose')) {
      console.log(this.formatMessage(prefix, message, 'VERBOSE', ...args));
    }
  }

  // Color utilities for terminal output
  greenify(text: string): string {
    if (process.stdout.isTTY) {
      return `\x1b[32m${text}\x1b[0m`; // Green color
    }
    return text;
  }

  redify(text: string): string {
    if (process.stdout.isTTY) {
      return `\x1b[31m${text}\x1b[0m`; // Red color
    }
    return text;
  }
}

// Create singleton instance
const log = new BraveLauncherLogger();

export default log;
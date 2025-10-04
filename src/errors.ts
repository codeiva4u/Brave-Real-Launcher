/**
 * Error Handling System for Brave Real Launcher
 * 
 * Provides standardized error classes and utilities for launcher operations
 */

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

export enum ErrorCategory {
  // Browser finding errors
  BROWSER_NOT_FOUND = 'BROWSER_NOT_FOUND',
  INVALID_BROWSER_PATH = 'INVALID_BROWSER_PATH',
  
  // Launch errors
  LAUNCH_FAILED = 'LAUNCH_FAILED',
  LAUNCH_TIMEOUT = 'LAUNCH_TIMEOUT',
  
  // Port errors
  PORT_ALLOCATION_FAILED = 'PORT_ALLOCATION_FAILED',
  PORT_IN_USE = 'PORT_IN_USE',
  
  // Process errors
  PROCESS_CRASHED = 'PROCESS_CRASHED',
  PROCESS_KILLED = 'PROCESS_KILLED',
  
  // System errors
  PLATFORM_UNSUPPORTED = 'PLATFORM_UNSUPPORTED',
  XVFB_FAILED = 'XVFB_FAILED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_FLAGS = 'INVALID_FLAGS',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// ERROR SEVERITY LEVELS
// ============================================================================

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ============================================================================
// CUSTOM ERROR CLASS
// ============================================================================

/**
 * Base error class for Launcher errors
 */
export class LauncherError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly isRecoverable: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  public readonly suggestedAction?: string;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isRecoverable: boolean = false,
    context?: Record<string, any>,
    suggestedAction?: string
  ) {
    super(message);
    this.name = 'LauncherError';
    this.category = category;
    this.severity = severity;
    this.isRecoverable = isRecoverable;
    this.timestamp = new Date();
    this.context = context;
    this.suggestedAction = suggestedAction;
    
    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to user-friendly message
   */
  toUserMessage(): string {
    let message = `❌ Launcher Error: ${this.message}\n\n`;
    message += `📋 Category: ${this.category}\n`;
    message += `⚠️ Severity: ${this.severity}\n`;
    
    if (this.suggestedAction) {
      message += `\n💡 Suggested Action:\n${this.suggestedAction}\n`;
    }
    
    if (this.context && Object.keys(this.context).length > 0) {
      message += `\n🔍 Context:\n${JSON.stringify(this.context, null, 2)}\n`;
    }
    
    return message;
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

/**
 * Create browser not found error
 */
export function createBrowserNotFoundError(
  searchPaths: string[]
): LauncherError {
  return new LauncherError(
    'Browser executable not found in expected locations',
    ErrorCategory.BROWSER_NOT_FOUND,
    ErrorSeverity.CRITICAL,
    false,
    { searchPaths },
    'Install Brave or Chrome browser, or provide a custom path using chromePath option.'
  );
}

/**
 * Create invalid browser path error
 */
export function createInvalidBrowserPathError(
  path: string,
  reason: string
): LauncherError {
  return new LauncherError(
    `Invalid browser path: ${path}. ${reason}`,
    ErrorCategory.INVALID_BROWSER_PATH,
    ErrorSeverity.HIGH,
    false,
    { path, reason },
    'Ensure the browser executable exists and is accessible.'
  );
}

/**
 * Create launch failed error
 */
export function createLaunchFailedError(
  originalError: Error,
  context?: Record<string, any>
): LauncherError {
  return new LauncherError(
    `Failed to launch browser: ${originalError.message}`,
    ErrorCategory.LAUNCH_FAILED,
    ErrorSeverity.CRITICAL,
    true,
    { originalError: originalError.message, ...context },
    'Check browser installation and system resources. Try with different launch flags.'
  );
}

/**
 * Create launch timeout error
 */
export function createLaunchTimeoutError(
  timeout: number
): LauncherError {
  return new LauncherError(
    `Browser launch timed out after ${timeout}ms`,
    ErrorCategory.LAUNCH_TIMEOUT,
    ErrorSeverity.HIGH,
    true,
    { timeout },
    'Increase timeout value or check system resources.'
  );
}

/**
 * Create port allocation error
 */
export function createPortAllocationError(
  attemptedPorts: number[]
): LauncherError {
  return new LauncherError(
    'Failed to allocate available port for browser',
    ErrorCategory.PORT_ALLOCATION_FAILED,
    ErrorSeverity.HIGH,
    true,
    { attemptedPorts },
    'Close other applications using ports or specify a custom port.'
  );
}

/**
 * Create port in use error
 */
export function createPortInUseError(
  port: number
): LauncherError {
  return new LauncherError(
    `Port ${port} is already in use`,
    ErrorCategory.PORT_IN_USE,
    ErrorSeverity.MEDIUM,
    true,
    { port },
    'Use a different port or close the application using this port.'
  );
}

/**
 * Create process crashed error
 */
export function createProcessCrashedError(
  exitCode?: number
): LauncherError {
  return new LauncherError(
    `Browser process crashed${exitCode !== undefined ? ` with exit code ${exitCode}` : ''}`,
    ErrorCategory.PROCESS_CRASHED,
    ErrorSeverity.CRITICAL,
    true,
    { exitCode },
    'Check browser logs and system resources. Try relaunching.'
  );
}

/**
 * Create platform unsupported error
 */
export function createPlatformUnsupportedError(
  platform: string
): LauncherError {
  return new LauncherError(
    `Platform '${platform}' is not supported`,
    ErrorCategory.PLATFORM_UNSUPPORTED,
    ErrorSeverity.CRITICAL,
    false,
    { platform },
    'This launcher supports Windows, macOS, and Linux only.'
  );
}

/**
 * Create XVFB error
 */
export function createXvfbError(
  originalError: Error
): LauncherError {
  return new LauncherError(
    `Xvfb initialization failed: ${originalError.message}`,
    ErrorCategory.XVFB_FAILED,
    ErrorSeverity.MEDIUM,
    false,
    { originalError: originalError.message },
    'Install Xvfb on Linux: sudo apt-get install xvfb'
  );
}

/**
 * Create invalid config error
 */
export function createInvalidConfigError(
  configKey: string,
  expectedType: string,
  actualValue: any
): LauncherError {
  return new LauncherError(
    `Invalid configuration for '${configKey}': expected ${expectedType}, got ${typeof actualValue}`,
    ErrorCategory.INVALID_CONFIG,
    ErrorSeverity.HIGH,
    false,
    { configKey, expectedType, actualValue },
    `Provide a valid ${expectedType} value for ${configKey}.`
  );
}

/**
 * Create invalid flags error
 */
export function createInvalidFlagsError(
  invalidFlags: string[]
): LauncherError {
  return new LauncherError(
    `Invalid browser flags: ${invalidFlags.join(', ')}`,
    ErrorCategory.INVALID_FLAGS,
    ErrorSeverity.MEDIUM,
    false,
    { invalidFlags },
    'Check browser flag syntax and compatibility.'
  );
}

/**
 * Create insufficient permissions error
 */
export function createInsufficientPermissionsError(
  operation: string
): LauncherError {
  return new LauncherError(
    `Insufficient permissions to ${operation}`,
    ErrorCategory.INSUFFICIENT_PERMISSIONS,
    ErrorSeverity.HIGH,
    false,
    { operation },
    'Run with appropriate permissions or check file/directory access rights.'
  );
}

// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

/**
 * Categorize a generic error into LauncherError
 */
export function categorizeError(error: unknown): LauncherError {
  // Already a LauncherError
  if (error instanceof LauncherError) {
    return error;
  }
  
  // Convert to Error if not already
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message.toLowerCase();
  
  // Browser not found
  if (message.includes('browser not found') || 
      message.includes('executable not found') ||
      message.includes('enoent')) {
    return new LauncherError(
      err.message,
      ErrorCategory.BROWSER_NOT_FOUND,
      ErrorSeverity.CRITICAL,
      false,
      { originalError: err.message }
    );
  }
  
  // Launch failures
  if (message.includes('failed to launch') || 
      message.includes('spawn') && message.includes('enoent')) {
    return createLaunchFailedError(err);
  }
  
  // Timeout errors
  if (message.includes('timeout')) {
    return new LauncherError(
      err.message,
      ErrorCategory.LAUNCH_TIMEOUT,
      ErrorSeverity.HIGH,
      true,
      { originalError: err.message }
    );
  }
  
  // Port errors
  if (message.includes('eaddrinuse') || message.includes('address in use')) {
    return new LauncherError(
      err.message,
      ErrorCategory.PORT_IN_USE,
      ErrorSeverity.MEDIUM,
      true,
      { originalError: err.message }
    );
  }
  
  // Permission errors
  if (message.includes('eacces') || message.includes('permission denied')) {
    return new LauncherError(
      err.message,
      ErrorCategory.INSUFFICIENT_PERMISSIONS,
      ErrorSeverity.HIGH,
      false,
      { originalError: err.message }
    );
  }
  
  // Process crashes
  if (message.includes('crash') || message.includes('exit code')) {
    return new LauncherError(
      err.message,
      ErrorCategory.PROCESS_CRASHED,
      ErrorSeverity.CRITICAL,
      true,
      { originalError: err.message }
    );
  }
  
  // Default unknown error
  return new LauncherError(
    err.message,
    ErrorCategory.UNKNOWN_ERROR,
    ErrorSeverity.MEDIUM,
    false,
    { originalError: err.message, stack: err.stack }
  );
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof LauncherError) {
    return error.isRecoverable;
  }
  
  const categorized = categorizeError(error);
  return categorized.isRecoverable;
}

/**
 * Get recovery strategy for an error
 */
export function getRecoveryStrategy(error: LauncherError): string | null {
  if (!error.isRecoverable) {
    return null;
  }
  
  switch (error.category) {
    case ErrorCategory.LAUNCH_FAILED:
    case ErrorCategory.LAUNCH_TIMEOUT:
      return 'retry_launch';
    
    case ErrorCategory.PORT_IN_USE:
    case ErrorCategory.PORT_ALLOCATION_FAILED:
      return 'retry_with_different_port';
    
    case ErrorCategory.PROCESS_CRASHED:
      return 'relaunch_browser';
    
    default:
      return 'retry_operation';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default LauncherError;

/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {join} from 'path';
import childProcess from 'child_process';
import {mkdirSync} from 'fs';
import isWsl from 'is-wsl';
import which from 'which';
import log from './logger.js';

export const enum LaunchErrorCodes {
  ERR_LAUNCHER_PATH_NOT_SET = 'ERR_LAUNCHER_PATH_NOT_SET',
  ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY = 'ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY',
  ERR_LAUNCHER_UNSUPPORTED_PLATFORM = 'ERR_LAUNCHER_UNSUPPORTED_PLATFORM',
  ERR_LAUNCHER_NOT_INSTALLED = 'ERR_LAUNCHER_NOT_INSTALLED',
  ERR_LAUNCHER_XVFB_NOT_FOUND = 'ERR_LAUNCHER_XVFB_NOT_FOUND',
}

export function defaults<T>(val: T|undefined, def: T): T {
  return typeof val === 'undefined' ? def : val;
}

export async function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export class LauncherError extends Error {
  constructor(public message: string = 'Unexpected error', public code?: string) {
    super();
    this.stack = new Error().stack;
    return this;
  }
}

export class BravePathNotSetError extends LauncherError {
  message =
      'The BRAVE_PATH environment variable must be set to a Brave Browser executable or Brave Browser not found.';
  code = LaunchErrorCodes.ERR_LAUNCHER_PATH_NOT_SET;
}

export class InvalidUserDataDirectoryError extends LauncherError {
  message = 'userDataDir must be false or a path.';
  code = LaunchErrorCodes.ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY;
}

export class UnsupportedPlatformError extends LauncherError {
  message = `Platform ${getPlatform()} is not supported.`;
  code = LaunchErrorCodes.ERR_LAUNCHER_UNSUPPORTED_PLATFORM;
}

export class BraveNotInstalledError extends LauncherError {
  message = 'No Brave Browser installations found.';
  code = LaunchErrorCodes.ERR_LAUNCHER_NOT_INSTALLED;
}

export class XvfbNotFoundError extends LauncherError {
  message = 'Xvfb not found. Please install xvfb: sudo apt-get install xvfb';
  code = LaunchErrorCodes.ERR_LAUNCHER_XVFB_NOT_FOUND;
}

export function getPlatform() {
  return isWsl ? 'wsl' : process.platform;
}

export function makeTmpDir() {
  switch (getPlatform()) {
    case 'darwin':
    case 'linux':
      return makeUnixTmpDir();
    case 'wsl':
      // We populate the user's Windows temp dir so the folder is correctly created later
      process.env.TEMP = getWSLLocalAppDataPath(`${process.env.PATH}`);
    case 'win32':
      return makeWin32TmpDir();
    default:
      throw new UnsupportedPlatformError();
  }
}

export interface XvfbOptions {
  display?: string;
  width?: number;
  height?: number;
  depth?: number;
  enableXvfb?: boolean;
  xvfbArgs?: string[];
}

export class XvfbManager {
  private xvfbProcess?: childProcess.ChildProcess;
  private display: string;
  private originalDisplay?: string;

  constructor(private options: XvfbOptions = {}) {
    this.display = options.display || ':99';
  }

  async start(): Promise<void> {
    if (getPlatform() !== 'linux') {
      log.warn('BraveLauncher', 'Xvfb is only supported on Linux');
      return;
    }

    // Check if Xvfb is available
    try {
      which.sync('Xvfb');
    } catch (e) {
      throw new XvfbNotFoundError();
    }

    // Check if display is already in use
    if (this.isDisplayInUse(this.display)) {
      log.warn('BraveLauncher', `Display ${this.display} is already in use`);
      return;
    }

    const width = this.options.width || 1920;
    const height = this.options.height || 1080;
    const depth = this.options.depth || 24;

    const xvfbArgs = [
      this.display,
      '-screen', '0', `${width}x${height}x${depth}`,
      '-ac',
      '+extension', 'GLX',
      '+render',
      '-noreset',
      ...(this.options.xvfbArgs || [])
    ];

    log.verbose('BraveLauncher', `Starting Xvfb with args: ${xvfbArgs.join(' ')}`);

    this.xvfbProcess = childProcess.spawn('Xvfb', xvfbArgs, {
      detached: true,
      stdio: 'ignore'
    });

    // Store original DISPLAY
    this.originalDisplay = process.env.DISPLAY;
    process.env.DISPLAY = this.display;

    // Wait for Xvfb to start
    await this.waitForDisplay();

    log.verbose('BraveLauncher', `Xvfb started successfully on display ${this.display}`);
  }

  async stop(): Promise<void> {
    if (this.xvfbProcess) {
      this.xvfbProcess.kill();
      this.xvfbProcess = undefined;
      
      // Restore original DISPLAY
      if (this.originalDisplay !== undefined) {
        process.env.DISPLAY = this.originalDisplay;
      } else {
        delete process.env.DISPLAY;
      }
      
      log.verbose('BraveLauncher', 'Xvfb stopped');
    }
  }

  private isDisplayInUse(display: string): boolean {
    try {
      const lockFile = `/tmp/.X${display.substring(1)}-lock`;
      require('fs').accessSync(lockFile);
      return true;
    } catch (e) {
      return false;
    }
  }

  private async waitForDisplay(timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        childProcess.execSync(`xdpyinfo -display ${this.display}`, { 
          stdio: 'ignore',
          timeout: 1000
        });
        return;
      } catch (e) {
        await delay(100);
      }
    }
    
    throw new Error(`Xvfb did not start within ${timeout}ms`);
  }
}

export function detectDesktopEnvironment(): 'headless' | 'gui' {
  if (getPlatform() !== 'linux') {
    return 'gui';
  }

  // Check if running in headless environment
  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    return 'headless';
  }

  // Check for known headless indicators
  if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.HEADLESS) {
    return 'headless';
  }

  return 'gui';
}

function toWinDirFormat(dir: string = ''): string {
  const results = /\/mnt\/([a-z])\//.exec(dir);

  if (!results) {
    return dir;
  }

  const driveLetter = results[1];
  return dir.replace(`/mnt/${driveLetter}/`, `${driveLetter.toUpperCase()}:\\\\`)
      .replace(/\//g, '\\\\');
}

export function toWin32Path(dir: string = ''): string {
  if (/[a-z]:\\\\/iu.test(dir)) {
    return dir;
  }

  try {
    return childProcess.execFileSync('wslpath', ['-w', dir]).toString().trim();
  } catch {
    return toWinDirFormat(dir);
  }
}

export function toWSLPath(dir: string, fallback: string): string {
  try {
    return childProcess.execFileSync('wslpath', ['-u', dir]).toString().trim();
  } catch {
    return fallback;
  }
}

function getLocalAppDataPath(path: string): string {
  const userRegExp = /\/mnt\/([a-z])\/Users\/([^\/:]+)\/AppData\//;
  const results = userRegExp.exec(path) || [];

  return `/mnt/${results[1]}/Users/${results[2]}/AppData/Local`;
}

export function getWSLLocalAppDataPath(path: string): string {
  const userRegExp = /\/([a-z])\/Users\/([^\/:]+)\/AppData\//;
  const results = userRegExp.exec(path) || [];

  return toWSLPath(
      `${results[1]}:\\\\Users\\\\${results[2]}\\\\AppData\\\\Local`, getLocalAppDataPath(path));
}

function makeUnixTmpDir() {
  return childProcess.execSync('mktemp -d -t lighthouse.XXXXXXX').toString().trim();
}

function makeWin32TmpDir() {
  const winTmpPath = process.env.TEMP || process.env.TMP ||
      (process.env.SystemRoot || process.env.windir) + '\\\\temp';
  const randomNumber = Math.floor(Math.random() * 9e7 + 1e7);
  const tmpdir = join(winTmpPath, 'lighthouse.' + randomNumber);

  mkdirSync(tmpdir, {recursive: true});
  return tmpdir;
}

export {childProcess as _childProcessForTesting};
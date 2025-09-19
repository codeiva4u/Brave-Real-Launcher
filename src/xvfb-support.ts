/**
 * @license Copyright 2024 Brave Real Launcher Contributors.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import * as childProcess from 'child_process';
import * as fs from 'fs';
import {getPlatform} from './utils.js';
import log from './logger.js';

export interface XvfbOptions {
  displayNum?: number;
  reuse?: boolean;
  timeout?: number;
  silent?: boolean;
  xvfbArgs?: string[];
}

export class XvfbSupport {
  private display: number;
  private reuse: boolean;
  private timeout: number;
  private silent: boolean;
  private xvfbArgs: string[];
  private xvfbProcess?: childProcess.ChildProcess;
  private originalDisplay?: string;

  constructor(options: XvfbOptions = {}) {
    this.display = options.displayNum || this.findAvailableDisplay();
    this.reuse = options.reuse || false;
    this.timeout = options.timeout || 10000;
    this.silent = options.silent || false;
    this.xvfbArgs = options.xvfbArgs || [
      '-screen', '0', '1920x1080x24',
      '-ac',
      '+extension', 'GLX',
      '+render',
      '-noreset'
    ];
  }

  /**
   * Start Xvfb virtual display
   */
  async start(): Promise<void> {
    if (getPlatform() !== 'linux') {
      if (!this.silent) {
        log.log('XvfbSupport', 'Xvfb is only supported on Linux, skipping...');
      }
      return;
    }

    // Check if Xvfb is installed
    if (!this.isXvfbInstalled()) {
      throw new Error('Xvfb is not installed. Please install it using: sudo apt-get install xvfb');
    }

    // Check if display is already running
    if (this.reuse && this.isDisplayRunning(this.display)) {
      if (!this.silent) {
        log.log('XvfbSupport', `Reusing existing display :${this.display}`);
      }
      this.setDisplay(this.display);
      return;
    }

    // Find available display if current one is in use
    if (this.isDisplayRunning(this.display)) {
      this.display = this.findAvailableDisplay();
      if (!this.silent) {
        log.log('XvfbSupport', `Display :${this.display - 1} is in use, using :${this.display}`);
      }
    }

    return new Promise((resolve, reject) => {
      const args = [`:${this.display}`, ...this.xvfbArgs];
      
      if (!this.silent) {
        log.log('XvfbSupport', `Starting Xvfb on display :${this.display}`);
        log.verbose('XvfbSupport', `Xvfb command: Xvfb ${args.join(' ')}`);
      }

      this.xvfbProcess = childProcess.spawn('Xvfb', args, {
        stdio: this.silent ? 'ignore' : 'inherit',
        detached: false
      });

      this.xvfbProcess.on('error', (err) => {
        if (!this.silent) {
          log.error('XvfbSupport', `Failed to start Xvfb: ${err.message}`);
        }
        reject(err);
      });

      this.xvfbProcess.on('exit', (code, signal) => {
        if (!this.silent) {
          log.log('XvfbSupport', `Xvfb process exited with code ${code} and signal ${signal}`);
        }
      });

      // Wait for Xvfb to be ready
      const startTime = Date.now();
      const checkReady = () => {
        if (this.isDisplayRunning(this.display)) {
          this.setDisplay(this.display);
          if (!this.silent) {
            log.log('XvfbSupport', `Xvfb is ready on display :${this.display}`);
          }
          resolve();
        } else if (Date.now() - startTime > this.timeout) {
          this.stop();
          reject(new Error(`Xvfb failed to start within ${this.timeout}ms`));
        } else {
          setTimeout(checkReady, 100);
        }
      };

      setTimeout(checkReady, 100);
    });
  }

  /**
   * Stop Xvfb virtual display
   */
  stop(): void {
    if (this.xvfbProcess && !this.xvfbProcess.killed) {
      if (!this.silent) {
        log.log('XvfbSupport', `Stopping Xvfb process ${this.xvfbProcess.pid}`);
      }
      
      this.xvfbProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.xvfbProcess && !this.xvfbProcess.killed) {
          this.xvfbProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    // Restore original DISPLAY
    if (this.originalDisplay !== undefined) {
      if (this.originalDisplay) {
        process.env.DISPLAY = this.originalDisplay;
      } else {
        delete process.env.DISPLAY;
      }
    }
  }

  /**
   * Get current display number
   */
  getDisplay(): number {
    return this.display;
  }

  /**
   * Get display string (e.g., ":99")
   */
  getDisplayString(): string {
    return `:${this.display}`;
  }

  /**
   * Check if Xvfb is installed
   */
  private isXvfbInstalled(): boolean {
    try {
      childProcess.execSync('which Xvfb', {stdio: 'ignore'});
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if a display is already running
   */
  private isDisplayRunning(display: number): boolean {
    const lockFile = `/tmp/.X${display}-lock`;
    return fs.existsSync(lockFile);
  }

  /**
   * Find an available display number
   */
  private findAvailableDisplay(): number {
    for (let display = 99; display < 200; display++) {
      if (!this.isDisplayRunning(display)) {
        return display;
      }
    }
    throw new Error('No available display found');
  }

  /**
   * Set the DISPLAY environment variable
   */
  private setDisplay(display: number): void {
    this.originalDisplay = process.env.DISPLAY;
    process.env.DISPLAY = `:${display}`;
  }

  /**
   * Create a new XvfbSupport instance and start it
   */
  static async create(options: XvfbOptions = {}): Promise<XvfbSupport> {
    const xvfb = new XvfbSupport(options);
    await xvfb.start();
    return xvfb;
  }

  /**
   * Auto-detect if Xvfb is needed (no DISPLAY set and on Linux)
   */
  static shouldUseXvfb(): boolean {
    return getPlatform() === 'linux' && !process.env.DISPLAY;
  }
}

export default XvfbSupport;

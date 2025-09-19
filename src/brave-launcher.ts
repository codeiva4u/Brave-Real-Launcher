/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as braveFinder from './brave-finder.js';
import {getRandomPort} from './random-port.js';
import {DEFAULT_FLAGS} from './flags.js';
import {makeTmpDir, defaults, delay, getPlatform, toWin32Path, InvalidUserDataDirectoryError, UnsupportedPlatformError, BraveNotInstalledError, XvfbManager, XvfbOptions, detectDesktopEnvironment} from './utils.js';
import {ChildProcess} from 'child_process';
import {spawn, spawnSync} from 'child_process';
import log from './logger.js';

const isWsl = getPlatform() === 'wsl';
const isWindows = getPlatform() === 'win32';
const _SIGINT = 'SIGINT';
const _SIGINT_EXIT_CODE = 130;
const _SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32', 'wsl']);

type SupportedPlatforms = 'darwin'|'linux'|'win32'|'wsl';

const instances = new Set<Launcher>();

type JSONLike =|{[property: string]: JSONLike}|readonly JSONLike[]|string|number|boolean|null;

export interface Options {
  startingUrl?: string;
  braveFlags?: Array<string>;
  prefs?: Record<string, JSONLike>;
  port?: number;
  portStrictMode?: boolean;
  handleSIGINT?: boolean;
  bravePath?: string;
  userDataDir?: string|boolean;
  logLevel?: 'verbose'|'info'|'error'|'warn'|'silent';
  ignoreDefaultFlags?: boolean;
  connectionPollInterval?: number;
  maxConnectionRetries?: number;
  envVars?: {[key: string]: string|undefined};
  // Brave-specific options
  launchMode?: 'auto' | 'headless' | 'gui';
  xvfbOptions?: XvfbOptions;
  enableXvfb?: boolean;
}

export interface RemoteDebuggingPipes {
  incoming: NodeJS.ReadableStream, outgoing: NodeJS.WritableStream,
}

export interface LaunchedBrave {
  pid: number;
  port: number;
  process: ChildProcess;
  remoteDebuggingPipes: RemoteDebuggingPipes|null;
  kill: () => void;
  xvfbManager?: XvfbManager;
}

export interface ModuleOverrides {
  fs?: typeof fs;
  spawn?: typeof childProcess.spawn;
}

const sigintListener = () => {
  killAll();
  process.exit(_SIGINT_EXIT_CODE);
};

async function launch(opts: Options = {}): Promise<LaunchedBrave> {
  opts.handleSIGINT = defaults(opts.handleSIGINT, true);

  const instance = new Launcher(opts);

  // Kill spawned Brave process in case of ctrl-C.
  if (opts.handleSIGINT && instances.size === 0) {
    process.on(_SIGINT, sigintListener);
  }
  instances.add(instance);

  await instance.launch();

  const kill = () => {
    instances.delete(instance);
    if (instances.size === 0) {
      process.removeListener(_SIGINT, sigintListener);
    }
    instance.kill();
  };

  return {
    pid: instance.pid!,
    port: instance.port!,
    process: instance.braveProcess!,
    remoteDebuggingPipes: instance.remoteDebuggingPipes,
    xvfbManager: instance.xvfbManager,
    kill,
  };
}

/** Returns Brave installation path that brave-launcher will launch by default. */
function getBravePath(): string {
  const installation = Launcher.getFirstInstallation();
  if (!installation) {
    throw new BraveNotInstalledError();
  }
  return installation;
}

function killAll(): Array<Error> {
  let errors = [];
  for (const instance of instances) {
    try {
      instance.kill();
      // only delete if kill did not error
      // this means erroring instances remain in the Set
      instances.delete(instance);
    } catch (err) {
      errors.push(err);
    }
  }
  return errors;
}

class Launcher {
  private tmpDirandPidFileReady = false;
  private pidFile: string;
  private startingUrl: string;
  private outFile?: number;
  private errFile?: number;
  private bravePath?: string;
  private ignoreDefaultFlags?: boolean;
  private braveFlags: string[];
  private prefs: Record<string, JSONLike>;
  private requestedPort?: number;
  private portStrictMode?: boolean;
  private useRemoteDebuggingPipe: boolean;
  private connectionPollInterval: number;
  private maxConnectionRetries: number;
  private fs: typeof fs;
  private spawn: typeof childProcess.spawn;
  private useDefaultProfile: boolean;
  private envVars: {[key: string]: string|undefined};
  private launchMode: 'auto' | 'headless' | 'gui';
  private enableXvfb: boolean;
  private xvfbOptions: XvfbOptions;

  braveProcess?: childProcess.ChildProcess;
  userDataDir?: string;
  port?: number;
  remoteDebuggingPipes: RemoteDebuggingPipes|null = null;
  pid?: number;
  xvfbManager?: XvfbManager;

  constructor(private opts: Options = {}, moduleOverrides: ModuleOverrides = {}) {
    this.fs = moduleOverrides.fs || fs;
    this.spawn = moduleOverrides.spawn || spawn;

    log.setLevel(defaults(this.opts.logLevel, 'silent'));

    // choose the first one (default)
    this.startingUrl = defaults(this.opts.startingUrl, 'about:blank');
    this.braveFlags = defaults(this.opts.braveFlags, []);
    this.prefs = defaults(this.opts.prefs, {});
    this.requestedPort = defaults(this.opts.port, 0);
    this.portStrictMode = opts.portStrictMode;
    this.bravePath = this.opts.bravePath;
    this.ignoreDefaultFlags = defaults(this.opts.ignoreDefaultFlags, false);
    this.connectionPollInterval = defaults(this.opts.connectionPollInterval, 500);
    this.maxConnectionRetries = defaults(this.opts.maxConnectionRetries, 50);
    this.envVars = defaults(opts.envVars, Object.assign({}, process.env));
    this.launchMode = defaults(this.opts.launchMode, 'auto');
    this.enableXvfb = defaults(this.opts.enableXvfb, false);
    this.xvfbOptions = defaults(this.opts.xvfbOptions, {});

    if (typeof this.opts.userDataDir === 'boolean') {
      if (!this.opts.userDataDir) {
        this.useDefaultProfile = true;
        this.userDataDir = undefined;
      } else {
        throw new InvalidUserDataDirectoryError();
      }
    } else {
      this.useDefaultProfile = false;
      this.userDataDir = this.opts.userDataDir;
    }

    // Using startsWith because it could also be --remote-debugging-pipe=cbor
    this.useRemoteDebuggingPipe =
        this.braveFlags.some(f => f.startsWith('--remote-debugging-pipe'));
  }

  private get flags() {
    const flags = this.ignoreDefaultFlags ? [] : DEFAULT_FLAGS.slice();
    
    // When useRemoteDebuggingPipe is true, this.port defaults to 0.
    if (this.port) {
      flags.push(`--remote-debugging-port=${this.port}`);
    }

    if (!this.ignoreDefaultFlags && getPlatform() === 'linux') {
      flags.push('--disable-setuid-sandbox');
    }

    if (!this.useDefaultProfile) {
      // Place Brave profile in a custom location we'll rm -rf later
      // If in WSL, we need to use the Windows format
      flags.push(`--user-data-dir=${isWsl ? toWin32Path(this.userDataDir) : this.userDataDir}`);
    }

    // Handle launch mode
    const effectiveLaunchMode = this.determineEffectiveLaunchMode();
    if (effectiveLaunchMode === 'headless') {
      flags.push('--headless');
    }

    flags.push(...this.braveFlags);
    flags.push(this.startingUrl);

    return flags;
  }

  private determineEffectiveLaunchMode(): 'headless' | 'gui' {
    if (this.launchMode === 'headless') {
      return 'headless';
    }
    
    if (this.launchMode === 'gui') {
      return 'gui';
    }

    // Auto-detection
    if (process.env.HEADLESS) {
      return 'headless';
    }

    const detectedEnv = detectDesktopEnvironment();
    log.verbose('BraveLauncher', `Detected environment: ${detectedEnv}`);
    
    return detectedEnv;
  }

  static defaultFlags() {
    return DEFAULT_FLAGS.slice();
  }

  /** Returns the highest priority brave installation. */
  static getFirstInstallation() {
    if (getPlatform() === 'darwin') return braveFinder.darwinFast();
    return braveFinder[getPlatform() as SupportedPlatforms]()[0];
  }

  /** Returns all available brave installations in decreasing priority order. */
  static getInstallations() {
    return braveFinder[getPlatform() as SupportedPlatforms]();
  }

  // Wrapper function to enable easy testing.
  makeTmpDir() {
    return makeTmpDir();
  }

  private async setupXvfb(): Promise<void> {
    if (!this.enableXvfb && this.determineEffectiveLaunchMode() !== 'headless') {
      return;
    }

    if (getPlatform() !== 'linux') {
      if (this.enableXvfb) {
        log.warn('BraveLauncher', 'Xvfb is only supported on Linux, ignoring enableXvfb option');
      }
      return;
    }

    // Only setup Xvfb in headless environments or when explicitly enabled
    const detectedEnv = detectDesktopEnvironment();
    if (detectedEnv === 'headless' || this.enableXvfb) {
      this.xvfbManager = new XvfbManager(this.xvfbOptions);
      await this.xvfbManager.start();
      log.verbose('BraveLauncher', 'Xvfb setup completed');
    }
  }

  prepare() {
    const platform = getPlatform() as SupportedPlatforms;
    if (!_SUPPORTED_PLATFORMS.has(platform)) {
      throw new UnsupportedPlatformError();
    }

    this.userDataDir = this.userDataDir || this.makeTmpDir();
    this.outFile = this.fs.openSync(`${this.userDataDir}/brave-out.log`, 'a');
    this.errFile = this.fs.openSync(`${this.userDataDir}/brave-err.log`, 'a');

    this.setBrowserPrefs();

    // fix for Node4
    // you can't pass a fd to fs.writeFileSync
    this.pidFile = `${this.userDataDir}/brave.pid`;

    log.verbose('BraveLauncher', `created ${this.userDataDir}`);

    this.tmpDirandPidFileReady = true;
  }

  private setBrowserPrefs() {
    // don't set prefs if not defined
    if (Object.keys(this.prefs).length === 0) {
      return;
    }

    const profileDir = `${this.userDataDir}/Default`;
    if (!this.fs.existsSync(profileDir)) {
      this.fs.mkdirSync(profileDir, {recursive: true});
    }

    const preferenceFile = `${profileDir}/Preferences`;
    try {
      if (this.fs.existsSync(preferenceFile)) {
        // overwrite existing file
        const file = this.fs.readFileSync(preferenceFile, 'utf-8');
        const content = JSON.parse(file);
        this.fs.writeFileSync(preferenceFile, JSON.stringify({...content, ...this.prefs}), 'utf-8');
      } else {
        // create new Preference file
        this.fs.writeFileSync(preferenceFile, JSON.stringify({...this.prefs}), 'utf-8');
      }
    } catch (err) {
      log.log('BraveLauncher', `Failed to set browser prefs: ${err.message}`);
    }
  }

  async launch() {
    // Setup Xvfb first if needed
    await this.setupXvfb();

    if (this.requestedPort !== 0) {
      this.port = this.requestedPort;

      // If an explict port is passed first look for an open connection...
      try {
        await this.isDebuggerReady();
        log.log(
            'BraveLauncher',
            `Found existing Brave already running using port ${this.port}, using that.`);
        return;
      } catch (err) {
        if (this.portStrictMode) {
          throw new Error(`found no Brave at port ${this.requestedPort}`);
        }

        log.log(
            'BraveLauncher',
            `No debugging port found on port ${this.port}, launching a new Brave.`);
      }
    }
    if (this.bravePath === undefined) {
      const installation = Launcher.getFirstInstallation();
      if (!installation) {
        throw new BraveNotInstalledError();
      }

      this.bravePath = installation;
    }

    if (!this.tmpDirandPidFileReady) {
      this.prepare();
    }

    this.pid = await this.spawnProcess(this.bravePath);
    return Promise.resolve();
  }

  private async spawnProcess(execPath: string) {
    const spawnPromise = (async () => {
      if (this.braveProcess) {
        log.log('BraveLauncher', `Brave already running with pid ${this.braveProcess.pid}.`);
        return this.braveProcess.pid;
      }


      // If a zero value port is set, it means the launcher
      // is responsible for generating the port number.
      // We do this here so that we can know the port before
      // we pass it into brave.
      if (this.requestedPort === 0) {
        if (this.useRemoteDebuggingPipe) {
          // When useRemoteDebuggingPipe is true, this.port defaults to 0.
          this.port = 0;
        } else {
          this.port = await getRandomPort();
        }
      }

      log.verbose(
          'BraveLauncher', `Launching with command:\n"${execPath}" ${this.flags.join(' ')}`);
      this.braveProcess = this.spawn(execPath, this.flags, {
        // On non-windows platforms, `detached: true` makes child process a leader of a new
        // process group, making it possible to kill child process tree with `.kill(-pid)` command.
        // @see https://nodejs.org/api/child_process.html#child_process_options_detached
        detached: process.platform !== 'win32',
        stdio: this.useRemoteDebuggingPipe ?
            ['ignore', this.outFile, this.errFile, 'pipe', 'pipe'] :
            ['ignore', this.outFile, this.errFile],
        env: this.envVars
      });

      if (this.braveProcess.pid) {
        this.fs.writeFileSync(this.pidFile, this.braveProcess.pid.toString());
      }
      if (this.useRemoteDebuggingPipe) {
        this.remoteDebuggingPipes = {
          incoming: this.braveProcess.stdio[4] as NodeJS.ReadableStream,
          outgoing: this.braveProcess.stdio[3] as NodeJS.WritableStream,
        };
      }

      log.verbose(
          'BraveLauncher',
          `Brave running with pid ${this.braveProcess.pid} on port ${this.port}.`);
      return this.braveProcess.pid;
    })();

    const pid = await spawnPromise;
    // When useRemoteDebuggingPipe is true, this.port defaults to 0.
    if (this.port !== 0) {
      await this.waitUntilReady();
    }
    return pid;
  }

  private cleanup(client?: net.Socket) {
    if (client) {
      client.removeAllListeners();
      client.end();
      client.destroy();
      client.unref();
    }
  }

  // resolves if ready, rejects otherwise
  private isDebuggerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Note: only meaningful when this.port is set.
      // When useRemoteDebuggingPipe is true, this.port defaults to 0. In that
      // case, we could consider ping-ponging over the pipe, but that may get
      // in the way of the library user, so we do not.
      const client = net.createConnection(this.port!, '127.0.0.1');
      client.once('error', err => {
        this.cleanup(client);
        reject(err);
      });
      client.once('connect', () => {
        this.cleanup(client);
        resolve();
      });
    });
  }

  // resolves when debugger is ready, rejects after 10 polls
  waitUntilReady() {
    const launcher = this;

    return new Promise<void>((resolve, reject) => {
      let retries = 0;
      let waitStatus = 'Waiting for browser.';

      const poll = () => {
        if (retries === 0) {
          log.log('BraveLauncher', waitStatus);
        }
        retries++;
        waitStatus += '..';
        log.log('BraveLauncher', waitStatus);

        launcher.isDebuggerReady()
            .then(() => {
              log.log('BraveLauncher', waitStatus + `${log.greenify(log.tick)}`);
              resolve();
            })
            .catch(err => {
              if (retries > launcher.maxConnectionRetries) {
                log.error('BraveLauncher', err.message);
                const stderr =
                    this.fs.readFileSync(`${this.userDataDir}/brave-err.log`, {encoding: 'utf-8'});
                log.error(
                    'BraveLauncher', `Logging contents of ${this.userDataDir}/brave-err.log`);
                log.error('BraveLauncher', stderr);
                return reject(err);
              }
              delay(launcher.connectionPollInterval).then(poll);
            });
      };
      poll();
    });
  }

  kill() {
    // Stop Xvfb first
    if (this.xvfbManager) {
      this.xvfbManager.stop();
    }

    if (!this.braveProcess) {
      return;
    }

    this.braveProcess.on('close', () => {
      delete this.braveProcess;
      this.destroyTmp();
    });

    log.log('BraveLauncher', `Killing Brave instance ${this.braveProcess.pid}`);
    try {
      if (isWindows) {
        // https://github.com/GoogleChrome/chrome-launcher/issues/266
        const taskkillProc = spawnSync(
            `taskkill /pid ${this.braveProcess.pid} /T /F`, {shell: true, encoding: 'utf-8'});

        const {stderr} = taskkillProc;
        if (stderr) log.error('BraveLauncher', `taskkill stderr`, stderr);
      } else {
        if (this.braveProcess.pid) {
          process.kill(-this.braveProcess.pid, 'SIGKILL');
        }
      }
    } catch (err) {
      const message = `Brave could not be killed ${err.message}`;
      log.warn('BraveLauncher', message);
    }
    this.destroyTmp();
  }

  destroyTmp() {
    if (this.outFile) {
      this.fs.closeSync(this.outFile);
      delete this.outFile;
    }

    // Only clean up the tmp dir if we created it.
    if (this.userDataDir === undefined || this.opts.userDataDir !== undefined) {
      return;
    }

    if (this.errFile) {
      this.fs.closeSync(this.errFile);
      delete this.errFile;
    }

    // backwards support for node v12 + v14.14+
    // https://nodejs.org/api/deprecations.html#DEP0147
    const rmSync = this.fs.rmSync || this.fs.rmdirSync;
    rmSync(this.userDataDir, {recursive: true, force: true, maxRetries: 10});
  }
};

export default Launcher;
export {Launcher, launch, killAll, getBravePath};

// Convenience functions for browser detection
export function getInstallations() {
  return Launcher.getInstallations();
}

export function findBrave() {
  return Launcher.getFirstInstallation();
}

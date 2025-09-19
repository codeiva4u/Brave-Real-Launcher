/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import fs from 'fs';
import path from 'path';
import {homedir} from 'os';
import {execSync} from 'child_process';
import escapeRegExp from 'escape-string-regexp';
import log from './logger.js';
import which from 'which';

import {getWSLLocalAppDataPath, toWSLPath, BravePathNotSetError} from './utils.js';

const newLineRegex = /\r?\n/;

type Priorities = Array<{regex: RegExp, weight: number}>;

/**
 * check for macOS default app paths first to avoid waiting for the slow lsregister command
 */
export function darwinFast(): string|undefined {
  const priorityOptions: Array<string|undefined> = [
    process.env.BRAVE_PATH,
    process.env.LIGHTHOUSE_BRAVE_PATH,
    // Brave Browser paths
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Brave Browser Beta.app/Contents/MacOS/Brave Browser Beta',
    '/Applications/Brave Browser Nightly.app/Contents/MacOS/Brave Browser Nightly',
    '/Applications/Brave Browser Dev.app/Contents/MacOS/Brave Browser Dev',
  ];

  for (const bravePath of priorityOptions) {
    if (bravePath && canAccess(bravePath)) return bravePath;
  }

  return darwin()[0]
}

export function darwin() {
  const suffixes = [
    '/Contents/MacOS/Brave Browser',
    '/Contents/MacOS/Brave Browser Beta',
    '/Contents/MacOS/Brave Browser Nightly',
    '/Contents/MacOS/Brave Browser Dev'
  ];

  const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
      '/Versions/A/Frameworks/LaunchServices.framework' +
      '/Versions/A/Support/lsregister';

  const installations: Array<string> = [];

  const customBravePath = resolveBravePath();
  if (customBravePath) {
    installations.push(customBravePath);
  }

  // Look for Brave Browser installations
  try {
    execSync(
        `${LSREGISTER} -dump` +
        ' | grep -i \'brave browser\\( beta\\| nightly\\| dev\\)\\?\\.app\'' +
        ' | awk \'{$1=""; print $0}\'')
        .toString()
        .split(newLineRegex)
        .forEach((inst: string) => {
          suffixes.forEach(suffix => {
            const execPath = path.join(inst.substring(0, inst.indexOf('.app') + 4).trim(), suffix);
            if (canAccess(execPath) && installations.indexOf(execPath) === -1) {
              installations.push(execPath);
            }
          });
        });
  } catch (e) {
    // lsregister might not be available or might fail
    log.warn('BraveLauncher', 'lsregister command failed, checking default paths');
  }

  // Retains one per line to maintain readability.
  // clang-format off
  const home = escapeRegExp(process.env.HOME || homedir());
  const priorities: Priorities = [
    {regex: new RegExp(`^${home}/Applications/.*Brave Browser\\.app`), weight: 50},
    {regex: new RegExp(`^${home}/Applications/.*Brave Browser Beta\\.app`), weight: 51},
    {regex: new RegExp(`^${home}/Applications/.*Brave Browser Nightly\\.app`), weight: 52},
    {regex: new RegExp(`^${home}/Applications/.*Brave Browser Dev\\.app`), weight: 53},
    {regex: /^\/Applications\/.*Brave Browser\.app/, weight: 100},
    {regex: /^\/Applications\/.*Brave Browser Beta\.app/, weight: 101},
    {regex: /^\/Applications\/.*Brave Browser Nightly\.app/, weight: 102},
    {regex: /^\/Applications\/.*Brave Browser Dev\.app/, weight: 103},
    {regex: /^\/Volumes\/.*Brave Browser\.app/, weight: -2},
    {regex: /^\/Volumes\/.*Brave Browser Beta\.app/, weight: -1},
  ];

  if (process.env.LIGHTHOUSE_BRAVE_PATH) {
    priorities.unshift({regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_BRAVE_PATH)), weight: 150});
  }

  if (process.env.BRAVE_PATH) {
    priorities.unshift({regex: new RegExp(escapeRegExp(process.env.BRAVE_PATH)), weight: 151});
  }

  // clang-format on
  return sort(installations, priorities);
}

function resolveBravePath() {
  if (canAccess(process.env.BRAVE_PATH)) {
    return process.env.BRAVE_PATH;
  }

  if (canAccess(process.env.LIGHTHOUSE_BRAVE_PATH)) {
    log.warn(
        'BraveLauncher',
        'LIGHTHOUSE_BRAVE_PATH is deprecated, use BRAVE_PATH env variable instead.');
    return process.env.LIGHTHOUSE_BRAVE_PATH;
  }

  return undefined;
}

/**
 * Look for linux executables in 3 ways
 * 1. Look into BRAVE_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for brave-browser & brave executables by using the which command
 * Support for both x64 and ARM64 architectures
 */
export function linux() {
  let installations: string[] = [];

  // 1. Look into BRAVE_PATH env variable
  const customBravePath = resolveBravePath();
  if (customBravePath) {
    installations.push(customBravePath);
  }

  // 2. Look into the directories where .desktop are saved on gnome based distro's
  const desktopInstallationFolders = [
    path.join(homedir(), '.local/share/applications/'),
    '/usr/share/applications/',
  ];
  desktopInstallationFolders.forEach(folder => {
    installations = installations.concat(findBraveExecutables(folder));
  });

  // 3. Look for brave-browser, brave, and other brave executables by using the which command
  const executables = [
    'brave-browser',
    'brave-browser-stable',
    'brave-browser-beta',
    'brave-browser-nightly',
    'brave-browser-dev',
    'brave',
    'brave-stable',
    'brave-beta',
    'brave-nightly',
    'brave-dev',
    // Flatpak versions
    'flatpak run com.brave.Browser',
    // Snap versions  
    'brave',
  ];

  // Check standard installation paths for different architectures
  const standardPaths = [
    '/usr/bin/brave-browser',
    '/usr/bin/brave-browser-stable',
    '/usr/bin/brave-browser-beta',
    '/usr/bin/brave-browser-nightly',
    '/usr/bin/brave',
    '/opt/brave.com/brave/brave',
    '/opt/brave.com/brave-beta/brave-beta',
    '/opt/brave.com/brave-nightly/brave-nightly',
    '/opt/brave.com/brave-dev/brave-dev',
    '/snap/bin/brave',
    // ARM64 specific paths
    '/usr/lib/aarch64-linux-gnu/brave/brave',
    '/opt/brave-browser/brave',
    // Additional paths for different distros
    '/usr/local/bin/brave',
    '/usr/local/bin/brave-browser',
  ];

  standardPaths.forEach(bravePath => {
    if (canAccess(bravePath)) {
      installations.push(bravePath);
    }
  });

  executables.forEach((executable: string) => {
    try {
      const bravePath = which.sync(executable, { nothrow: true });
      if (bravePath && canAccess(bravePath)) {
        installations.push(bravePath);
      }
    } catch (e) {
      // Not installed.
    }
  });

  if (!installations.length) {
    throw new BravePathNotSetError();
  }

  const priorities: Priorities = [
    {regex: /brave-wrapper$/, weight: 51},
    {regex: /brave-browser-stable$/, weight: 50},
    {regex: /brave-browser$/, weight: 49},
    {regex: /brave-stable$/, weight: 48},
    {regex: /brave$/, weight: 47},
    {regex: /brave-browser-beta$/, weight: 46},
    {regex: /brave-beta$/, weight: 45},
    {regex: /brave-browser-nightly$/, weight: 44},
    {regex: /brave-nightly$/, weight: 43},
    {regex: /brave-browser-dev$/, weight: 42},
    {regex: /brave-dev$/, weight: 41},
  ];

  if (process.env.LIGHTHOUSE_BRAVE_PATH) {
    priorities.unshift(
        {regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_BRAVE_PATH)), weight: 100});
  }

  if (process.env.BRAVE_PATH) {
    priorities.unshift({regex: new RegExp(escapeRegExp(process.env.BRAVE_PATH)), weight: 101});
  }

  return sort(uniq(installations.filter(Boolean)), priorities);
}

export function wsl() {
  // Manually populate the environment variables assuming it's the default config
  process.env.LOCALAPPDATA = getWSLLocalAppDataPath(`${process.env.PATH}`);
  process.env.PROGRAMFILES = toWSLPath('C:/Program Files', '/mnt/c/Program Files');
  process.env['PROGRAMFILES(X86)'] =
      toWSLPath('C:/Program Files (x86)', '/mnt/c/Program Files (x86)');

  return win32();
}

export function win32() {
  const installations: Array<string> = [];
  
  // Brave Browser installation paths for different architectures
  const suffixes = [
    // Standard x64 installations
    `${path.sep}BraveSoftware${path.sep}Brave-Browser${path.sep}Application${path.sep}brave.exe`,
    `${path.sep}BraveSoftware${path.sep}Brave-Browser-Beta${path.sep}Application${path.sep}brave.exe`,
    `${path.sep}BraveSoftware${path.sep}Brave-Browser-Nightly${path.sep}Application${path.sep}brave.exe`,
    `${path.sep}BraveSoftware${path.sep}Brave-Browser-Dev${path.sep}Application${path.sep}brave.exe`,
    // Alternative paths
    `${path.sep}Brave${path.sep}Application${path.sep}brave.exe`,
    `${path.sep}Brave-Browser${path.sep}Application${path.sep}brave.exe`,
  ];

  const prefixes = [
    process.env.LOCALAPPDATA, 
    process.env.PROGRAMFILES, 
    process.env['PROGRAMFILES(X86)'],
    // Additional paths for ARM64 and other architectures
    process.env.PROGRAMW6432,
  ].filter(Boolean) as string[];

  const customBravePath = resolveBravePath();
  if (customBravePath) {
    installations.push(customBravePath);
  }

  // Check standard installation paths
  prefixes.forEach(prefix => suffixes.forEach(suffix => {
    const bravePath = path.join(prefix, suffix);
    if (canAccess(bravePath)) {
      installations.push(bravePath);
    }
  }));

  // Check Windows Registry for Brave installations
  try {
    const registryPaths = getWindowsRegistryBravePaths();
    registryPaths.forEach(regPath => {
      if (canAccess(regPath)) {
        installations.push(regPath);
      }
    });
  } catch (e) {
    log.warn('BraveLauncher', 'Failed to read Windows registry for Brave paths');
  }

  return installations;
}

function getWindowsRegistryBravePaths(): string[] {
  const paths: string[] = [];
  
  // Registry keys where Brave might be registered
  const registryKeys = [
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\BraveSoftware\\Brave',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\BraveSoftware\\Brave',
    'HKEY_CURRENT_USER\\SOFTWARE\\BraveSoftware\\Brave',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\brave.exe',
  ];

  registryKeys.forEach(key => {
    try {
      const result = execSync(`reg query "${key}" /ve 2>nul`, {encoding: 'utf-8'});
      const match = result.match(/REG_SZ\s+(.+)/);
      if (match && match[1]) {
        const bravePath = match[1].trim();
        if (bravePath && canAccess(bravePath)) {
          paths.push(bravePath);
        }
      }
    } catch (e) {
      // Registry key doesn't exist or access denied
    }
  });

  return paths;
}

function sort(installations: string[], priorities: Priorities) {
  const defaultPriority = 10;
  return installations
      // assign priorities
      .map((inst: string) => {
        for (const pair of priorities) {
          if (pair.regex.test(inst)) {
            return {path: inst, weight: pair.weight};
          }
        }
        return {path: inst, weight: defaultPriority};
      })
      // sort based on priorities
      .sort((a, b) => (b.weight - a.weight))
      // remove priority flag
      .map(pair => pair.path);
}

function canAccess(file: string|undefined): Boolean {
  if (!file) {
    return false;
  }

  try {
    fs.accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}

function uniq(arr: Array<any>) {
  return Array.from(new Set(arr));
}

function findBraveExecutables(folder: string): Array<string> {
  const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
  const braveExecRegex = '^Exec=\\/.*\\/(brave|brave-browser|brave-browser-stable|brave-browser-beta|brave-browser-nightly)-.*';

  let installations: Array<string> = [];
  if (canAccess(folder)) {
    // Output of the grep & print looks like:
    //    /opt/brave.com/brave/brave --profile-directory
    //    /home/user/Downloads/brave-linux/brave-wrapper %U
    let execPaths;

    // Some systems do not support grep -R so fallback to -r.
    try {
      execPaths = execSync(
          `grep -ER "${braveExecRegex}" ${folder} | awk -F '=' '{print $2}'`, {stdio: 'pipe'});
    } catch (e) {
      try {
        execPaths = execSync(
            `grep -Er "${braveExecRegex}" ${folder} | awk -F '=' '{print $2}'`, {stdio: 'pipe'});
      } catch (e2) {
        return installations;
      }
    }

    execPaths = execPaths.toString()
                    .split(newLineRegex)
                    .map((execPath: string) => execPath.replace(argumentsRegex, '$1'));

    execPaths.forEach((execPath: string) => canAccess(execPath) && installations.push(execPath));
  }

  return installations;
}
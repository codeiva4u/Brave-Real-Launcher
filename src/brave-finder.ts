/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as execSync from 'child_process';
import {execFileSync} from 'child_process';
import {homedir} from 'os';
// getPlatform imported but not used in this file - removing to fix TS error

import escapeStringRegexp from 'escape-string-regexp';

const newLineRegex = /\r?\n/;

type Priorities = Array<{regex: RegExp, weight: number}>;

export function darwin() {
  const suffixes = [
    '/Contents/MacOS/Brave Browser',
    '/Contents/MacOS/Brave Browser Beta',
    '/Contents/MacOS/Brave Browser Dev',
    '/Contents/MacOS/Brave Browser Nightly'
  ];

  const LSREGISTER =
      '/System/Library/Frameworks/CoreServices.framework' +
      '/Versions/A/Frameworks/LaunchServices.framework' +
      '/Versions/A/Support/lsregister';

  const installations: Array<string> = [];
  const customBravePath = resolvePathsToExecutables([
    process.env.BRAVE_PATH,
    process.env.BRAVE_BROWSER_PATH
  ]);
  if (customBravePath) {
    installations.push(customBravePath);
  }

  execFileSync(LSREGISTER, ['-dump'])
      .toString()
      .split(newLineRegex)
      .forEach((line) => {
        const match = line.match(/\s+path:\s+(.*)$/);
        if (!match || !match[1]) {
          return;
        }
        const installPath = match[1];
        suffixes.forEach(suffix => {
          const executablePath = installPath + suffix;
          if (canAccess(executablePath) && installations.indexOf(executablePath) === -1) {
            installations.push(executablePath);
          }
        });
      });

  // Retains one per line to maintain readability.
  // clang-format off
  const priorities: Priorities = [
    {regex: new RegExp(`^${process.env.HOME}/Applications/.*Brave Browser.app`), weight: 50},
    {regex: new RegExp(`^${process.env.HOME}/Applications/.*Brave Browser Beta.app`), weight: 40},
    {regex: new RegExp(`^${process.env.HOME}/Applications/.*Brave Browser Dev.app`), weight: 30},
    {regex: new RegExp(`^${process.env.HOME}/Applications/.*Brave Browser Nightly.app`), weight: 20},
    {regex: /^\/Applications\/.*Brave Browser.app/, weight: 100},
    {regex: /^\/Applications\/.*Brave Browser Beta.app/, weight: 90},
    {regex: /^\/Applications\/.*Brave Browser Dev.app/, weight: 80},
    {regex: /^\/Applications\/.*Brave Browser Nightly.app/, weight: 70},
    {regex: /^\/Volumes\/.*Brave Browser.app/, weight: -2},
    {regex: /^\/Volumes\/.*Brave Browser Beta.app/, weight: -4},
    {regex: /^\/Volumes\/.*Brave Browser Dev.app/, weight: -6},
    {regex: /^\/Volumes\/.*Brave Browser Nightly.app/, weight: -8},
  ];
  // clang-format on

  if (process.env.HOME) {
    priorities.push({regex: new RegExp(`^${process.env.HOME}/Applications/.*`), weight: -10});
  }

  return sort(installations, priorities);
}

/**
 * Look for linux executables in 3 ways
 * 1. Look into BRAVE_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for brave-browser executables by using the which command
 */
export function linux() {
  let installations: string[] = [];

  // 1. Look into BRAVE_PATH env variable
  const customBravePath = resolvePathsToExecutables([
    process.env.BRAVE_PATH,
    process.env.BRAVE_BROWSER_PATH,
  ]);
  if (customBravePath) {
    installations.push(customBravePath);
  }

  // 2. Look into the directories where .desktop are saved on gnome based distro's
  const desktopInstallationPaths = [
    path.join(homedir(), '.local/share/applications/'),
    '/usr/share/applications/',
  ];
  desktopInstallationPaths.forEach(basePath => {
    const desktopPath = path.join(basePath, 'brave-browser.desktop');
    const desktopPathBeta = path.join(basePath, 'brave-browser-beta.desktop');
    const desktopPathDev = path.join(basePath, 'brave-browser-dev.desktop');
    const desktopPathNightly = path.join(basePath, 'brave-browser-nightly.desktop');
    
    for (const desktopFile of [desktopPath, desktopPathBeta, desktopPathDev, desktopPathNightly]) {
      if (canAccess(desktopFile)) {
        // Parse the .desktop file to find the executable path
        const content = fs.readFileSync(desktopFile, 'utf-8');
        const execMatch = content.match(/^Exec=(.*)$/m);
        if (execMatch) {
          const execPath = execMatch[1].split(' ')[0].replace('%U', '').trim();
          if (canAccess(execPath) && installations.indexOf(execPath) === -1) {
            installations.push(execPath);
          }
        }
      }
    }
  });

  // 3. Look for brave-browser executables by using the which command
  const executables = [
    'brave-browser',
    'brave-browser-stable',
    'brave-browser-beta',
    'brave-browser-dev',
    'brave-browser-nightly',
    'brave',
  ];
  executables.forEach((executable) => {
    try {
      const bravePath =
          execSync.execFileSync('which', [executable], {encoding: 'utf8', stdio: 'pipe'}).trim();

      if (canAccess(bravePath) && installations.indexOf(bravePath) === -1) {
        installations.push(bravePath);
      }
    } catch (e) {
      // Not installed.
    }
  });

  if (!installations.length) {
    throw new Error(
        'The environment variable BRAVE_PATH must be set to executable of a build of Brave. ' +
        'The current PATH is "' + process.env.PATH +
        '". For example, export BRAVE_PATH=/usr/bin/brave-browser');
  }

  const priorities: Priorities = [
    {regex: /brave-browser$/, weight: 51},
    {regex: /brave-browser-stable$/, weight: 50},
    {regex: /brave-browser-beta$/, weight: 40},
    {regex: /brave-browser-dev$/, weight: 30},
    {regex: /brave-browser-nightly$/, weight: 20},
    {regex: /brave$/, weight: 10},
  ];

  if (process.env.BRAVE_PATH) {
    priorities.unshift({regex: new RegExp(`${escapeStringRegexp(process.env.BRAVE_PATH)}`), weight: 101});
  }

  return sort(uniq(installations.filter(Boolean)), priorities);
}

export function wsl() {
  // Manually populate the environment variables assuming it's the default config
  process.env.PROGRAMFILES = process.env.PROGRAMFILES || '/mnt/c/Program Files';
  process.env.LOCALAPPDATA = process.env.LOCALAPPDATA || '/mnt/c/Users/' + process.env.USER + '/AppData/Local';
  process.env.PROGRAMFILES_X86 = process.env.PROGRAMFILES_X86 || '/mnt/c/Program Files (x86)';

  return win32();
}

export function win32() {
  const installations: string[] = [];
  const suffixes = [
    `${path.sep}BraveSoftware${path.sep}Brave-Browser${path.sep}Application${path.sep}brave.exe`,
    `${path.sep}BraveSoftware${path.sep}Brave-Browser-Beta${path.sep}Application${path.sep}brave.exe`,
    `${path.sep}BraveSoftware${path.sep}Brave-Browser-Dev${path.sep}Application${path.sep}brave.exe`,
    `${path.sep}BraveSoftware${path.sep}Brave-Browser-Nightly${path.sep}Application${path.sep}brave.exe`,
  ];
  const prefixes = [
    process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env.PROGRAMFILES_X86
  ].filter(Boolean);

  // Use env variable first
  const customBravePath = resolvePathsToExecutables([
    process.env.BRAVE_PATH,
    process.env.BRAVE_BROWSER_PATH,
  ]);
  if (customBravePath) {
    installations.push(customBravePath);
  }

  prefixes.forEach(prefix => suffixes.forEach(suffix => {
    const bravePath = path.join(prefix!, suffix);
    if (canAccess(bravePath)) {
      installations.push(bravePath);
    }
  }));

  // Check Windows Registry for Brave installation paths
  try {
    const regKeys = [
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\BraveSoftware\\Brave-Browser\\Clients',
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\BraveSoftware\\Brave-Browser\\Clients',
      'HKEY_CURRENT_USER\\SOFTWARE\\BraveSoftware\\Brave-Browser\\Clients',
    ];
    
    for (const regKey of regKeys) {
      try {
        // Suppress both stdout and stderr to avoid error messages
        const regOutput = execSync.execSync(`reg query "${regKey}" /s 2>nul`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'] // ignore stderr
        }).toString();
        
        const pathMatches = regOutput.match(/REG_SZ\s+(.+\.exe)/g);
        if (pathMatches) {
          pathMatches.forEach(match => {
            const bravePath = match.replace(/REG_SZ\s+/, '').trim();
            if (canAccess(bravePath) && installations.indexOf(bravePath) === -1) {
              installations.push(bravePath);
            }
          });
        }
      } catch (e) {
        // Registry key not found, continue silently
      }
    }
  } catch (e) {
    // Registry access failed
  }

  const priorities: Priorities = [
    {regex: /_x86_.*brave\.exe$/i, weight: 10},
    {regex: /brave\.exe$/i, weight: 100},
    {regex: /brave-browser\.exe$/i, weight: 90},
    {regex: /BraveSoftware.*brave\.exe$/i, weight: 80},
  ];
  return sort(uniq(installations.filter(Boolean).map(normalizeBravePath)), priorities);
}

function normalizeBravePath(bravePath: string) {
  // normalize on win32
  return bravePath.replace(/\//g, '\\');
}

function darwinFast(): string | undefined {
  const priorities: Priorities = [
    {regex: /^\/Applications\/Brave Browser.app/, weight: 100},
    {regex: /^\/Applications\/Brave Browser Beta.app/, weight: 90},
    {regex: /^\/Applications\/Brave Browser Dev.app/, weight: 80},
    {regex: /^\/Applications\/Brave Browser Nightly.app/, weight: 70},
  ];

  if (process.env.HOME) {
    priorities.push({regex: new RegExp(`^${process.env.HOME}/Applications/.*Brave Browser.app`), weight: 50});
  }

  const suffixes = [
    '/Contents/MacOS/Brave Browser'
  ];
  const bravePath = `/Applications/Brave Browser.app${suffixes[0]}`;

  if (canAccess(bravePath)) {
    return bravePath;
  }

  const installations: string[] = [];
  const customBravePath = resolvePathsToExecutables([
    process.env.BRAVE_PATH,
    process.env.BRAVE_BROWSER_PATH,
  ]);
  if (customBravePath) {
    installations.push(customBravePath);
  }

  const defaultPaths = [
    `/Applications/Brave Browser.app${suffixes[0]}`,
    `/Applications/Brave Browser Beta.app${suffixes[0]}`,
    `/Applications/Brave Browser Dev.app${suffixes[0]}`,
    `/Applications/Brave Browser Nightly.app${suffixes[0]}`,
  ];

  if (process.env.HOME) {
    defaultPaths.push(...[
      `${process.env.HOME}/Applications/Brave Browser.app${suffixes[0]}`,
      `${process.env.HOME}/Applications/Brave Browser Beta.app${suffixes[0]}`,
      `${process.env.HOME}/Applications/Brave Browser Dev.app${suffixes[0]}`,
      `${process.env.HOME}/Applications/Brave Browser Nightly.app${suffixes[0]}`,
    ]);
  }

  for (const p of defaultPaths) {
    if (canAccess(p)) {
      installations.push(p);
    }
  }

  if (installations.length) {
    return sort(installations, priorities)[0];
  }

  return undefined;
}


function sort(installations: string[], priorities: Priorities): string[] {
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

function canAccess(file: string): boolean {
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

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}


function resolvePathsToExecutables(paths: (string|undefined)[]): string|undefined {
  for (const bravePath of paths) {
    if (bravePath && canAccess(bravePath)) return bravePath;
  }
  return undefined;
}

export {darwinFast};

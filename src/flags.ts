/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Default flags optimized for Brave Browser automation and testing
 * Based on chrome-launcher flags but adapted for Brave Browser specifics
 */

export const DEFAULT_FLAGS: ReadonlyArray<string> = [
  '--disable-features=' +
      [
        // Disable built-in translation services
        'Translate',
        // Disable the Chrome Optimization Guide background networking
        'OptimizationHints',
        //  Disable the Chrome Media Router (cast target discovery) background networking
        'MediaRouter',
        /// Avoid the startup dialog for network connections
        'DialMediaRouteProvider',
        // Disable window occlusion calculation
        'CalculateNativeWinOcclusion',
        // Disables the Discover feed on NTP
        'InterestFeedContentSuggestions',
        // Don't update the CT lists
        'CertificateTransparencyComponentUpdater',
        // Disables autofill server communication
        'AutofillServerCommunication',
        // Disables "Enhanced ad privacy" dialogs
        'PrivacySandboxSettings4',
        // Brave-specific: disable Brave Ads
        'BraveAds',
        // Brave-specific: disable Brave Rewards
        'BraveRewards',
        // Brave-specific: disable Brave News
        'BraveNews',
        // Brave-specific: disable Brave Wallet notifications
        'BraveWallet',
      ].join(','),

  // Disable all extensions
  '--disable-extensions',
  // Disable some extensions that aren't affected by --disable-extensions
  '--disable-component-extensions-with-background-pages',
  // Disable various background network services
  '--disable-background-networking',
  // Don't update the browser 'components'
  '--disable-component-update',
  // Disables client-side phishing detection
  '--disable-client-side-phishing-detection',
  // Disable syncing to accounts
  '--disable-sync',
  // Disable reporting to UMA, but allows for collection
  '--metrics-recording-only',
  // Disable installation of default apps on first run
  '--disable-default-apps',
  // Mute any audio
  '--mute-audio',
  // Disable the default browser check
  '--no-default-browser-check',
  // Skip first run wizards
  '--no-first-run',
  // Disable backgrounding renders for occluded windows
  '--disable-backgrounding-occluded-windows',
  // Disable renderer process backgrounding
  '--disable-renderer-backgrounding',
  // Disable task throttling of timer tasks from background pages
  '--disable-background-timer-throttling',
  // Disable the default throttling of IPC between renderer & browser processes
  '--disable-ipc-flooding-protection',
  // Use basic password store to avoid keyring issues
  '--password-store=basic',
  // Use mock keychain on Mac to prevent blocking permissions dialogs
  '--use-mock-keychain',
  // Disable background tracing
  '--force-fieldtrials=*BackgroundTracing/default/',

  // Suppresses hang monitor dialogs in renderer processes
  '--disable-hang-monitor',
  // Disable prompt on repost
  '--disable-prompt-on-repost',
  // Disables Domain Reliability Monitoring
  '--disable-domain-reliability',
  // Disable the in-product Help (IPH) system
  '--propagate-iph-for-testing',

  // Brave-specific flags
  // Disable Brave's secure DNS
  '--disable-brave-secure-dns',
  // Disable Brave's update notifications
  '--disable-brave-update',
  // Disable Brave's tor client
  '--disable-tor-client-updater',
];
/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const _set = require('lodash.set');

const i18n = require('./i18n.js');

/**
 * @fileoverview Use the lhr.i18n.icuMessagePaths object to change locales.
 *
 * `icuMessagePaths` is an object keyed by `string` paths that locate the i18ned
 * string within the LHR. Within each entry is an
 * array of `LH.I18nMessage`s which include both a `` and a `values` object
 *    which will be used in the replacement within `i18n._formatIcuMessage()`
 *
 * An example:
    "icuMessagePaths": {
    "lighthouse-core/audits/metrics/first-contentful-paint.js | title": [
      "audits[first-contentful-paint].title"
    ],
    "lighthouse-core/audits/time-to-first-byte.js | displayValue": [
      {
        "values": {
          "timeInMs": 570.5630000000001
        },
        "path": "audits[time-to-first-byte].displayValue"
      }
    ],
    "lighthouse-core/lib/i18n/i18n.js | columnTimeSpent": [
      "audits[mainthread-work-breakdown].details.headings[1].text",
      "audits[network-rtt].details.headings[1].text",
      "audits[network-server-latency].details.headings[1].text"
    ],
    ...
 */

// TODO(bckenny): do we need to provide a backwards compatible swap locale?
// TODO(bckenny): should gather runner just run replaceIcuMessageInstanceIds on artifacts and then swap-locale when loading them?

/**
 * Returns a new LHR with all strings changed to the new `requestedLocale`.
 * @param {LH.Result} lhr
 * @param {LH.Locale} requestedLocale
 * @return {{lhr: LH.Result, missingIcuMessageIds: string[]}}
 */
function swapLocale(lhr, requestedLocale) {
  // Copy LHR to avoid mutating provided LHR.
  lhr = JSON.parse(JSON.stringify(lhr));

  const locale = i18n.lookupLocale(requestedLocale);
  const {icuMessagePaths} = lhr.i18n;
  /** @type {string[]} */
  const missingIcuMessageIds = [];

  for (const [path, icuMessage] of Object.entries(icuMessagePaths)) {
    try {
      // We expect the entries to always be `icuMessage`s, so be stricter than `i18n.getFormatted`.
      if (!i18n.isIcuMessage(icuMessage)) {
        throw new Error('This is not an ICU message');
      }

      // Get new formatted strings in revised locale
      const formattedStr = i18n.getFormatted(icuMessage, locale);
      // Write string back into the LHR
      _set(lhr, path, formattedStr);
    } catch (err) {
      // If we couldn't find the new replacement message, keep things as is.
      // TODO(bckenny): need to catch mis-matched arguments from updated strings here too?
      if (err.message === i18n._ICUMsgNotFoundMsg) {
        missingIcuMessageIds.push(icuMessage.i18nId);
      } else {
        throw err;
      }
    }
  }

  lhr.i18n.rendererFormattedStrings = i18n.getRendererFormattedStrings(locale);
  // Tweak the config locale
  lhr.configSettings.locale = locale;
  return {
    lhr,
    missingIcuMessageIds,
  };
}

module.exports = swapLocale;

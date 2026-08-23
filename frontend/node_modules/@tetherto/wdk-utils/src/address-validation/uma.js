// Copyright 2026 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict'

/**
 * Universal Money Address (UMA) validation.
 * Format: $user@domain.tld (human-readable, like email for money; built on Lightning).
 * Resolves UMA usernames into the underlying Lightning Address (user@domain).
 */

/** UMA username format: mandatory $ then alphanumeric/.-_+ */
const USER_NAME_REGEX = /^\$[a-zA-Z0-9-._+]+$/
/** Domain format: labels of up to 63 chars, alphanumeric/_- starting with alphanumeric */
const DOMAIN_REGEX = /^([a-zA-Z0-9_]{1}[a-zA-Z0-9_-]{0,62}){1}(\.[a-zA-Z0-9_]{1}[a-zA-Z0-9_-]{0,62})*[._]?$/
const LOCALHOST_REGEX = /^localhost(:[0-9]+)?$/

/**
 * @typedef {{ success: true, type: 'uma' }} UmaAddressValidationSuccess
 * @typedef {{ success: false, reason: string }} UmaAddressValidationFailure
 * @typedef {UmaAddressValidationSuccess | UmaAddressValidationFailure} UmaAddressValidationResult
 */

/**
 * Validates a Universal Money Address (format: $user@domain.tld).
 *
 * @param {string} address The address to validate.
 * @returns {UmaAddressValidationResult}
 */
export function validateUmaAddress (address) {
  if (address == null || typeof address !== 'string') {
    return { success: false, reason: 'INVALID_FORMAT' }
  }
  const trimmed = address.trim()
  if (trimmed.length === 0) {
    return { success: false, reason: 'EMPTY_ADDRESS' }
  }

  const parts = trimmed.split('@')
  if (parts.length !== 2) {
    return { success: false, reason: 'INVALID_FORMAT' }
  }

  const [username, domain] = parts
  if (!USER_NAME_REGEX.test(username)) {
    return { success: false, reason: 'INVALID_FORMAT' }
  }

  if (domain.toLowerCase() === 'localhost' || LOCALHOST_REGEX.test(domain) || DOMAIN_REGEX.test(domain)) {
    return { success: true, type: 'uma' }
  }

  return { success: false, reason: 'INVALID_FORMAT' }
}

/**
 * Resolves UMA username into address components and the underlying Lightning Address.
 * UMA is built on Lightning Addresses; this returns the user@domain form used for resolution.
 *
 * @param {string} uma - UMA string (e.g. $you@uma.money)
 * @returns {{ localPart: string; domain: string; lightningAddress: string } | null} Parsed parts and lightningAddress (user@domain), or null if invalid
 */
export function resolveUmaUsername (uma) {
  if (typeof uma !== 'string') {
    return null
  }
  const trimmed = uma.trim()
  const parts = trimmed.split('@')
  if (parts.length !== 2) {
    return null
  }
  const [username, domain] = parts
  if (!USER_NAME_REGEX.test(username) || (!LOCALHOST_REGEX.test(domain) && !DOMAIN_REGEX.test(domain) && domain.toLowerCase() !== 'localhost')) {
    return null
  }
  const localPart = username.slice(1)
  const lightningAddress = `${localPart}@${domain}`
  return { localPart, domain, lightningAddress }
}

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

import { base58 } from '@scure/base'

/** @typedef {import("./types.js").AddressValidationFailure} SolanaAddressValidationFailure */
/** @typedef {{ success: true, type: 'solana' }} SolanaAddressValidationSuccess */
/** @typedef {SolanaAddressValidationSuccess | SolanaAddressValidationFailure} SolanaAddressValidationResult */

const SOLANA_PUBLIC_KEY_LENGTH = 32
const SOLANA_ADDRESS_MIN_LENGTH = 32
const SOLANA_ADDRESS_MAX_LENGTH = 44

/**
 * Validates a Solana address (base58-encoded 32-byte public key).
 *
 * Off-curve addresses (PDAs, e.g. associated token accounts) are accepted:
 * they are valid recipients, so no ed25519 on-curve check is performed.
 * Solana addresses carry no checksum, so only structural errors are detectable.
 *
 * @param {string} address The address to validate.
 * @returns {SolanaAddressValidationResult}
 */
export function validateSolanaAddress (address) {
  if (address == null || typeof address !== 'string') {
    return { success: false, reason: 'INVALID_FORMAT' }
  }
  const trimmed = address.trim()
  if (trimmed.length === 0) {
    return { success: false, reason: 'EMPTY_ADDRESS' }
  }

  if (
    trimmed.length < SOLANA_ADDRESS_MIN_LENGTH ||
    trimmed.length > SOLANA_ADDRESS_MAX_LENGTH
  ) {
    return { success: false, reason: 'INVALID_FORMAT' }
  }

  let decoded
  try {
    decoded = base58.decode(trimmed)
  } catch (e) {
    return { success: false, reason: 'INVALID_FORMAT' }
  }

  if (decoded.length !== SOLANA_PUBLIC_KEY_LENGTH) {
    return { success: false, reason: 'INVALID_LENGTH' }
  }

  return { success: true, type: 'solana' }
}

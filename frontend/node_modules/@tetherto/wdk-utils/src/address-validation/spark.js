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

import { bech32m } from '@scure/base'
import { validateBech32m } from './bitcoin.js'

/** @typedef {import("./types.js").AddressValidationFailure} SparkAddressValidationFailure */
/** @typedef {'mainnet' | 'testnet' | 'regtest' | 'signet' | 'local'} SparkNetwork */
/** @typedef {{ success: true, type: 'spark' | 'btc', compatibleNetworks: SparkNetwork[] }} SparkAddressValidationSuccess */
/** @typedef {SparkAddressValidationSuccess | SparkAddressValidationFailure} SparkAddressValidationResult */

const PREFIX_NETWORKS = {
  spark: 'mainnet',
  sparkt: 'testnet',
  sparkrt: 'regtest',
  sparks: 'signet',
  sparkl: 'local'
}

/**
 * Bitcoin L1 network labels → the Spark networks whose L1 deposits use them.
 * Per the Spark SDK's NetworkConfig, signet reuses the Bitcoin testnet
 * address config ("tb" prefix) and local reuses regtest's ("bcrt" prefix),
 * so those L1 addresses are compatible with both Spark networks:
 * https://github.com/buildonspark/spark/blob/5d3d38486b711b11fc4e9ae13de628396f53d0e0/sdks/js/packages/spark-sdk/src/utils/network.ts#L42-L48
 * @type {Record<string, SparkNetwork[]>}
 */
const L1_NETWORKS = {
  bitcoin: ['mainnet'],
  testnet: ['testnet', 'signet'],
  regtest: ['regtest', 'local']
}

/**
 * Validates a Bitcoin L1 deposit address, mapping the Bitcoin network label
 * to the Spark networks it is compatible with.
 *
 * @param {string} address The address to validate.
 * @returns {SparkAddressValidationResult}
 */
function _validateL1Address (address) {
  const btc = validateBech32m(address)
  if (!btc.success) return { success: false, reason: 'INVALID_FORMAT' }
  const [network] = btc.compatibleNetworks
  return { success: true, type: 'btc', compatibleNetworks: L1_NETWORKS[network] }
}

/**
 * Validates a Spark address.
 * A Spark address can be a native Bech32m encoded address or a standard
 * Bitcoin address for L1 deposits.
 *
 * @param {string} address The address to validate.
 * @returns {SparkAddressValidationResult}
 */
export function validateSparkAddress (address) {
  if (address == null || typeof address !== 'string') {
    return { success: false, reason: 'INVALID_FORMAT' }
  }

  const trimmed = address.trim()
  if (trimmed.length === 0) {
    return { success: false, reason: 'EMPTY_ADDRESS' }
  }

  const lower = trimmed.toLowerCase()
  const upper = trimmed.toUpperCase()
  if (trimmed !== lower && trimmed !== upper) {
    return { success: false, reason: 'MIXED_CASE' }
  }

  let decoded
  try {
    decoded = bech32m.decode(lower)
  } catch (e) {
    return _validateL1Address(trimmed)
  }

  const network = PREFIX_NETWORKS[decoded.prefix]
  if (network) {
    return { success: true, type: 'spark', compatibleNetworks: [network] }
  }

  return _validateL1Address(trimmed)
}

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

import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { clean } from '@noble/ciphers/utils.js'

const KEYPAIR_SEED_LEN = 32

/**
 * @typedef {Object} SeedKeyOptions
 * @property {string|Uint8Array} salt - Domain-separation salt.
 * @property {string|Uint8Array} info - Domain-separation info label.
 * @property {number} [length=32] - Output length in bytes.
 */

/**
 * @typedef {Object} KeyPair
 * @property {Uint8Array} publicKey - 32-byte ed25519 public key.
 * @property {Uint8Array} secretKey - 64-byte secret key (seed || publicKey).
 */

/**
 * Derives a key from high-entropy input keying material using HKDF-SHA256.
 * @param {string|Uint8Array} seed - The BIP-39 seed bytes (NOT the mnemonic phrase);
 *   strings are consumed as raw UTF-8 bytes.
 * @param {SeedKeyOptions} options - `salt` and `info` are required.
 * @returns {Uint8Array}
 */
export function deriveSeedKey (seed, options) {
  const { salt, info, length = 32 } = options ?? {}
  if (salt === undefined) throw new Error('salt is required')
  if (info === undefined) throw new Error('info is required')
  return hkdf(sha256, toBytes(seed), toBytes(salt), toBytes(info), length)
}

/**
 * Derives a deterministic ed25519 keypair from a seed.
 * Output is byte-compatible with hypercore-crypto's keyPair(seed).
 * @param {string|Uint8Array} seed - The BIP-39 seed bytes (NOT the mnemonic phrase).
 * @param {SeedKeyOptions} options - `salt` and `info` are required.
 * @returns {KeyPair}
 */
export function deriveSeedKeyPair (seed, options) {
  const key = deriveSeedKey(seed, { ...options, length: KEYPAIR_SEED_LEN })
  try {
    const publicKey = ed25519.getPublicKey(key)
    const secretKey = new Uint8Array(KEYPAIR_SEED_LEN + publicKey.length)
    secretKey.set(key)
    secretKey.set(publicKey, KEYPAIR_SEED_LEN)
    return { publicKey, secretKey }
  } finally {
    clean(key) // wipe the intermediate seed copy; secretKey keeps its own bytes
  }
}

function toBytes (input) {
  return typeof input === 'string' ? utf8ToBytes(input) : input
}

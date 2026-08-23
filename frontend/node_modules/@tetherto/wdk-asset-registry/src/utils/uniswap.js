// Copyright 2024 Tether Operations Limited
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

import { TokenAssetSchema } from '../schemas/token-asset.js'

/** @typedef {import("../schemas/token-asset.js").TokenAsset} TokenAsset */

/**
 * @typedef {Object} UniswapTokenInfo
 * @property {number} chainId - The source EVM chain id from the token list.
 * @property {string} address - The token contract address.
 * @property {string} symbol - The token symbol.
 * @property {string} name - The token name.
 * @property {number} decimals - The token decimals.
 * @property {string} [logoURI] - Optional token logo uri from the source list.
 * @property {string[]} [tags] - Optional token tag names from the source list.
 * @property {Record<string, unknown>} [extensions] - Optional token-specific extensions.
 */

/**
 * Convert a Uniswap-style token entry into a `TokenAsset`.
 *
 * @param {UniswapTokenInfo} token - Source token entry.
 * @returns {TokenAsset} The normalized token asset.
 */
export function fromUniswapToken (token) {
  const chainId = `eip155:${token.chainId}`

  return TokenAssetSchema.parse({
    id: `${chainId}/${token.address}`,
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    chainId,
    isNative: false
  })
}

/**
 * Convert a Uniswap Token Lists token array into `TokenAsset[]`.
 *
 * @see https://tokenlists.org/
 *
 * @param {UniswapTokenInfo[]} tokens - Source token entries.
 * @returns {TokenAsset[]} The normalized token assets.
 */
export function fromUniswapTokenList (tokens) {
  return tokens.map(fromUniswapToken)
}

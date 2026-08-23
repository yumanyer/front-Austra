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

import { TokenAssetSchema } from './schemas/token-asset.js'

import WdkBaseAssetRegistry from './wdk-base-asset-registry.js'

/** @typedef {import("./schemas/token-asset.js").TokenAsset} TokenAsset */
/** @typedef {import("./wdk-base-asset-registry.js").BaseAssetOptions} BaseAssetOptions */

/**
 * @typedef {Object} TokenAddressLookupOptions
 * @property {boolean} [caseSensitive] - Defaults to `true`. Matches the address exactly without lowercasing.
 */

/**
 * @extends {WdkBaseAssetRegistry<TokenAsset>}
 */
export default class WdkTokenAssetRegistry extends WdkBaseAssetRegistry {
  /**
   * Validates and normalizes a token asset using `TokenAssetSchema`.
   *
   * @protected
   * @param {TokenAsset} asset - Asset definition to validate.
   * @returns {TokenAsset} The normalized token asset after successful schema validation.
   * @throws {z.ZodError} Throws if the asset does not conform to `TokenAssetSchema`.
   */
  _assertAsset (asset) {
    return TokenAssetSchema.parse(asset)
  }

  /**
   * Fetch all tokens.
   *
   * @returns {TokenAsset[]} A list of all registered tokens.
   */
  getTokens () {
    return this.getAssets()
  }

  /**
   * Fetch a token by its asset identifier.
   *
   * @param {string} id - The asset identifier.
   * @returns {TokenAsset | null} The matching token, or `null` if no token matches the id.
   */
  getTokenById (id) {
    return this.getAssetById(id)
  }

  /**
   * Fetch tokens by contract address.
   *
   * @param {string} address - The token address.
   * @param {TokenAddressLookupOptions} [opts] - Optional lookup filters.
   * @returns {TokenAsset[]} A list of matching tokens.
   */
  getTokenByAddress (address, { caseSensitive = true, ...opts } = {}) {
    return this.getAsset([{ address }], { caseSensitive, ...opts })
  }

  /**
   * Fetch tokens by symbol.
   *
   * @param {string} symbol - The token symbol (e.g. "USDT", "ETH").
   * @param {BaseAssetOptions} [opts] - Optional lookup filters such as `caseSensitive`.
   * @returns {TokenAsset[]} A list of matching tokens.
   */
  getTokenBySymbol (symbol, opts = {}) {
    return this.getAsset([{ symbol }], opts)
  }

  /**
   * Fetch tokens by chain id.
   *
   * @param {string | number} chainId - The chain identifier (e.g. "eip155:1").
   * @param {BaseAssetOptions} [opts] - Optional lookup filters such as `caseSensitive`.
   * @returns {TokenAsset[]} A list of matching tokens.
   */
  getTokenByChain (chainId, opts = {}) {
    return this.getAsset([{ chainId }], opts)
  }
}

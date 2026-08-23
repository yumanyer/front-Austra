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

import { z } from 'zod'

import { deepEqual } from 'fast-equals'

import { AssetRegistryError } from './errors.js'
import { BaseAssetSchema } from './schemas/index.js'

/** @typedef {import("./schemas/base-asset.js").BaseAsset} BaseAsset */

/**
 * @template {Object} TSchema
 * @typedef {Partial<TSchema>} BaseAssetFilter
 */

/**
 * @typedef {Object} BaseAssetOptions
 * @property {boolean} [caseSensitive] - Defaults to `false`. When true, matches symbols and addresses without lowercasing.
 */

/**
 * The base registry for asset-agnostic use cases.
 *
 * @template {BaseAsset} T
 *
 * @example
 * import { z } from 'zod'
 * import WdkBaseAssetRegistry, { BaseAssetSchema } from '@tetherto/wdk-asset-registry'
 *
 * type CustomAsset = {
 *   id: string
 *   chainId: string
 *   label: string
 * }
 *
 * const CustomAssetSchema = BaseAssetSchema.extend({
 *   label: z.string()
 * })
 *
 * class CustomAssetRegistry extends WdkBaseAssetRegistry<CustomAsset> {
 *   _assertAsset (asset: CustomAsset): CustomAsset {
 *     return CustomAssetSchema.parse(asset)
 *   }
 * }
 */
export default class WdkBaseAssetRegistry {
  /**
   * Creates a new asset registry.
   *
   * @param {T[][]} preload - One or more asset lists to preload into the registry.
   */
  constructor (...preload) {
    /**
     * Registered assets keyed by asset id.
     *
     * @private
     * @type {Map<string, T>}
     */
    this._assets = new Map()

    for (const entry of preload) {
      this.registerAssets(entry)
    }
  }

  /**
   * Validates a base asset and preserves additional fields.
   *
   * @protected
   * @param {T} asset - Asset definition to validate.
   * @returns {T} The normalized asset after successful base-shape validation.
   * @throws {z.ZodError} Throws if the asset does not conform to the `BaseAssetSchema` shape.
   */
  _assertAsset (asset) {
    return z.looseObject(BaseAssetSchema.shape).parse(asset)
  }

  /**
   * Register a single asset in the registry.
   *
   * @param {T} asset - Asset definition to insert or replace.
   * @param {boolean} [upsert] - When `true`, replaces an existing asset with the same id.
   * @returns {void}
   * @throws {AssetRegistryError} Thrown when the asset already exists and `upsert` is not enabled.
   */
  registerAsset (asset, upsert = false) {
    const normalizedAsset = this._assertAsset(asset)

    const existing = this._assets.get(normalizedAsset.id)

    if (existing && !upsert) {
      throw new AssetRegistryError('Asset already exists. Set upsert to `true` to replace it.')
    }

    this._assets.set(normalizedAsset.id, normalizedAsset)
  }

  /**
   * Register multiple assets in the registry.
   *
   * @param {T[]} assets - Asset definitions to insert or replace.
   * @param {boolean} [upsert] - When `true`, replaces existing assets with the same id.
   * @returns {void}
   * @throws {AssetRegistryError} Thrown when any asset already exists and `upsert` is not enabled.
   */
  registerAssets (assets, upsert = false) {
    for (const asset of assets) {
      this.registerAsset(asset, upsert)
    }
  }

  /**
   * Fetch all assets.
   *
   * @returns {T[]} A list of all registered assets.
   */
  getAssets () {
    return Array.from(this._assets.values())
  }

  /**
   * Fetch an asset by the identifier.
   *
   * @param {string} id - The asset identifier.
   * @returns {T | null} The matching asset, or `null` if no asset matches the id.
   */
  getAssetById (id) {
    return this._assets.get(id) ?? null
  }

  /**
   * Fetch assets by one or more partial match conditions.
   *
   * @param {BaseAssetFilter<T>[]} filter - One or more partial asset match conditions. Within a condition, provided key-value pairs are matched with AND.
   * @param {BaseAssetOptions} [opts] - Optional lookup options such as `caseSensitive`.
   * @returns {T[]} A list of matching assets.
   */
  getAsset (filter, opts = {}) {
    const { caseSensitive = false } = opts

    const assets = this.getAssets()
    const results = []

    const normalizedFilter = filter.map(condition => {
      return Object.entries(condition).map(([key, value]) => {
        const normalizedValue = !caseSensitive && typeof value === 'string'
          ? value.toLowerCase()
          : value
        return [key, normalizedValue]
      })
    })

    for (const asset of assets) {
      for (const condition of normalizedFilter) {
        const match = condition.every(([key, conditionValue]) => {
          const assetValue = !caseSensitive && typeof asset[key] === 'string'
            ? asset[key].toLowerCase()
            : asset[key]

          return deepEqual(conditionValue, assetValue)
        })

        if (match) {
          results.push(asset)
          break
        }
      }
    }

    return results
  }
}

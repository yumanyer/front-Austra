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

import { BaseAssetSchema } from './base-asset.js'

/** @typedef {z.infer<typeof TokenAssetSchema>} TokenAsset */

export const TokenAssetSchema = BaseAssetSchema.extend({
  address: z.string(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.int().gte(0).lte(255),
  isNative: z.boolean()
})

export const TokenAssetJsonSchema = TokenAssetSchema.toJSONSchema()

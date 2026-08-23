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
 * @typedef {object} AddressValidationSuccess
 * @property {true} success
 * @property {string} type - The address format or chain type reported by the chain validator (e.g. "p2pkh", "evm", "solana").
 * @property {string} [network] - The network the address belongs to, when the chain validator reports one (e.g. "bitcoin", "testnet").
 */

/**
 * @typedef {object} AddressValidationFailure
 * @property {false} success
 * @property {string} reason - The failure reason code (e.g. "INVALID_FORMAT", "INVALID_CHECKSUM").
 */

/** @typedef {AddressValidationSuccess | AddressValidationFailure} AddressValidationResult */

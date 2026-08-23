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

import { validateSolanaAddress } from '../src/address-validation/solana'

describe('validateSolanaAddress', () => {
  test('should return success for the system program address', () => {
    const address = '11111111111111111111111111111111'
    expect(validateSolanaAddress(address)).toEqual({ success: true, type: 'solana' })
  })

  test('should return success for the token program address', () => {
    const address = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    expect(validateSolanaAddress(address)).toEqual({ success: true, type: 'solana' })
  })

  test('should return success for the USDC mint address', () => {
    const address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    expect(validateSolanaAddress(address)).toEqual({ success: true, type: 'solana' })
  })

  test('should return success for an off-curve PDA address', () => {
    const address = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
    expect(validateSolanaAddress(address)).toEqual({ success: true, type: 'solana' })
  })

  test('should return success for an address with surrounding whitespace', () => {
    const address = '  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr  '
    expect(validateSolanaAddress(address)).toEqual({ success: true, type: 'solana' })
  })

  test('should return EMPTY_ADDRESS for an empty string', () => {
    const address = ''
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'EMPTY_ADDRESS' })
  })

  test('should return EMPTY_ADDRESS for a whitespace-only string', () => {
    const address = '   '
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'EMPTY_ADDRESS' })
  })

  test('should return INVALID_FORMAT for a null address', () => {
    const address = null
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
  })

  test('should return INVALID_FORMAT for an undefined address', () => {
    const address = undefined
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
  })

  test('should return INVALID_FORMAT for a non-string address', () => {
    const address = 123
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
  })

  test('should return INVALID_FORMAT for an address that is too short', () => {
    const address = '1111111111111111111111111111111' // 31 characters
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
  })

  test('should return INVALID_FORMAT for an address that is too long', () => {
    const address = '365efUdXGhRExyDEUeKXWPg1zTZyfvuJQJDLsS7JZqzyt' // 45 characters
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
  })

  test('should return INVALID_FORMAT for an address with invalid base58 characters', () => {
    const address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt0l' // '0' and 'l' are not base58
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
  })

  test('should return INVALID_FORMAT for an EVM address', () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
  })

  test('should return INVALID_LENGTH for base58 that decodes to fewer than 32 bytes', () => {
    const address = '7DUeBUtEcb7nujVZRJmeBju3X1mo6PpnWNtJ9EBhdY' // 42 characters, 31 bytes
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_LENGTH' })
  })

  test('should return INVALID_LENGTH for a Bitcoin address', () => {
    const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' // valid base58, 25 bytes
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_LENGTH' })
  })

  test('should return INVALID_LENGTH for a Tron address', () => {
    const address = 'TNPeeaaFB7K9cmo4uQpcU32zGK8G1NYqeL' // valid base58, 25 bytes
    expect(validateSolanaAddress(address)).toEqual({ success: false, reason: 'INVALID_LENGTH' })
  })
})

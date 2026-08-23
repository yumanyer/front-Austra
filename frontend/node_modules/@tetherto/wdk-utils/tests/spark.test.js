import { validateSparkAddress } from '../src/address-validation/spark.js'

describe('validateSparkAddress', () => {
  // Valid address provided by user.
  const validSparkMainnet = 'spark1pgss82uvuvyjggx72gl42qk3285yz0j6lgxw9uk2mvgajsr8w22nudv8w6hqs2'

  const validBtcAddress = 'bc1p4lpn5nrunrjdk6teyjd2z53vmv82hlgjvv4pejkhg9wz5jq86zuqsruz85'

  describe('Valid Addresses', () => {
    it('returns success for a mainnet Spark address', () => {
      expect(validateSparkAddress(validSparkMainnet)).toEqual({ success: true, type: 'spark', compatibleNetworks: ['mainnet'] })
    })

    it('returns success for a regtest Spark address', () => {
      const validSparkRegtest = 'sparkrt1pgss82uvuvyjggx72gl42qk3285yz0j6lgxw9uk2mvgajsr8w22nudv8uueuu4'
      expect(validateSparkAddress(validSparkRegtest)).toEqual({ success: true, type: 'spark', compatibleNetworks: ['regtest'] })
    })

    it('returns success for a testnet Spark address', () => {
      const validSparkTestnet = 'sparkt1pgss82uvuvyjggx72gl42qk3285yz0j6lgxw9uk2mvgajsr8w22nudv8cgyjr4'
      expect(validateSparkAddress(validSparkTestnet)).toEqual({ success: true, type: 'spark', compatibleNetworks: ['testnet'] })
    })

    it('returns success for a signet Spark address', () => {
      const validSparkSignet = 'sparks1pgss82uvuvyjggx72gl42qk3285yz0j6lgxw9uk2mvgajsr8w22nudv87e9wnx'
      expect(validateSparkAddress(validSparkSignet)).toEqual({ success: true, type: 'spark', compatibleNetworks: ['signet'] })
    })

    it('returns success for a local Spark address', () => {
      const validSparkLocal = 'sparkl1pgss82uvuvyjggx72gl42qk3285yz0j6lgxw9uk2mvgajsr8w22nudv8th0fhu'
      expect(validateSparkAddress(validSparkLocal)).toEqual({ success: true, type: 'spark', compatibleNetworks: ['local'] })
    })

    it('returns success with type "btc" for a valid Bitcoin address', () => {
      expect(validateSparkAddress(validBtcAddress)).toEqual({ success: true, type: 'btc', compatibleNetworks: ['mainnet'] })
    })

    it('returns testnet and signet as compatible networks for a testnet L1 address', () => {
      const testnetTaproot = 'tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47zagq'
      expect(validateSparkAddress(testnetTaproot)).toEqual({ success: true, type: 'btc', compatibleNetworks: ['testnet', 'signet'] })
    })

    it('returns regtest and local as compatible networks for a regtest L1 address', () => {
      const regtestTaproot = 'bcrt1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqc8gma6'
      expect(validateSparkAddress(regtestTaproot)).toEqual({ success: true, type: 'btc', compatibleNetworks: ['regtest', 'local'] })
    })
  })

  describe('Invalid Addresses', () => {
    it('returns MIXED_CASE for a mixed-case Spark address', () => {
      const mixedCase = 'spark1Pgssyuuuhnrrdjswal5c3s3rafw9w3y5dd4cjy3duxlf7hjzkp0rqx6dj6mrhu'
      expect(validateSparkAddress(mixedCase)).toEqual({ success: false, reason: 'MIXED_CASE' })
    })

    it('returns MIXED_CASE for a mixed-case Base58 Bitcoin address', () => {
      const mixedCase = 'mqCLm67ZP1XNTz6hDWJZ3u3dMbBZgRDrHU'
      expect(validateSparkAddress(mixedCase)).toEqual({ success: false, reason: 'MIXED_CASE' })
    })

    it('returns INVALID_FORMAT for an address with an invalid checksum', () => {
      const badChecksum = 'spark1pgssyuuuhnrrdjswal5c3s3rafw9w3y5dd4cjy3duxlf7hjzkp0rqx6dj6mrha'
      expect(validateSparkAddress(badChecksum)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
    })

    it('returns INVALID_FORMAT for a Bech32m address with an unknown prefix', () => {
      const unknownPrefix = 'unknown1pgssyuuuhnrrdjswal5c3s3rafw9w3y5dd4cjy3duxlf7hjzkp0rqx6dj6mrhu'
      expect(validateSparkAddress(unknownPrefix)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
    })

    it('returns INVALID_FORMAT for a random short string', () => {
      expect(validateSparkAddress('not-an-address')).toEqual({ success: false, reason: 'INVALID_FORMAT' })
    })

    it('returns EMPTY_ADDRESS for an empty or whitespace string', () => {
      expect(validateSparkAddress('')).toEqual({ success: false, reason: 'EMPTY_ADDRESS' })
      expect(validateSparkAddress('  ')).toEqual({ success: false, reason: 'EMPTY_ADDRESS' })
    })

    it('returns INVALID_FORMAT for a non-string input', () => {
      expect(validateSparkAddress(null)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
      expect(validateSparkAddress(undefined)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
      expect(validateSparkAddress(12345)).toEqual({ success: false, reason: 'INVALID_FORMAT' })
    })
  })
})


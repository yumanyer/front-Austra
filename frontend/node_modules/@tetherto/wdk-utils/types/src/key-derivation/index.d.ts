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
export function deriveSeedKey(seed: string | Uint8Array, options: SeedKeyOptions): Uint8Array;
/**
 * Derives a deterministic ed25519 keypair from a seed.
 * Output is byte-compatible with hypercore-crypto's keyPair(seed).
 * @param {string|Uint8Array} seed - The BIP-39 seed bytes (NOT the mnemonic phrase).
 * @param {SeedKeyOptions} options - `salt` and `info` are required.
 * @returns {KeyPair}
 */
export function deriveSeedKeyPair(seed: string | Uint8Array, options: SeedKeyOptions): KeyPair;
export type SeedKeyOptions = {
    /**
     * - Domain-separation salt.
     */
    salt: string | Uint8Array;
    /**
     * - Domain-separation info label.
     */
    info: string | Uint8Array;
    /**
     * - Output length in bytes.
     */
    length?: number;
};
export type KeyPair = {
    /**
     * - 32-byte ed25519 public key.
     */
    publicKey: Uint8Array;
    /**
     * - 64-byte secret key (seed || publicKey).
     */
    secretKey: Uint8Array;
};

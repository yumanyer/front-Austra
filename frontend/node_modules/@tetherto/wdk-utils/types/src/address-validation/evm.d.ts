/**
 * Validates an EVM address (format + optional EIP-55 checksum).
 * If mixed case, checksum must match; all lowercase or all uppercase is valid.
 *
 * @param {string} address The address to validate.
 * @returns {EvmAddressValidationResult}
 */
export function validateEVMAddress(address: string): EvmAddressValidationResult;
export type EvmAddressValidationFailure = import("./types.js").AddressValidationFailure;
export type EvmAddressValidationSuccess = {
    success: true;
    type: "evm";
};
export type EvmAddressValidationResult = EvmAddressValidationSuccess | EvmAddressValidationFailure;

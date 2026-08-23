/**
 * Validates a Tron address.
 *
 * @param {string} address The address to validate.
 * @returns {TronAddressValidationResult}
 */
export function validateTronAddress(address: string): TronAddressValidationResult;
export type TronAddressValidationFailure = import("./types.js").AddressValidationFailure;
export type TronAddressValidationSuccess = {
    success: true;
    type: "tron";
};
export type TronAddressValidationResult = TronAddressValidationSuccess | TronAddressValidationFailure;

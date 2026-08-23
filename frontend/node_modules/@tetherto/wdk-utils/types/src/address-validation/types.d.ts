export type AddressValidationSuccess = {
    success: true;
    /**
     * - The address format or chain type reported by the chain validator (e.g. "p2pkh", "evm", "solana").
     */
    type: string;
    /**
     * - The network the address belongs to, when the chain validator reports one (e.g. "bitcoin", "testnet").
     */
    network?: string;
};
export type AddressValidationFailure = {
    success: false;
    /**
     * - The failure reason code (e.g. "INVALID_FORMAT", "INVALID_CHECKSUM").
     */
    reason: string;
};
export type AddressValidationResult = AddressValidationSuccess | AddressValidationFailure;

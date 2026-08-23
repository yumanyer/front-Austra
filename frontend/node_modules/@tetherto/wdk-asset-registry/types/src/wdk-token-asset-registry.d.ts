/**
 * @extends {WdkBaseAssetRegistry<TokenAsset>}
 */
export default class WdkTokenAssetRegistry extends WdkBaseAssetRegistry<TokenAsset> {
    constructor(...preload: TokenAsset[][]);
    /**
     * Validates and normalizes a token asset using `TokenAssetSchema`.
     *
     * @protected
     * @param {TokenAsset} asset - Asset definition to validate.
     * @returns {TokenAsset} The normalized token asset after successful schema validation.
     * @throws {z.ZodError} Throws if the asset does not conform to `TokenAssetSchema`.
     */
    protected _assertAsset(asset: TokenAsset): TokenAsset;
    /**
     * Fetch all tokens.
     *
     * @returns {TokenAsset[]} A list of all registered tokens.
     */
    getTokens(): TokenAsset[];
    /**
     * Fetch a token by its asset identifier.
     *
     * @param {string} id - The asset identifier.
     * @returns {TokenAsset | null} The matching token, or `null` if no token matches the id.
     */
    getTokenById(id: string): TokenAsset | null;
    /**
     * Fetch tokens by contract address.
     *
     * @param {string} address - The token address.
     * @param {TokenAddressLookupOptions} [opts] - Optional lookup filters.
     * @returns {TokenAsset[]} A list of matching tokens.
     */
    getTokenByAddress(address: string, opts?: TokenAddressLookupOptions): TokenAsset[];
    /**
     * Fetch tokens by symbol.
     *
     * @param {string} symbol - The token symbol (e.g. "USDT", "ETH").
     * @param {BaseAssetOptions} [opts] - Optional lookup filters such as `caseSensitive`.
     * @returns {TokenAsset[]} A list of matching tokens.
     */
    getTokenBySymbol(symbol: string, opts?: BaseAssetOptions): TokenAsset[];
    /**
     * Fetch tokens by chain id.
     *
     * @param {string | number} chainId - The chain identifier (e.g. "eip155:1").
     * @param {BaseAssetOptions} [opts] - Optional lookup filters such as `caseSensitive`.
     * @returns {TokenAsset[]} A list of matching tokens.
     */
    getTokenByChain(chainId: string | number, opts?: BaseAssetOptions): TokenAsset[];
}
export type TokenAsset = import("./schemas/token-asset.js").TokenAsset;
export type BaseAssetOptions = import("./wdk-base-asset-registry.js").BaseAssetOptions;
export type TokenAddressLookupOptions = {
    /**
     * - Defaults to `true`. Matches the address exactly without lowercasing.
     */
    caseSensitive?: boolean;
};
import WdkBaseAssetRegistry from './wdk-base-asset-registry.js';

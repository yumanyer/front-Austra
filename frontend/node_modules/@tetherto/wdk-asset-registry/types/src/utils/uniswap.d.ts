/**
 * Convert a Uniswap-style token entry into a `TokenAsset`.
 *
 * @param {UniswapTokenInfo} token - Source token entry.
 * @returns {TokenAsset} The normalized token asset.
 */
export function fromUniswapToken(token: UniswapTokenInfo): TokenAsset;
/**
 * Convert a Uniswap Token Lists token array into `TokenAsset[]`.
 *
 * @see https://tokenlists.org/
 *
 * @param {UniswapTokenInfo[]} tokens - Source token entries.
 * @returns {TokenAsset[]} The normalized token assets.
 */
export function fromUniswapTokenList(tokens: UniswapTokenInfo[]): TokenAsset[];
export type TokenAsset = import("../schemas/token-asset.js").TokenAsset;
export type UniswapTokenInfo = {
    /**
     * - The source EVM chain id from the token list.
     */
    chainId: number;
    /**
     * - The token contract address.
     */
    address: string;
    /**
     * - The token symbol.
     */
    symbol: string;
    /**
     * - The token name.
     */
    name: string;
    /**
     * - The token decimals.
     */
    decimals: number;
    /**
     * - Optional token logo uri from the source list.
     */
    logoURI?: string | undefined;
    /**
     * - Optional token tag names from the source list.
     */
    tags?: string[] | undefined;
    /**
     * - Optional token-specific extensions.
     */
    extensions?: Record<string, unknown> | undefined;
};

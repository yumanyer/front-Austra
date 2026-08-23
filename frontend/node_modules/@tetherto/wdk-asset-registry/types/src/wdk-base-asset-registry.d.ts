/**
 * The base registry for asset-agnostic use cases.
 *
 * @template {BaseAsset} T
 *
 * @example
 * import { z } from 'zod'
 * import WdkBaseAssetRegistry, { BaseAssetSchema } from '@tetherto/wdk-asset-registry'
 *
 * type CustomAsset = {
 *   id: string
 *   chainId: string
 *   label: string
 * }
 *
 * const CustomAssetSchema = BaseAssetSchema.extend({
 *   label: z.string()
 * })
 *
 * class CustomAssetRegistry extends WdkBaseAssetRegistry<CustomAsset> {
 *   _assertAsset (asset: CustomAsset): CustomAsset {
 *     return CustomAssetSchema.parse(asset)
 *   }
 * }
 */
export default class WdkBaseAssetRegistry<T extends BaseAsset> {
    /**
     * Creates a new asset registry.
     *
     * @param {T[][]} preload - One or more asset lists to preload into the registry.
     */
    constructor(...preload: T[][]);
    /**
     * Registered assets keyed by asset id.
     *
     * @private
     * @type {Map<string, T>}
     */
    private _assets;
    /**
     * Validates a base asset and preserves additional fields.
     *
     * @protected
     * @param {T} asset - Asset definition to validate.
     * @returns {T} The normalized asset after successful base-shape validation.
     * @throws {z.ZodError} Throws if the asset does not conform to the `BaseAssetSchema` shape.
     */
    protected _assertAsset(asset: T): T;
    /**
     * Register a single asset in the registry.
     *
     * @param {T} asset - Asset definition to insert or replace.
     * @param {boolean} [upsert] - When `true`, replaces an existing asset with the same id.
     * @returns {void}
     * @throws {AssetRegistryError} Thrown when the asset already exists and `upsert` is not enabled.
     */
    registerAsset(asset: T, upsert?: boolean): void;
    /**
     * Register multiple assets in the registry.
     *
     * @param {T[]} assets - Asset definitions to insert or replace.
     * @param {boolean} [upsert] - When `true`, replaces existing assets with the same id.
     * @returns {void}
     * @throws {AssetRegistryError} Thrown when any asset already exists and `upsert` is not enabled.
     */
    registerAssets(assets: T[], upsert?: boolean): void;
    /**
     * Fetch all assets.
     *
     * @returns {T[]} A list of all registered assets.
     */
    getAssets(): T[];
    /**
     * Fetch an asset by the identifier.
     *
     * @param {string} id - The asset identifier.
     * @returns {T | null} The matching asset, or `null` if no asset matches the id.
     */
    getAssetById(id: string): T | null;
    /**
     * Fetch assets by one or more partial match conditions.
     *
     * @param {BaseAssetFilter<T>[]} filter - One or more partial asset match conditions. Within a condition, provided key-value pairs are matched with AND.
     * @param {BaseAssetOptions} [opts] - Optional lookup options such as `caseSensitive`.
     * @returns {T[]} A list of matching assets.
     */
    getAsset(filter: BaseAssetFilter<T>[], opts?: BaseAssetOptions): T[];
}
export type BaseAsset = import("./schemas/base-asset.js").BaseAsset;
export type BaseAssetFilter<TSchema extends Object> = Partial<TSchema>;
export type BaseAssetOptions = {
    /**
     * - Defaults to `false`. When true, matches symbols and addresses without lowercasing.
     */
    caseSensitive?: boolean | undefined;
};

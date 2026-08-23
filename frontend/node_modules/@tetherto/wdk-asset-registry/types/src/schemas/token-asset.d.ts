export const TokenAssetSchema: z.ZodObject<{
    id: z.ZodString;
    chainId: z.ZodUnion<readonly [z.ZodInt, z.ZodString]>;
    address: z.ZodString;
    symbol: z.ZodString;
    name: z.ZodString;
    decimals: z.ZodInt;
    isNative: z.ZodBoolean;
}, z.core.$strip>;
export const TokenAssetJsonSchema: z.core.ZodStandardJSONSchemaPayload<z.ZodObject<{
    id: z.ZodString;
    chainId: z.ZodUnion<readonly [z.ZodInt, z.ZodString]>;
    address: z.ZodString;
    symbol: z.ZodString;
    name: z.ZodString;
    decimals: z.ZodInt;
    isNative: z.ZodBoolean;
}, z.core.$strip>>;
export type TokenAsset = z.infer<typeof TokenAssetSchema>;
import { z } from 'zod';

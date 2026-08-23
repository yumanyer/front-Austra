export const BaseAssetSchema: z.ZodObject<{
    id: z.ZodString;
    chainId: z.ZodUnion<readonly [z.ZodInt, z.ZodString]>;
}, z.core.$strip>;
export const BaseAssetJsonSchema: z.core.ZodStandardJSONSchemaPayload<z.ZodObject<{
    id: z.ZodString;
    chainId: z.ZodUnion<readonly [z.ZodInt, z.ZodString]>;
}, z.core.$strip>>;
export type BaseAsset = z.infer<typeof BaseAssetSchema>;
import { z } from 'zod';

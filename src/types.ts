import type { z } from 'zod'
import type { ValidateFn } from '@poppinss/validator-lite'
import type { StandardSchemaV1 } from '@standard-schema/spec'

/**
 * Schema defined by the user
 */
export type RecordViteKeys<T> = Record<`${string}_${string}`, T>

/**
 * Options that can be passed to the plugin
 * The schema can be defined at the top level.
 */
export type PluginOptions = Schema | FullPluginOptions

export type FullPluginOptions = (
  | { validator: 'builtin'; schema: PoppinsSchema }
  | { validator: 'zod'; schema: ZodSchema }
  | { validator: 'standard'; schema: StandardSchema }
) & { debug?: boolean; configFile?: string }

export type PoppinsSchema = RecordViteKeys<ValidateFn<any>>
export type ZodSchema = RecordViteKeys<z.ZodType<any, any>>
export type StandardSchema = RecordViteKeys<StandardSchemaV1>

export type Schema = PoppinsSchema | ZodSchema | StandardSchema

/**
 * Infer the schema type from the plugin options
 */
type EnvSchema<UserOptions extends PluginOptions> = UserOptions extends { schema: infer T }
  ? T
  : UserOptions

/**
 * Get the primitive value that is returned by the schema validator function
 */
type EnvValue<Fn> = Fn extends (...args: any) => any
  ? ReturnType<Fn>
  : Fn extends z.ZodType
    ? z.infer<Fn>
    : Fn extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<Fn>
      : never

/**
 * Augment the import.meta.env object with the values returned by the schema validator
 */
export type ImportMetaEnvAugmented<UserOptions extends PluginOptions> = {
  [K in keyof EnvSchema<UserOptions>]: EnvValue<EnvSchema<UserOptions>[K]>
}

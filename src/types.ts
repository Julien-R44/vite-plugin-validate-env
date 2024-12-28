import type { z } from 'zod'
import type { ValidateFn } from '@poppinss/validator-lite'
import type { BaseSchema, BaseIssue, InferOutput } from 'valibot'

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
  | { validator: 'valibot'; schema: ValibotSchema }
) & { debug?: boolean; configFile?: string }

/**
 * Contract for schema definition for poppins validator
 */
export type PoppinsSchema = RecordViteKeys<ValidateFn<any>>

/**
 * Contract for schema definition for zod validator
 */
export type ZodSchema = RecordViteKeys<z.ZodType<any, any>>

/**
 * Contract for schema defintion for valibot validator
 */
export type ValibotSchema = RecordViteKeys<BaseSchema<unknown, unknown, BaseIssue<unknown>>>

export type Schema = PoppinsSchema | ZodSchema | ValibotSchema

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
    : Fn extends BaseSchema<unknown, unknown, BaseIssue<unknown>>
      ? InferOutput<Fn>
      : never

/**
 * Augment the import.meta.env object with the values returned by the schema validator
 */
export type ImportMetaEnvAugmented<UserOptions extends PluginOptions> = {
  [K in keyof EnvSchema<UserOptions>]: EnvValue<EnvSchema<UserOptions>[K]>
}

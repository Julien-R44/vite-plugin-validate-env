import type { z } from 'zod'

/**
 * The shape of the validate fn
 */
export type ValidateFn<T> = (key: string, value?: string) => T

/**
 * Schema defined by the user
 */
export type RecordViteKeys<T> = Record<`${string}_${string}`, T>

/**
 * Options that can be passed to the plugin
 * The schema can be defined at the top level.
 */
export type PluginOptions = Schema | FullPluginOptions

export type FullPluginOptions =
  | { validator: 'builtin'; schema: PoppinsSchema }
  | { validator: 'zod'; schema: ZodSchema }

/**
 * Contract for schema definition for poppins validator
 */
export type PoppinsSchema = RecordViteKeys<ValidateFn<any>>

/**
 * Contract for schema definition for zod validator
 */
export type ZodSchema = RecordViteKeys<z.ZodType<any, any>>

export type Schema = PoppinsSchema | ZodSchema

/**
 * A standard set of options accepted by the schema validation
 * functions
 */
export interface SchemaFnOptions {
  message?: string
}

export type StringFnUrlOptions = SchemaFnOptions & {
  format: 'url'
  /**
   * Whether the URL must have a valid TLD in their domain.
   * Defaults to `true`.
   */
  tld?: boolean
  /**
   * Whether the URL must start with a valid protocol.
   * Defaults to `true`.
   */
  protocol?: boolean
}

/**
 * Options accepted by the string schema function
 */
export type StringFnOptions =
  | (SchemaFnOptions & {
      format?: 'host' | 'email'
    })
  | StringFnUrlOptions

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
  : never

/**
 * Augment the import.meta.env object with the values returned by the schema validator
 */
export type ImportMetaEnvAugmented<UserOptions extends PluginOptions> = {
  [K in keyof EnvSchema<UserOptions>]: EnvValue<EnvSchema<UserOptions>[K]>
}

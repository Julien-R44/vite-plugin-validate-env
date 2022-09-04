/**
 * The shape of the validate fn
 */
export type ValidateFn<T> = (key: string, value?: string) => T

/**
 * Schema defined by the user
 */
export type Schema = Record<string, ValidateFn<any>>

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

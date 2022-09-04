import { Exception } from '../exception'
import { BOOLEAN_NEGATIVES, BOOLEAN_POSITIVES, ensureValue } from './helpers'

type SchemaFnOptions = any

/**
 * Casts a string value to a boolean
 */
function castToBoolean(key: string, value: string, message?: string): boolean {
  if (BOOLEAN_POSITIVES.includes(value)) {
    return true
  }

  if (BOOLEAN_NEGATIVES.includes(value)) {
    return false
  }

  const errorMessage =
    message ||
    `Value for environment variable "${key}" must be a boolean, instead received "${value}"`

  throw new Exception(errorMessage, 'E_INVALID_ENV_VALUE')
}

/**
 * Enforces the value to be of type boolean. Also casts
 * string representation of a boolean to a boolean
 * type
 */
export function boolean(options?: SchemaFnOptions) {
  return function validate(key: string, value?: string) {
    ensureValue(key, value, options?.message)
    return castToBoolean(key, value, options?.message)
  }
}

/**
 * Same as boolean, but allows undefined values as well.
 */
boolean.optional = function optionalBoolean(options?: SchemaFnOptions) {
  return function validate(key: string, value?: string) {
    if (!value) {
      return undefined
    }
    return castToBoolean(key, value, options?.message)
  }
}

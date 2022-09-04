import { Exception } from '../exception'
import { ensureValue } from './helpers'
import type { SchemaFnOptions } from '../contracts'

/**
 * Casts the string to a number and ensures it is no NaN
 */
export function castToNumber(key: string, value: string, message?: string): number {
  const castedValue = Number(value)
  if (isNaN(castedValue)) {
    const errorMessage =
      message ||
      `Value for environment variable "${key}" must be a number, instead received "${value}"`

    throw new Exception(errorMessage)
  }

  return castedValue
}

/**
 * Enforces the value to be of valid number type and the
 * value will also be casted to a number
 */
export function number(options?: SchemaFnOptions) {
  return function validate(key: string, value?: string) {
    ensureValue(key, value, options?.message)
    return castToNumber(key, value, options?.message)
  }
}

/**
 * Similar to the number rule, but also allows optional
 * values
 */
number.optional = function optionalNumber(options?: SchemaFnOptions) {
  return function validate(key: string, value?: string) {
    if (!value) {
      return undefined
    }
    return castToNumber(key, value, options?.message)
  }
}

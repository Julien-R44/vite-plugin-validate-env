import isEmail from 'validator/lib/isEmail'
import isFQDN from 'validator/lib/isFQDN'
import isIP from 'validator/lib/isIP'
import isURL from 'validator/lib/isURL'
import { Exception } from '../exception'
import { ensureValue } from './helpers'
import type { StringFnOptions, StringFnUrlOptions } from '../contracts'

/**
 * Formats against which a string can be optionally validated. We
 * lazy load the dependencies required for validating formats
 */
const formats: {
  [format in Exclude<StringFnOptions['format'], undefined>]: (
    key: string,
    value: string,
    options: StringFnOptions | StringFnUrlOptions
  ) => void
} = {
  email: (key: string, value: string, options: StringFnOptions) => {
    if (!isEmail(value)) {
      throw new Exception(
        options.message ||
          `Value for environment variable "${key}" must be a valid email, instead received "${value}"`,
        'E_INVALID_ENV_VALUE'
      )
    }
  },
  host: (key: string, value: string, options: StringFnOptions) => {
    if (!isFQDN(value, { require_tld: false }) && !isIP(value)) {
      throw new Exception(
        options.message ||
          `Value for environment variable "${key}" must be a valid (domain or ip), instead received "${value}"`,
        'E_INVALID_ENV_VALUE'
      )
    }
  },
  // @ts-expect-error fixme
  url: (key: string, value: string, options: StringFnUrlOptions) => {
    const { tld = true, protocol = true } = options
    if (!isURL(value, { require_tld: tld, require_protocol: protocol })) {
      throw new Exception(
        options.message ||
          `Value for environment variable "${key}" must be a valid URL, instead received "${value}"`,
        'E_INVALID_ENV_VALUE'
      )
    }
  },
}

/**
 * Enforces the value to exist and be of type string
 */
export function string(options?: StringFnOptions) {
  return function validate(key: string, value?: string) {
    ensureValue(key, value, options?.message)

    if (options?.format) {
      formats[options.format](key, value, options)
    }

    return value
  }
}

/**
 * Same as the string rule, but allows non-existing values too
 */
string.optional = function optionalString(options?: StringFnOptions) {
  return function validate(key: string, value?: string) {
    if (!value) {
      return undefined
    }

    if (options?.format) {
      formats[options.format](key, value, options)
    }

    return value
  }
}

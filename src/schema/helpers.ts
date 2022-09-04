import { Exception } from '../exception'

/**
 * Following values are considered as "true"
 */
export const BOOLEAN_POSITIVES = ['1', 1, 'true', true]

/**
 * Following values are considered as "false"
 */
export const BOOLEAN_NEGATIVES = ['0', 0, 'false', false]

/**
 * Ensures the value to exist
 */
export function ensureValue(
  key: string,
  value?: string,
  message?: string
): asserts value is string {
  if (!value) {
    throw new Exception(message || `Missing environment variable "${key}"`, 'E_MISSING_ENV_VALUE')
  }
}

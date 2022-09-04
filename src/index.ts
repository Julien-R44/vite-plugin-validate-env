import { type Plugin, loadEnv } from 'vite'
import type { Schema } from './contracts'
import type { ResolvedConfig } from 'vite'

/**
 * Main function. Will call each validator defined in the schema and throw an error if any of them fails.
 */
function validateEnv(config: ResolvedConfig, schema: Schema) {
  const env = loadEnv(config.mode, config.root)

  for (const [key, validator] of Object.entries(schema)) {
    validator(key, env[key])
  }
}

/**
 * Validate environment variables against a schema
 */
export const ValidateEnv = (schema: Schema): Plugin => {
  return {
    enforce: 'post',
    name: 'vite-plugin-validate-env',
    configResolved: (config) => validateEnv(config, schema),
  }
}

export { Schema } from './schema/index'

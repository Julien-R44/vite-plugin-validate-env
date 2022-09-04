import { cwd } from 'process'
import { type Plugin, loadEnv } from 'vite'
import { createConfigLoader as createLoader } from 'unconfig'
import type { Schema } from './contracts'
import type { ConfigEnv, UserConfig } from 'vite'

/**
 * Load schema defined in `env.ts` file using unconfig
 */
async function loadSchemaFromDedicatedFile(rootDir: string) {
  const loader = createLoader<Schema>({
    sources: [{ files: 'env.ts' }],
    cwd: rootDir,
  })

  const result = await loader.load()
  return result.config
}

/**
 * Main function. Will call each validator defined in the schema and throw an error if any of them fails.
 */
async function validateEnv(userConfig: UserConfig, envConfig: ConfigEnv, schema?: Schema) {
  const rootDir = userConfig.root || cwd()
  const env = loadEnv(envConfig.mode, rootDir)

  if (!schema) {
    schema = await loadSchemaFromDedicatedFile(rootDir)
  }

  for (const [key, validator] of Object.entries(schema!)) {
    const res = validator(key, env[key])
    process.env[key] = res
  }
}

/**
 * Validate environment variables against a schema
 */
export const ValidateEnv = (schema?: Schema): Plugin => {
  return {
    name: 'vite-plugin-validate-env',
    config: (config, env) => validateEnv(config, env, schema),
  }
}

export { Schema } from './schema/index'

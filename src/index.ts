import { cwd } from 'process'
import { type Plugin, loadEnv } from 'vite'
import { createConfigLoader as createLoader } from 'unconfig'
import { Exception } from './exception'
import type {
  FullPluginOptions,
  PluginOptions,
  PoppinsSchema,
  Schema,
  ZodSchema,
} from './contracts'
import type { ConfigEnv, UserConfig } from 'vite'

/**
 * Load schema defined in `env.ts` file using unconfig
 */
async function loadConfig(rootDir: string) {
  const loader = createLoader<PluginOptions>({
    sources: [
      {
        files: 'env',
        extensions: ['ts', 'cts', 'mts', 'js', 'cjs', 'mjs'],
      },
    ],
    cwd: rootDir,
  })

  const result = await loader.load()
  return result.config
}

/**
 * Validate the env values with builtin validator
 */
async function builtinValidation(env: Record<string, string>, schema: PoppinsSchema) {
  for (const [key, validator] of Object.entries(schema!)) {
    const res = validator(key, env[key])
    process.env[key] = res
  }
}

/**
 * Validate the env values with Zod validator
 */
async function zodValidation(env: Record<string, string>, schema: ZodSchema) {
  for (const [key, validator] of Object.entries(schema!)) {
    const result = validator.safeParse(env[key])

    if (!result.success) {
      throw new Exception(
        `E_INVALID_ENV_VALUE: Invalid value for "${key}" : ${result.error.issues[0].message}`,
        'E_INVALID_ENV_VALUE'
      )
    }
    process.env[key] = result.data
  }
}

/**
 * Returns the schema and the validator
 */
function getNormalizedOptions(options: PluginOptions) {
  let schema: Schema
  let validator: FullPluginOptions['validator']
  const isSchemaNested = 'schema' in options && 'validator' in options
  if (isSchemaNested) {
    schema = (options as any).schema
    validator = (options as any).validator
  } else {
    validator = 'builtin'
    schema = options
  }

  return { schema, validator }
}

/**
 * Main function. Will call each validator defined in the schema and throw an error if any of them fails.
 */
async function validateEnv(userConfig: UserConfig, envConfig: ConfigEnv, options?: PluginOptions) {
  const rootDir = userConfig.root || cwd()
  const env = loadEnv(envConfig.mode, rootDir, userConfig.envPrefix)

  const isInlineConfig = options !== undefined
  if (!isInlineConfig) {
    options = await loadConfig(rootDir)
  }

  if (!options) {
    throw new Error('Missing configuration for vite-plugin-validate-env')
  }

  const { schema, validator } = getNormalizedOptions(options)
  const validatorFn = {
    builtin: builtinValidation,
    zod: zodValidation,
  }[validator]

  if (!validatorFn) {
    throw new Error(`Invalid validator "${validator}"`)
  }

  await validatorFn(env, schema as any)
}

/**
 * Validate environment variables against a schema
 */
export const ValidateEnv = (options?: PluginOptions): Plugin => ({
  name: 'vite-plugin-validate-env',
  config: (config, env) => validateEnv(config, env, options),
})

export const defineConfig = <T extends PluginOptions>(config: T): T => config

export { schema as Schema } from '@poppinss/validator-lite'
export type { ImportMetaEnvAugmented } from './contracts'

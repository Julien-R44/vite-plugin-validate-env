import path from 'node:path'
import { cwd } from 'node:process'
import { createConfigLoader as createLoader } from 'unconfig'
import { type ConfigEnv, type Plugin, type UserConfig, loadEnv, normalizePath } from 'vite'

import { ui } from './utils/cliui.js'
import { zodValidation } from './validators/zod/index.js'
import { builtinValidation } from './validators/builtin/index.js'
import type { FullPluginOptions, PluginOptions, Schema } from './contracts/index.js'

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
 * Log environment variables
 */
function logVariables(schema: Schema, env: Record<string, string>) {
  ui.logger.log(`${ui.colors.cyan('[vite-plugin-validate-env]')} debug process.env content`)

  for (const [key] of Object.entries(schema)) {
    ui.logger.log(`${ui.icons.pointer} ${ui.colors.cyan(key)}: ${env[key]}`)
  }
}

function shouldLogVariables(options: PluginOptions) {
  return 'debug' in options && options.debug === true
}

/**
 * Main function. Will call each validator defined in the schema and throw an error if any of them fails.
 */
async function validateEnv(userConfig: UserConfig, envConfig: ConfigEnv, options?: PluginOptions) {
  const rootDir = userConfig.root || cwd()

  const resolvedRoot = normalizePath(
    userConfig.root ? path.resolve(userConfig.root) : process.cwd(),
  )

  const envDir = userConfig.envDir
    ? normalizePath(path.resolve(resolvedRoot, userConfig.envDir))
    : resolvedRoot

  const env = loadEnv(envConfig.mode, envDir, userConfig.envPrefix)

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

  if (shouldLogVariables(options)) logVariables(schema, env)

  const variables = await validatorFn(env, schema as any)

  return {
    define: variables.reduce(
      (acc, { key, value }) => {
        acc[`import.meta.env.${key}`] = JSON.stringify(value)
        return acc
      },
      {} as Record<string, unknown>,
    ),
  }
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
export type { ImportMetaEnvAugmented } from './contracts/index.js'

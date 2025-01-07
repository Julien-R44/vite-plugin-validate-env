import path from 'node:path'
import { cwd } from 'node:process'
import { createConfigLoader as createLoader } from 'unconfig'
import { type ConfigEnv, type Plugin, type UserConfig } from 'vite'

import { initUi, type UI } from './ui.js'
import { zodValidation } from './validators/zod/index.js'
import { builtinValidation } from './validators/builtin/index.js'
import { valibotValidation } from './validators/valibot/index.js'
import type { FullPluginOptions, PluginOptions, Schema } from './types.js'

/**
 * Load schema defined in `env.ts` file using unconfig
 */
async function loadOptions(rootDir: string, inlineConfig?: PluginOptions) {
  let source = 'env'

  /**
   * If configFile is defined in the inlineConfig, use it as the source
   */
  if (inlineConfig && 'configFile' in inlineConfig && inlineConfig.configFile) {
    source = inlineConfig.configFile
  }

  const loader = createLoader<PluginOptions>({
    sources: [{ files: source, extensions: ['ts', 'cts', 'mts', 'js', 'cjs', 'mjs'] }],
    cwd: rootDir,
    defaults: inlineConfig,
    importx: { cache: false, loader: 'jiti' },
  })

  const result = await loader.load()
  const config = result.config

  if (!config) throw new Error('Missing configuration for vite-plugin-validate-env')

  return config
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
function logVariables(ui: UI, variables: { key: string; value: any }[]) {
  ui.logger.log(`${ui.colors.cyan('[vite-plugin-validate-env]')} debug process.env content`)

  for (const { key, value } of variables) {
    ui.logger.log(`${ui.icons.pointer} ${ui.colors.cyan(key)}: ${value}`)
  }
}

function shouldLogVariables(options: PluginOptions) {
  return 'debug' in options && options.debug === true
}

/**
 * Main function. Will call each validator defined in the schema and throw an error if any of them fails.
 */
async function validateEnv(
  ui: UI,
  userConfig: UserConfig,
  envConfig: ConfigEnv,
  inlineOptions?: PluginOptions,
) {
  /**
   * Dynamic import of Vite helpers to using the ESM build of Vite and
   * avoiding CJS since it will be deprecated
   * See : https://vitejs.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
   */
  const { normalizePath, loadEnv } = await import('vite')
  const rootDir = userConfig.root || cwd()

  const resolvedRoot = normalizePath(
    userConfig.root ? path.resolve(userConfig.root) : process.cwd(),
  )

  const envDir = userConfig.envDir
    ? normalizePath(path.resolve(resolvedRoot, userConfig.envDir))
    : resolvedRoot

  const env = loadEnv(envConfig.mode, envDir, userConfig.envPrefix)

  const options = await loadOptions(rootDir, inlineOptions)
  const variables = await validateAndLog(ui, env, options)

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

async function validateAndLog(ui: UI, env: Record<string, string>, options: PluginOptions) {
  const { schema, validator } = getNormalizedOptions(options)
  const showDebug = shouldLogVariables(options)
  const validate = { zod: zodValidation, valibot: valibotValidation, builtin: builtinValidation }[
    validator
  ]

  try {
    const variables = await validate(ui, env, schema as any)

    if (showDebug) logVariables(ui, variables)

    return variables
  } catch (error) {
    if (showDebug) {
      const variables = Object.entries(schema).map(([key]) => ({ key, value: env[key] }))
      logVariables(ui, variables)
    }

    throw error
  }
}

/**
 * Validate environment variables against a schema
 */
export const ValidateEnv = (options?: PluginOptions): Plugin => {
  const ui = initUi()
  return {
    // @ts-expect-error - only used for testing as we need to keep each instance of the plugin unique to a test
    ui: process.env.NODE_ENV === 'testing' ? ui : undefined,
    name: 'vite-plugin-validate-env',
    config: (config, env) => validateEnv(ui, config, env, options),
  }
}

export const defineConfig = <T extends PluginOptions>(config: T): T => config

export { schema as Schema } from '@poppinss/validator-lite'
export type { ImportMetaEnvAugmented } from './types.js'

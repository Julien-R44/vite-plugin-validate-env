import { getActiveTest } from '@japa/runner'
import type { Plugin, UserConfig } from 'vite'

import type { UI } from '../src/ui.js'
import { ValidateEnv as CoreTypedValidateEnv } from '../src/index.js'

export async function createEnvFile(env: Record<string, string>, envFilename = '.env.development') {
  const test = getActiveTest()
  if (!test) throw new Error('No active test found')

  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  await test.context.fs.create(envFilename, content)
}

export async function executeValidateEnv(plugin: Plugin<any>, config?: UserConfig) {
  const test = getActiveTest()
  if (!test) throw new Error('No active test found')

  // @ts-expect-error - ignore
  return await plugin.config(
    { root: test.context.fs.basePath, ...config },
    {
      mode: 'development',
      command: 'serve',
    },
  )
}

export const ValidateEnv = CoreTypedValidateEnv as (
  ...args: Parameters<typeof CoreTypedValidateEnv>
) => ReturnType<typeof CoreTypedValidateEnv> & { ui: UI }

import type { Plugin } from 'vite'
import { getActiveTest } from '@japa/runner'

export async function createEnvFile(env: Record<string, string>, envFilename = '.env.development') {
  const test = getActiveTest()
  if (!test) throw new Error('No active test found')

  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  await test.context.fs.create(envFilename, content)
}

export async function executeValidateEnv(plugin: Plugin<any>) {
  const test = getActiveTest()
  if (!test) throw new Error('No active test found')

  // @ts-expect-error - ignore
  return await plugin.config(
    { root: test.context.fs.basePath },
    {
      mode: 'development',
      command: 'serve',
    },
  )
}

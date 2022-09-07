import { join } from 'path'
import { z } from 'zod'
import { test } from '@japa/runner'
import { Filesystem } from '@poppinss/dev-utils'
import { ValidateEnv } from '../src'

const fs = new Filesystem(join(__dirname, 'fixtures'))
const viteConfig = { root: fs.basePath }
const viteEnvConfig = { mode: 'development', command: 'serve' } as const

test.group('Zod validation adaptater', () => {
  test('Basic', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_TEST: z.string().url().max(10),
      },
    })

    await fs.add(`.env.development`, `VITE_TEST=htest`)

    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(fn, 'E_INVALID_ENV_VALUE: Invalid value for "VITE_TEST" : Invalid url')
  })

  test('Transform value', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_TEST: z
          .string()
          .max(10)
          .transform((value) => value.toUpperCase()),
      },
    })

    await fs.add(`.env.development`, `VITE_TEST=hello`)

    await plugin.config!(viteConfig, viteEnvConfig)
    assert.equal(process.env.VITE_TEST, 'HELLO')
  })

  test('Custom error message', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_LONG_STRING: z.string().max(10, 'Max 10 characters'),
      },
    })

    await fs.add(`.env.development`, `VITE_LONG_STRING=superlongstring`)

    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(
      fn,
      'E_INVALID_ENV_VALUE: Invalid value for "VITE_LONG_STRING" : Max 10 characters'
    )
  })

  test('Refine value', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_REFINED: z.string().refine((value) => value.length <= 10, {
          message: 'Max 10 characters',
        }),
      },
    })

    await fs.add(`.env.development`, `VITE_REFINED=superlongstring`)

    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(
      fn,
      'E_INVALID_ENV_VALUE: Invalid value for "VITE_REFINED" : Max 10 characters'
    )
  })
})

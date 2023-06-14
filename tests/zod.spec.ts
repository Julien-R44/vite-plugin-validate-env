/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { join } from 'path'
import { z } from 'zod'
import { test } from '@japa/runner'
import { Filesystem } from '@poppinss/dev-utils'
import { ValidateEnv } from '../src'

const fs = new Filesystem(join(__dirname, 'fixtures'))
const viteConfig = { root: fs.basePath }
const viteEnvConfig = { mode: 'development', command: 'serve' } as const

const ENV_FILENAME = '.env.development'

test.group('Zod validation adaptater', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('Basic', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: { VITE_TEST: z.string().url().max(10) },
    })

    await fs.add(ENV_FILENAME, 'VITE_TEST=htest')

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_TEST" : Invalid url')
    }
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

    await fs.add(ENV_FILENAME, 'VITE_TEST=hello')

    // @ts-expect-error - 'config' is the handler
    await plugin.config!(viteConfig, viteEnvConfig)
    assert.equal(process.env.VITE_TEST, 'HELLO')
  })

  test('Custom error message', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_LONG_STRING: z.string().max(10, 'Max 10 characters'),
      },
    })

    await fs.add(ENV_FILENAME, 'VITE_LONG_STRING=superlongstring')

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_LONG_STRING" : Max 10 characters')
    }
  })

  test('Refine value', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_REFINED: z.string().refine((value) => value.length <= 10, {
          message: 'Max 10 characters',
        }),
      },
    })

    await fs.add(ENV_FILENAME, 'VITE_REFINED=superlongstring')

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_REFINED" : Max 10 characters')
    }
  })

  test('Display multiple errors', async ({ assert }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_A: z.string(),
        VITE_B: z.string(),
      },
    })

    await fs.add(ENV_FILENAME, '')

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_A" : Required')
      assert.include(error.message, 'Invalid value for "VITE_B" : Required')
    }
  })

  test('Optional Variables', async ({ assert }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: { VITE_OPTIONAL_ZOD: z.string().max(2).optional() },
    })

    // Test with the variable set, but invalid
    await fs.add(ENV_FILENAME, 'VITE_OPTIONAL_ZOD=hello')
    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Invalid value for "VITE_OPTIONAL_ZOD" : String must contain at most 2 character(s)'
      )
    }

    // Test without variable
    await fs.add(ENV_FILENAME, '')
    // @ts-ignore
    await plugin.config(viteConfig, viteEnvConfig)
    assert.equal(process.env.VITE_OPTIONAL_ZOD, undefined)
  })
})

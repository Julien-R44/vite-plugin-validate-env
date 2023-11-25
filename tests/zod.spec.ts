import { z } from 'zod'
import { test } from '@japa/runner'

import { ValidateEnv } from '../src/index.js'

const viteEnvConfig = { mode: 'development', command: 'serve' } as const

const ENV_FILENAME = '.env.development'

test.group('Zod validation adaptater', () => {
  test('Basic', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: { VITE_TEST: z.string().url().max(10) },
    })

    await fs.create(ENV_FILENAME, 'VITE_TEST=htest')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_TEST" : Invalid url')
    }
  })

  test('Transform value', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_TEST: z
          .string()
          .max(10)
          .transform((value) => value.toUpperCase()),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_TEST=hello')

    // @ts-expect-error - 'config' is the handler
    const { define } = await plugin.config!({ root: fs.basePath }, viteEnvConfig)
    assert.equal(define['import.meta.env.VITE_TEST'], '"HELLO"')
  })

  test('Custom error message', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_LONG_STRING: z.string().max(10, 'Max 10 characters'),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_LONG_STRING=superlongstring')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_LONG_STRING" : Max 10 characters')
    }
  })

  test('Refine value', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_REFINED: z.string().refine((value) => value.length <= 10, {
          message: 'Max 10 characters',
        }),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_REFINED=superlongstring')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_REFINED" : Max 10 characters')
    }
  })

  test('Display multiple errors', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_A: z.string(),
        VITE_B: z.string(),
      },
    })

    await fs.create(ENV_FILENAME, '')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_A" : Required')
      assert.include(error.message, 'Invalid value for "VITE_B" : Required')
    }
  })

  test('Optional Variables', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: { VITE_OPTIONAL_ZOD: z.string().max(2).optional() },
    })

    // Test with the variable set, but invalid
    await fs.create(ENV_FILENAME, 'VITE_OPTIONAL_ZOD=hello')
    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Invalid value for "VITE_OPTIONAL_ZOD" : String must contain at most 2 character(s)',
      )
    }

    // Test without variable
    await fs.create(ENV_FILENAME, '')
    // @ts-ignore
    await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(process.env.VITE_OPTIONAL_ZOD, undefined)
  })

  test('dont stop validation after undefined result', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_OPTIONAL_ZOD: z.string().max(2).optional(),
        VITE_MY_VAR: z.string(),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_MY_VAR=hello')
    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)

    assert.equal(define['import.meta.env.VITE_OPTIONAL_ZOD'], undefined)
    assert.equal(define['import.meta.env.VITE_MY_VAR'], '"hello"')
  })

  test('number value', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: { VITE_NUMBER: z.preprocess((value) => Number(value), z.number()) },
    })

    await fs.create(ENV_FILENAME, 'VITE_NUMBER=4323')

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(define['import.meta.env.VITE_NUMBER'], '4323')
  })

  test('boolean value', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_BOOLEAN: z.preprocess((value) => value === 'true' || value === '1', z.boolean()),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_BOOLEAN=true')
    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(define['import.meta.env.VITE_BOOLEAN'], 'true')

    await fs.create(ENV_FILENAME, 'VITE_BOOLEAN=1')
    // @ts-ignore
    const { define: define2 } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(define2['import.meta.env.VITE_BOOLEAN'], 'true')
  })
})

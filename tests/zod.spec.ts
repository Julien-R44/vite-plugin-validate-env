import { z } from 'zod'
import { test } from '@japa/runner'

import type { UI } from '../src/ui.js'
import { ValidateEnv as CoreTypedValidateEnv } from '../src/index.js'

const viteEnvConfig = { mode: 'development', command: 'serve' } as const

const ENV_FILENAME = '.env.development'

const ValidateEnv = CoreTypedValidateEnv as (
  ...args: Parameters<typeof CoreTypedValidateEnv>
) => ReturnType<typeof CoreTypedValidateEnv> & { ui: UI }

test.group('Zod validation adapter', () => {
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
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.isUndefined(define['import.meta.env.VITE_OPTIONAL_ZOD'])
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

    assert.isUndefined(define['import.meta.env.VITE_OPTIONAL_ZOD'])
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

  test('log variables when debug is enabled', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_BOOLEAN: z.preprocess((value) => value === 'true' || value === '1', z.boolean()),
      },
      debug: true,
    })

    await fs.create(ENV_FILENAME, 'VITE_BOOLEAN=true')

    // @ts-ignore
    await plugin.config({ root: fs.basePath }, viteEnvConfig)

    const logs = plugin.ui.logger.getLogs()
    assert.deepEqual(logs[0].message, 'cyan([vite-plugin-validate-env]) debug process.env content')
    assert.deepInclude(logs[1].message, 'cyan(VITE_BOOLEAN): true')
  })

  test('Optional Variables with Default', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: { VITE_OPTIONAL_ZOD: z.string().max(2).optional().default('d') },
      debug: true,
    })

    await fs.create(ENV_FILENAME, '')

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    const logs = plugin.ui.logger.getLogs()

    assert.equal(define['import.meta.env.VITE_OPTIONAL_ZOD'], '"d"')
    assert.deepEqual(logs[0].message, 'cyan([vite-plugin-validate-env]) debug process.env content')
    assert.deepInclude(logs[1].message, 'cyan(VITE_OPTIONAL_ZOD): d')
  })

  test('log variables even if validation is failing', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'zod',
      schema: { VITE_TESTX: z.boolean() },
      debug: true,
    })

    await fs.create(ENV_FILENAME, 'VITE_TESTX=not boolean')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Invalid value for "VITE_TESTX" : Expected boolean, received string',
      )
    }

    const logs = plugin.ui.logger.getLogs()
    const messages = logs.map((log) => log.message)
    assert.isDefined(
      messages.find(
        (message) => message === 'cyan([vite-plugin-validate-env]) debug process.env content',
      ),
    )

    assert.isDefined(messages.find((message) => message.includes('cyan(VITE_TESTX): not boolean')))
  })
})

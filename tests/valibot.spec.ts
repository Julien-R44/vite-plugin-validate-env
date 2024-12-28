import * as v from 'valibot'
import { test } from '@japa/runner'

import type { UI } from '../src/ui.js'
import { ValidateEnv as CoreTypedValidateEnv } from '../src/index.js'

const viteEnvConfig = { mode: 'development', command: 'serve' } as const

const ENV_FILENAME = '.env.development'

const ValidateEnv = CoreTypedValidateEnv as (
  ...args: Parameters<typeof CoreTypedValidateEnv>
) => ReturnType<typeof CoreTypedValidateEnv> & { ui: UI }

test.group('Valibot validation adapter', () => {
  test('Basic', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: { VITE_TEST: v.pipe(v.string(), v.url(), v.maxLength(10)) },
    })

    await fs.create(ENV_FILENAME, 'VITE_TEST=htest')
    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_TEST" : Invalid URL: Received "htest"')
    }
  })

  test('Transform value', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: {
        VITE_TEST: v.pipe(
          v.string(),
          v.maxLength(10),
          v.transform((value) => value.toUpperCase()),
        ),
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
      validator: 'valibot',
      schema: {
        VITE_LONG_STRING: v.pipe(v.string(), v.maxLength(10, 'Max 10 characters')),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_LONG_STRING=hello world')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_LONG_STRING" : Max 10 characters')
    }
  })

  test('Display multiple errors', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: {
        VITE_A: v.string(),
        VITE_B: v.string(),
      },
    })

    await fs.create(ENV_FILENAME, '')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Invalid value for "VITE_A" : Invalid type: Expected string but received undefined',
      )
      assert.include(
        error.message,
        'Invalid value for "VITE_B" : Invalid type: Expected string but received undefined',
      )
    }
  })

  test('Optional Variables', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: {
        VITE_OPTIONAL_VALIBOT: v.optional(v.pipe(v.string(), v.maxLength(2))),
      },
    })

    // Test with the variable set, but invalid
    await fs.create(ENV_FILENAME, 'VITE_OPTIONAL_VALIBOT=hello')
    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Invalid value for "VITE_OPTIONAL_VALIBOT" : Invalid length: Expected <=2 but received 5',
      )
    }

    // Test without variable
    await fs.create(ENV_FILENAME, '')
    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.isUndefined(define['import.meta.env.VITE_OPTIONAL_VALIBOT'])
  })

  test('dont stop validation after undefined result', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: {
        VITE_OPTIONAL_VALIBOT: v.optional(v.pipe(v.string(), v.maxLength(2))),
        VITE_MY_VAR: v.string(),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_MY_VAR=hello')
    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)

    assert.isUndefined(define['import.meta.env.VITE_OPTIONAL_VALIBOT'])
    assert.equal(define['import.meta.env.VITE_MY_VAR'], '"hello"')
  })

  test('number value', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: {
        VITE_NUMBER: v.pipe(
          v.string(),
          v.transform((input) => Number(input)),
          v.number(),
        ),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_NUMBER=4323')

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(define['import.meta.env.VITE_NUMBER'], '4323')
  })

  test('boolean value', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: {
        VITE_BOOLEAN: v.pipe(
          v.string(),
          v.transform((input) => input === 'true' || input === '1'),
          v.boolean(),
        ),
      },
    })

    await fs.create(ENV_FILENAME, 'VITE_BOOLEAN=true')

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(define['import.meta.env.VITE_BOOLEAN'], 'true')
  })

  test('log variables when debug is enabled', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: {
        VITE_BOOLEAN: v.pipe(
          v.string(),
          v.transform((input) => input === 'true' || input === '1'),
          v.boolean(),
        ),
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
      validator: 'valibot',
      schema: {
        VITE_OPTIONAL: v.optional(v.string(), 'default'),
      },
    })

    await fs.create(ENV_FILENAME, '')

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(define['import.meta.env.VITE_OPTIONAL'], '"default"')
  })

  test('log variables even if validation is failing', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'valibot',
      schema: { VITE_TESTX: v.boolean() },
      debug: true,
    })

    await fs.create(ENV_FILENAME, 'VITE_TESTX=not boolean')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Invalid value for "VITE_TESTX" : Invalid type: Expected boolean but received "not boolean"',
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

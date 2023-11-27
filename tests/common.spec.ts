import { test } from '@japa/runner'

import type { UI } from '../src/utils/cliui.js'
import { Schema, ValidateEnv as CoreTypedValidateEnv } from '../src/index.js'

const viteEnvConfig = { mode: 'development', command: 'serve' } as const

const ValidateEnv = CoreTypedValidateEnv as (
  ...args: Parameters<typeof CoreTypedValidateEnv>
) => ReturnType<typeof CoreTypedValidateEnv> & { ui: UI }

test.group('vite-plugin-validate-env', () => {
  test('Basic validation', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({ VITE_TEST: Schema.boolean() })
    await fs.create(`.env.development`, `VITE_TEST=not boolean`)

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, '"VITE_TEST" must be a boolean')
    }
  })

  test('Custom error message', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({ VITE_TEST: Schema.boolean({ message: 'Heyhey' }) })
    await fs.create(`.env.development`, `VITE_TEST=not boolean`)

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'VITE_TEST')
      assert.include(error.message, 'Heyhey')
    }
  })

  test('Custom validator method', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      VITE_TEST: (_key, value) => {
        if (value !== 'valid') throw new Error('Value must be "valid"')
      },
    })

    await fs.create(`.env.development`, `VITE_TEST=not valid`)

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Value must be "valid"')
    }
  })

  test('Parsing result', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      VITE_URL_TRAILING: (key, value) => {
        if (!value) {
          throw new Error(`Missing ${key} env variable`)
        }

        if (!value.endsWith('/')) {
          return `${value}/`
        }

        return value
      },
    })

    await fs.create(`.env.development`, `VITE_URL_TRAILING=test.com`)

    // @ts-ignore
    const { define } = await plugin.config!({ root: fs.basePath }, viteEnvConfig)

    assert.deepEqual(define['import.meta.env.VITE_URL_TRAILING'], '"test.com/"')
  })

  test('Dedicated config file', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv()

    await fs.create(`.env.development`, `VITE_MY_VAR=true`)
    await fs.create(
      `env.ts`,
      `export default {
        VITE_TEST: () => {
          throw new Error('Error validating')
        }
    }`,
    )

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Error validating')
    }
  })

  test('Should fail if no schema is found', async ({ assert, fs }) => {
    const plugin = ValidateEnv()

    await fs.create(`.env.development`, `VITE_MY_VAR=true`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, { root: fs.basePath }, viteEnvConfig)
    await assert.rejects(fn, 'Missing configuration for vite-plugin-validate-env')
  })

  test('Should pick up var with custom prefix', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({ CUSTOM_TEST: Schema.boolean() })

    await fs.create(`.env.development`, `CUSTOM_TEST=not boolean`)

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath, envPrefix: 'CUSTOM_' }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Value for environment variable "CUSTOM_TEST" must be a boolean, instead received "not boolean"',
      )
    }
  })

  test('Should use envDir option from vite config', async ({ assert, fs }) => {
    assert.plan(1)

    const plugin = ValidateEnv({ VITE_XXX: Schema.string() })

    await fs.create(`./env-directory/.env.development`, `VITE_XXX=bonjour`)

    // @ts-ignore
    const { define } = await plugin.config(
      { root: fs.basePath, envDir: './env-directory' },
      viteEnvConfig,
    )

    assert.deepEqual(define['import.meta.env.VITE_XXX'], '"bonjour"')
  })

  test('Display multiple errors', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      VITE_TEST: Schema.boolean(),
      VITE_TEST2: Schema.boolean(),
    })

    await fs.create(`.env.development`, '')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Missing environment variable "VITE_TEST"')
      assert.include(error.message, 'Missing environment variable "VITE_TEST2"')
    }
  })

  test('Optional Variables', async ({ assert, fs }) => {
    // assert.plan(2);

    const plugin = ValidateEnv({ VITE_OPTIONAL: Schema.number.optional() })

    // Test with the variable set, but invalid
    await fs.create('.env.development', 'VITE_OPTIONAL=not a number')
    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Value for environment variable "VITE_OPTIONAL" must be numeric, instead received',
      )
    }

    // Test without variable
    await fs.create('.env.development', '')
    // @ts-ignore
    await plugin.config({ root: fs.basePath }, viteEnvConfig)
    assert.equal(process.env.VITE_OPTIONAL, undefined)
  })

  test('dont stop validation after undefined result', async ({ assert, fs }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: {
        VITE_OPTIONAL: Schema.number.optional(),
        VITE_MY_VAR: Schema.string(),
      },
    })

    await fs.create('.env.development', 'VITE_MY_VAR=hello')
    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)

    assert.equal(define['import.meta.env.VITE_OPTIONAL'], undefined)
    assert.equal(define['import.meta.env.VITE_MY_VAR'], '"hello"')
  })

  test('number value', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_NUMBER: Schema.number() },
    })

    await fs.create('.env.development', 'VITE_NUMBER=43')

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)

    assert.deepEqual(define['import.meta.env.VITE_NUMBER'], '43')
  })

  test('boolean value', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_BOOLEAN: Schema.boolean() },
    })

    await fs.create('.env.development', 'VITE_BOOLEAN=true')

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)

    assert.deepEqual(define['import.meta.env.VITE_BOOLEAN'], 'true')
  })

  test('log variables when debug is enabled', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_BOOLEAN: Schema.boolean() },
      debug: true,
    })

    await fs.create('.env.development', 'VITE_BOOLEAN=true')

    // @ts-ignore
    await plugin.config({ root: fs.basePath }, viteEnvConfig)

    const logs = plugin.ui.logger.getLogs()
    assert.deepEqual(logs[0].message, 'cyan([vite-plugin-validate-env]) debug process.env content')
    assert.deepInclude(logs[1].message, 'cyan(VITE_BOOLEAN): true')
  })

  test('log variables even if validation is failing', async ({ assert, fs }) => {
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_TESTX: Schema.boolean() },
      debug: true,
    })

    await fs.create('.env.development', 'VITE_TESTX=not boolean')

    try {
      // @ts-ignore
      await plugin.config({ root: fs.basePath }, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Value for environment variable "VITE_TESTX" must be a boolean')
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

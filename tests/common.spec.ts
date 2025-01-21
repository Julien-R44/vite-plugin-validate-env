import { test } from '@japa/runner'

import { Schema } from '../src/index.js'
import { createEnvFile, executeValidateEnv, ValidateEnv } from './helpers.js'

test.group('vite-plugin-validate-env', () => {
  test('Basic validation', async ({ assert }) => {
    await createEnvFile({ VITE_TEST: 'not boolean' })
    const plugin = ValidateEnv({ VITE_TEST: Schema.boolean() })

    await assert.rejects(
      () => executeValidateEnv(plugin),
      /Value for environment variable "VITE_TEST" must be a boolean/,
    )
  })

  test('Custom error message', async ({ assert }) => {
    assert.plan(2)

    const plugin = ValidateEnv({ VITE_TEST: Schema.boolean({ message: 'Heyhey' }) })
    await createEnvFile({ VITE_TEST: 'not boolean' })

    try {
      await executeValidateEnv(plugin)
    } catch (error: any) {
      assert.include(error.message, 'VITE_TEST')
      assert.include(error.message, 'Heyhey')
    }
  })

  test('Custom validator method', async ({ assert }) => {
    await createEnvFile({ VITE_TEST: 'not valid' })
    const plugin = ValidateEnv({
      VITE_TEST: (_key, value) => {
        if (value !== 'valid') throw new Error('Value must be "valid"')
      },
    })

    await assert.rejects(() => executeValidateEnv(plugin), /Value must be "valid"/)
  })

  test('Parsing result', async ({ assert }) => {
    await createEnvFile({ VITE_URL_TRAILING: 'test.com' })
    const plugin = ValidateEnv({
      VITE_URL_TRAILING: (key, value) => {
        if (!value) throw new Error(`Missing ${key} env variable`)
        if (!value.endsWith('/')) return `${value}/`

        return value
      },
    })

    const { define } = await executeValidateEnv(plugin)
    assert.deepEqual(define['import.meta.env.VITE_URL_TRAILING'], '"test.com/"')
  })

  test('Should pick up var with custom prefix', async ({ assert }) => {
    await createEnvFile({ CUSTOM_TEST: 'not boolean' })
    const plugin = ValidateEnv({ CUSTOM_TEST: Schema.boolean() })

    await assert.rejects(
      () => executeValidateEnv(plugin, { envPrefix: 'CUSTOM_' }),
      /Value for environment variable "CUSTOM_TEST" must be a boolean, instead received "not boolean"/,
    )
  })

  test('Should use envDir option from vite config', async ({ assert }) => {
    await createEnvFile({ VITE_XXX: 'bonjour' }, './env-directory/.env.development')
    const plugin = ValidateEnv({ VITE_XXX: Schema.string() })

    const { define } = await executeValidateEnv(plugin, { envDir: './env-directory' })
    assert.deepEqual(define['import.meta.env.VITE_XXX'], '"bonjour"')
  })

  test('Display multiple errors', async ({ assert }) => {
    assert.plan(2)

    await createEnvFile({})
    const plugin = ValidateEnv({
      VITE_TEST: Schema.boolean(),
      VITE_TEST2: Schema.boolean(),
    })

    try {
      await executeValidateEnv(plugin)
    } catch (error: any) {
      assert.include(error.message, 'Missing environment variable "VITE_TEST"')
      assert.include(error.message, 'Missing environment variable "VITE_TEST2"')
    }
  })

  test('Optional Variables', async ({ assert }) => {
    const plugin = ValidateEnv({ VITE_OPTIONAL: Schema.number.optional() })

    // Test with the variable set, but invalid
    await createEnvFile({ VITE_OPTIONAL: 'not a number' })
    await assert.rejects(
      () => executeValidateEnv(plugin),
      /Value for environment variable "VITE_OPTIONAL" must be numeric, instead received "not a number"/,
    )

    // Test without variable
    await createEnvFile({})
    await executeValidateEnv(plugin)

    assert.equal(process.env.VITE_OPTIONAL, undefined)
  })

  test('dont stop validation after undefined result', async ({ assert }) => {
    await createEnvFile({ VITE_MY_VAR: 'hello' })
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: {
        VITE_OPTIONAL: Schema.number.optional(),
        VITE_MY_VAR: Schema.string(),
      },
    })

    const { define } = await executeValidateEnv(plugin)

    assert.equal(define['import.meta.env.VITE_OPTIONAL'], undefined)
    assert.equal(define['import.meta.env.VITE_MY_VAR'], '"hello"')
  })

  test('number value', async ({ assert }) => {
    await createEnvFile({ VITE_NUMBER: '43' })
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_NUMBER: Schema.number() },
    })

    const { define } = await executeValidateEnv(plugin)
    assert.deepEqual(define['import.meta.env.VITE_NUMBER'], '43')
  })

  test('boolean value', async ({ assert }) => {
    await createEnvFile({ VITE_BOOLEAN: 'true' })
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_BOOLEAN: Schema.boolean() },
    })

    const { define } = await executeValidateEnv(plugin)
    assert.deepEqual(define['import.meta.env.VITE_BOOLEAN'], 'true')
  })

  test('log variables when debug is enabled', async ({ assert }) => {
    await createEnvFile({ VITE_BOOLEAN: 'true' })
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_BOOLEAN: Schema.boolean() },
      debug: true,
    })

    await executeValidateEnv(plugin)

    const logs = plugin.ui.logger.getLogs()
    assert.deepEqual(logs[0].message, 'cyan([vite-plugin-validate-env]) debug process.env content')
    assert.deepInclude(logs[1].message, 'cyan(VITE_BOOLEAN): true')
  })

  test('log variables even if validation is failing', async ({ assert }) => {
    await createEnvFile({ VITE_TESTX: 'not boolean' })
    const plugin = ValidateEnv({
      validator: 'builtin',
      schema: { VITE_TESTX: Schema.boolean() },
      debug: true,
    })

    await assert.rejects(
      () => executeValidateEnv(plugin),
      /Value for environment variable "VITE_TESTX" must be a boolean/,
    )

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

import { z } from 'zod'
import * as v from 'valibot'
import { type } from 'arktype'
import { test } from '@japa/runner'

import { createEnvFile, executeValidateEnv, ValidateEnv } from './helpers.js'

test.group('Standard validation adapter | Zod', () => {
  test('basic', async ({ assert }) => {
    await createEnvFile({ VITE_TEST: 'htest' })
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_TEST: z.string().url().max(10),
      },
    })

    await assert.rejects(
      async () => executeValidateEnv(plugin),
      /Invalid value for "VITE_TEST" : Invalid url/,
    )
  })

  test('Transform value', async ({ assert }) => {
    await createEnvFile({ VITE_TEST: 'hello' })
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_TEST: z
          .string()
          .max(10)
          .transform((value) => value.toUpperCase()),
      },
    })

    const { define } = await executeValidateEnv(plugin)
    assert.equal(define['import.meta.env.VITE_TEST'], '"HELLO"')
  })

  test('Custom error message', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_LONG_STRING: z.string().max(10, 'Max 10 characters'),
      },
    })

    await createEnvFile({ VITE_LONG_STRING: 'superlongstring' })
    await assert.rejects(
      () => executeValidateEnv(plugin),
      /Invalid value for "VITE_LONG_STRING" : Max 10 characters/,
    )
  })

  test('Refine value', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_REFINED: z.string().refine((value) => value.length <= 10, {
          message: 'Max 10 characters',
        }),
      },
    })

    await createEnvFile({ VITE_REFINED: 'superlongstring' })

    await assert.rejects(
      async () => executeValidateEnv(plugin),
      /Invalid value for "VITE_REFINED" : Max 10 characters/,
    )
  })

  test('Display multiple errors', async ({ assert }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_A: z.string(),
        VITE_B: z.string(),
      },
    })

    await createEnvFile({})

    try {
      await executeValidateEnv(plugin)
    } catch (error: any) {
      assert.include(error.message, 'Invalid value for "VITE_A" : Required')
      assert.include(error.message, 'Invalid value for "VITE_B" : Required')
    }
  })

  test('Optional Variables', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: { VITE_OPTIONAL_ZOD: z.string().max(2).optional() },
    })

    // Test with the variable set, but invalid
    await createEnvFile({ VITE_OPTIONAL_ZOD: 'hello' })

    await assert.rejects(
      async () => executeValidateEnv(plugin),
      /Invalid value for "VITE_OPTIONAL_ZOD" : String must contain at most 2 character\(s\)/,
    )

    await createEnvFile({})
    const { define } = await executeValidateEnv(plugin)
    assert.equal(define['import.meta.env.VITE_OPTIONAL_ZOD'], undefined)
  })

  test('dont stop validation after undefined result', async ({ assert }) => {
    await createEnvFile({ VITE_MY_VAR: 'hello' })
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_OPTIONAL_ZOD: z.string().max(2).optional(),
        VITE_MY_VAR: z.string(),
      },
    })

    const { define } = await executeValidateEnv(plugin)
    assert.equal(define['import.meta.env.VITE_OPTIONAL_ZOD'], undefined)
    assert.equal(define['import.meta.env.VITE_MY_VAR'], '"hello"')
  })

  test('number value', async ({ assert }) => {
    await createEnvFile({ VITE_NUMBER: '4323' })
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: { VITE_NUMBER: z.preprocess((value) => Number(value), z.number()) },
    })

    const { define } = await executeValidateEnv(plugin)
    assert.equal(define['import.meta.env.VITE_NUMBER'], '4323')
  })

  test('boolean value', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_BOOLEAN: z.preprocess((value) => value === 'true' || value === '1', z.boolean()),
      },
    })

    await createEnvFile({ VITE_BOOLEAN: 'true' })
    const { define } = await executeValidateEnv(plugin)
    assert.equal(define['import.meta.env.VITE_BOOLEAN'], 'true')

    await createEnvFile({ VITE_BOOLEAN: '1' })
    const { define: define2 } = await executeValidateEnv(plugin)
    assert.equal(define2['import.meta.env.VITE_BOOLEAN'], 'true')
  })

  test('log variables when debug is enabled', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_BOOLEAN: z.preprocess((value) => value === 'true' || value === '1', z.boolean()),
      },
      debug: true,
    })

    await createEnvFile({ VITE_BOOLEAN: 'true' })
    await executeValidateEnv(plugin)

    const logs = plugin.ui.logger.getLogs()
    assert.deepEqual(logs[0].message, 'cyan([vite-plugin-validate-env]) debug process.env content')
    assert.deepInclude(logs[1].message, 'cyan(VITE_BOOLEAN): true')
  })

  test('Optional Variables with Default', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: { VITE_OPTIONAL_ZOD: z.string().max(2).optional().default('d') },
      debug: true,
    })

    await createEnvFile({})

    // @ts-ignore
    const { define } = await executeValidateEnv(plugin)
    const logs = plugin.ui.logger.getLogs()

    assert.equal(define['import.meta.env.VITE_OPTIONAL_ZOD'], '"d"')
    assert.deepEqual(logs[0].message, 'cyan([vite-plugin-validate-env]) debug process.env content')
    assert.deepInclude(logs[1].message, 'cyan(VITE_OPTIONAL_ZOD): d')
  })

  test('log variables even if validation is failing', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: { VITE_TESTX: z.boolean() },
      debug: true,
    })

    await createEnvFile({ VITE_TESTX: 'not boolean' })

    await assert.rejects(
      async () => executeValidateEnv(plugin),
      /Invalid value for "VITE_TESTX" : Expected boolean, received string/,
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

test.group('Standard validation adapter | Valibot', () => {
  test('basic valibot', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_TEST: v.pipe(v.string(), v.email()),
      },
    })

    await createEnvFile({ VITE_TEST: 'htest' })
    await assert.rejects(
      async () => executeValidateEnv(plugin),
      /Invalid value for "VITE_TEST" : Invalid email/,
    )
  })
})

test.group('Standard validation adapter | ArkType', () => {
  test('basic arktype', async ({ assert }) => {
    const plugin = ValidateEnv({
      validator: 'standard',
      schema: {
        VITE_TEST: type("'android' | 'ios'"),
      },
    })

    await createEnvFile({ VITE_TEST: 'htest' })
    await assert.rejects(
      async () => executeValidateEnv(plugin),
      /Invalid value for "VITE_TEST" : must be "android" or "ios" \(was "htest"\)/,
    )
  })
})

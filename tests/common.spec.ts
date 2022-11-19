/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { join } from 'path'
import { test } from '@japa/runner'
import { Filesystem } from '@poppinss/dev-utils'
import { Schema, ValidateEnv } from '../src'

const fs = new Filesystem(join(__dirname, 'fixtures'))
const viteConfig = { root: fs.basePath }
const viteEnvConfig = { mode: 'development', command: 'serve' } as const

test.group('vite-plugin-validate-env', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('Basic validation', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv({ VITE_TEST: Schema.boolean() })
    await fs.add(`.env.development`, `VITE_TEST=not boolean`)

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, '"VITE_TEST" must be a boolean')
    }
  })

  test('Custom error message', async ({ assert }) => {
    assert.plan(2)

    const plugin = ValidateEnv({ VITE_TEST: Schema.boolean({ message: 'Heyhey' }) })
    await fs.add(`.env.development`, `VITE_TEST=not boolean`)

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'VITE_TEST')
      assert.include(error.message, 'Heyhey')
    }
  })

  test('Custom validator method', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv({
      VITE_TEST: (_key, value) => {
        if (value !== 'valid') throw new Error('Value must be "valid"')
      },
    })

    await fs.add(`.env.development`, `VITE_TEST=not valid`)

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Value must be "valid"')
    }
  })

  test('Parsing result', async ({ assert }) => {
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

    await fs.add(`.env.development`, `VITE_URL_TRAILING=test.com`)

    // @ts-ignore
    await plugin.config!(viteConfig, viteEnvConfig)
    assert.equal(process.env.VITE_URL_TRAILING, 'test.com/')
  })

  test('Dedicated config file', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv()

    await fs.add(`.env.development`, `VITE_MY_VAR=true`)
    await fs.add(
      `env.ts`,
      `export default {
        VITE_TEST: () => {
          throw new Error('Error validating')
        }
    }`
    )

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Error validating')
    }
  })

  test('Should fail if no schema is found', async ({ assert }) => {
    const plugin = ValidateEnv()

    await fs.add(`.env.development`, `VITE_MY_VAR=true`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(fn, 'Missing configuration for vite-plugin-validate-env')
  })

  test('Should pick up var with custom prefix', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv({ CUSTOM_TEST: Schema.boolean() })

    await fs.add(`.env.development`, `CUSTOM_TEST=not boolean`)

    try {
      // @ts-ignore
      await plugin.config({ ...viteConfig, envPrefix: 'CUSTOM_' }, viteEnvConfig)
    } catch (error: any) {
      assert.include(
        error.message,
        'Value for environment variable "CUSTOM_TEST" must be a boolean, instead received "not boolean"'
      )
    }
  })

  test('Should use envDir option from vite config', async ({ assert }) => {
    assert.plan(1)

    const plugin = ValidateEnv({ VITE_XXX: Schema.string() })

    await fs.add(`./env-directory/.env.development`, `VITE_XXX=bonjour`)

    // @ts-ignore
    await plugin.config({ ...viteConfig, envDir: './env-directory' }, viteEnvConfig)

    assert.equal(process.env.VITE_XXX, 'bonjour')
  })

  test('Display multiple errors', async ({ assert }) => {
    assert.plan(2)

    const plugin = ValidateEnv({
      VITE_TEST: Schema.boolean(),
      VITE_TEST2: Schema.boolean(),
    })

    await fs.add(`.env.development`, '')

    try {
      // @ts-ignore
      await plugin.config(viteConfig, viteEnvConfig)
    } catch (error: any) {
      assert.include(error.message, 'Missing environment variable "VITE_TEST"')
      assert.include(error.message, 'Missing environment variable "VITE_TEST2"')
    }
  })
})

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
    const plugin = ValidateEnv({
      VITE_TEST: Schema.boolean(),
    })

    await fs.add(`.env.development`, `VITE_TEST=not boolean`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(
      fn,
      'E_INVALID_ENV_VALUE: Value for environment variable "VITE_TEST" must be a boolean, instead received "not boolean"'
    )
  })

  test('Custom error message', async ({ assert }) => {
    const plugin = ValidateEnv({
      VITE_TEST: Schema.boolean({ message: 'Heyhey' }),
    })

    await fs.add(`.env.development`, `VITE_TEST=not boolean`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(fn, 'E_INVALID_ENV_VALUE: Heyhey')
  })

  test('Custom validator method', async ({ assert }) => {
    const plugin = ValidateEnv({
      VITE_TEST: (_key, value) => {
        if (value !== 'valid') {
          throw new Error('Value must be "valid"')
        }
      },
    })

    await fs.add(`.env.development`, `VITE_TEST=not valid`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(fn, 'Value must be "valid"')
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

    // @ts-expect-error - `config` is the handler
    await plugin.config!(viteConfig, viteEnvConfig)
    assert.equal(process.env.VITE_URL_TRAILING, 'test.com/')
  })

  test('Dedicated config file', async ({ assert }) => {
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

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(fn, 'Error validating')
  })

  test('Should fail if no schema is found', async ({ assert }) => {
    const plugin = ValidateEnv()

    await fs.add(`.env.development`, `VITE_MY_VAR=true`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, viteConfig, viteEnvConfig)
    await assert.rejects(fn, 'Missing configuration for vite-plugin-validate-env')
  })

  test('Should pick up var with custom prefix', async ({ assert }) => {
    const plugin = ValidateEnv({
      CUSTOM_TEST: Schema.boolean(),
    })

    await fs.add(`.env.development`, `CUSTOM_TEST=not boolean`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, { ...viteConfig, envPrefix: 'CUSTOM_' }, viteEnvConfig)
    await assert.rejects(
      fn,
      'E_INVALID_ENV_VALUE: Value for environment variable "CUSTOM_TEST" must be a boolean, instead received "not boolean"'
    )
  })
})

import { join } from 'path'
import { test } from '@japa/runner'
import { Filesystem } from '@poppinss/dev-utils'
import { Schema, ValidateEnv } from '../src'

const fs = new Filesystem(join(__dirname, 'fixtures'))

test.group('vite-plugin-validate-env', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('Basic validation', async ({ assert }) => {
    const plugin = ValidateEnv({
      VITE_TEST: Schema.boolean(),
    })

    await fs.add(`.env.development`, `VITE_TEST=not boolean`)

    try {
      await plugin.config!({ root: fs.basePath }, { mode: 'development', command: 'serve' })
    } catch (error: any) {
      assert.equal(
        error.message,
        `Value for environment variable "VITE_TEST" must be a boolean, instead received "not boolean"`
      )
    }
  })

  test('Custom error message', async ({ assert }) => {
    const plugin = ValidateEnv({
      VITE_TEST: Schema.boolean({ message: 'Custom error message' }),
    })

    await fs.add(`.env.development`, `VITE_TEST=not boolean`)

    try {
      await plugin.config!({ root: fs.basePath }, { mode: 'development', command: 'serve' })
    } catch (error: any) {
      assert.equal(error.message, `Custom error message`)
    }
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

    try {
      await plugin.config!({ root: fs.basePath }, { mode: 'development', command: 'serve' })
    } catch (error: any) {
      assert.equal(error.message, `Value must be "valid"`)
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

    await plugin.config!({ root: fs.basePath }, { mode: 'development', command: 'serve' })
    assert.equal(process.env.VITE_URL_TRAILING, 'test.com/')
  })
})

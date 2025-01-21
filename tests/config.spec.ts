import { test } from '@japa/runner'

import { Schema } from '../src/index.js'
import { createEnvFile, executeValidateEnv, ValidateEnv } from './helpers.js'

test.group('Config loading', () => {
  test('Dedicated config file', async ({ fs }) => {
    const plugin = ValidateEnv()

    await createEnvFile({ VITE_MY_VAR: 'true' })
    await fs.create(
      `env.ts`,
      `export default {
        VITE_TEST: () => {
          throw new Error('Error validating')
        }
    }`,
    )

    await executeValidateEnv(plugin)
  }).throws(/Error validating/)

  test('dedicated config file custom path', async ({ fs }) => {
    const plugin = ValidateEnv({ configFile: 'import_env' })

    await createEnvFile({ VITE_MY_VAR: 'true' })
    await fs.create(
      `import_env.ts`,
      `export default {
        VITE_TEST: () => {
          throw new Error('Error validating')
        }
    }`,
    )

    await executeValidateEnv(plugin)
  }).throws(/Error validating/)

  test('Should fail if no schema is found', async ({ assert }) => {
    const plugin = ValidateEnv()
    await createEnvFile({ VITE_MY_VAR: 'true' })

    await assert.rejects(
      () => executeValidateEnv(plugin),
      /Missing configuration for vite-plugin-validate-env/,
    )
  })

  test('if inline config is also specified, it should be merged with the dedicated config file', async ({
    fs,
    assert,
  }) => {
    const plugin = ValidateEnv({ VITE_VAR: Schema.number() })

    await createEnvFile({ VITE_TEST: 'true', VITE_VAR: '34' })
    await fs.create(
      `env.ts`,
      `export default {
        VITE_TEST: () => 42
      }`,
    )

    const { define } = await executeValidateEnv(plugin)

    assert.deepEqual(define['import.meta.env.VITE_VAR'], '34')
    assert.deepEqual(define['import.meta.env.VITE_TEST'], '42')
  })

  test('dedicated config file in another folder', async ({ fs }) => {
    const plugin = ValidateEnv({ configFile: 'config/env' })

    await fs.create(
      `config/env.ts`,
      `export default {
        VITE_TEST: (key, value) => {
          throw new Error('Error validating')
        }
      }`,
    )

    await executeValidateEnv(plugin)
  }).throws(/Error validating/)
})

import { test } from '@japa/runner'

import type { UI } from '../src/ui.js'
import { ValidateEnv as CoreTypedValidateEnv, Schema } from '../src/index.js'

const viteEnvConfig = { mode: 'development', command: 'serve' } as const

const ValidateEnv = CoreTypedValidateEnv as (
  ...args: Parameters<typeof CoreTypedValidateEnv>
) => ReturnType<typeof CoreTypedValidateEnv> & { ui: UI }

test.group('Config loading', () => {
  test('Dedicated config file', async ({ fs }) => {
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

    // @ts-ignore
    await plugin.config({ root: fs.basePath }, viteEnvConfig)
  }).throws(/Error validating/)

  test('dedicated config file custom path', async ({ fs }) => {
    const plugin = ValidateEnv({ configFile: 'import_env' })

    await fs.create(`.env.development`, `VITE_MY_VAR=true`)
    await fs.create(
      `import_env.ts`,
      `export default {
        VITE_TEST: () => {
          throw new Error('Error validating')
        }
    }`,
    )

    // @ts-ignore
    await plugin.config({ root: fs.basePath }, viteEnvConfig)
  }).throws(/Error validating/)

  test('Should fail if no schema is found', async ({ assert, fs }) => {
    const plugin = ValidateEnv()

    await fs.create(`.env.development`, `VITE_MY_VAR=true`)

    // @ts-expect-error - `config` is the handler
    const fn = plugin.config!.bind(plugin, { root: fs.basePath }, viteEnvConfig)
    await assert.rejects(fn, 'Missing configuration for vite-plugin-validate-env')
  })

  test('if inline config is also specified, it should be merged with the dedicated config file', async ({
    fs,
    assert,
  }) => {
    const plugin = ValidateEnv({ VITE_VAR: Schema.number() })

    await fs.create(`.env.development`, `VITE_TEST=true\nVITE_VAR=34`)
    await fs.create(
      `env.ts`,
      `export default {
        VITE_TEST: () => 42
      }`,
    )

    // @ts-ignore
    const { define } = await plugin.config({ root: fs.basePath }, viteEnvConfig)

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

    // @ts-ignore
    await plugin.config({ root: fs.basePath }, viteEnvConfig)
  }).throws(/Error validating/)
})

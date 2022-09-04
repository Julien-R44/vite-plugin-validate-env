# vite-plugin-validate-env

This Vite plugin allows you to validate your environment variables at build or dev time. This allows your build/dev-server to [fail-fast](https://en.wikipedia.org/wiki/Fail-fast) if your setup is misconfigured.

No more CI to restart because you are missing an environment variable, or or to realize after 10 minutes of debugging bug that you forgot a variable 🥲

## Installation

```sh
pnpm add -D @julr/vite-plugin-validate-env
```

## Usage

```ts
import { Schema, ValidateEnv } from '@julr/vite-plugin-validate-env'

export default defineConfig({
  plugins: [
    ValidateEnv({
      // Data types
      VITE_STRING_VARIABLE: Schema.string(),
      VITE_BOOLEAN_VARIABLE: Schema.boolean(),
      VITE_NUMBER_VARIABLE: Schema.number(),
      VITE_ENUM_VARIABLE: Schema.enum(['foo', 'bar']),
      
      // Optional variable
      VITE_OPTIONAL_VARIABLE: Schema.boolean.optional(),

      // Specify string format
      VITE_AUTH_API_URL: Schema.string({ format: 'url', protocol: true }),

      // Specify error message
      VITE_APP_PORT: Schema.number({ message: 'You must set a port !' }),

      // Custom validator
      VITE_CUSTOM_VARIABLE: (key, value) => {
        if (!value) {
          throw new Error(`Missing ${key} env variable`)
        }

        if (value.endsWith('foo')) {
          throw new Error('Value cannot end with "foo"')
        }
      },
    }),
  ],
})
```

## License

[MIT](./LICENSE.md) License © 2022 [Julien Ripouteau](https://github.com/Julien-R44)

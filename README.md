# vite-plugin-validate-env

This Vite plugin allows you to validate your environment variables at build or dev time. This allows your build/dev-server to [fail-fast](https://en.wikipedia.org/wiki/Fail-fast) if your setup is misconfigured.

No more CI to restart because you are missing an environment variable, or to realize after 10 minutes of debugging that you forgot a variable 🥲

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
      VITE_ENUM_VARIABLE: Schema.enum(['foo', 'bar'] as const),
      
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

        return value
      },
    }),
  ],
})
```

## Dedicated config file

You can also add a `env.ts` file at the root of your project to define your environment variables.

```ts
// vite.config.ts
export default defineConfig({
  plugins: [ValidateEnv()],
})
```

```ts
// env.ts
export default {
 VITE_MY_VAR: Schema.enum(['foo', 'bar'] as const),
}
```

## Parsing
In addition to the validation of your variables, there is also a parsing that is done. This means that you can modify the value of an environment variable before it is injected. 

Let's imagine the following case: you want to expose a variable `VITE_AUTH_API_URL` in order to use it to call an API. However, you absolutely need a trailing slash at the end of this environment variable. Here's how it can be done :

```ts
export default {
  VITE_AUTH_API_URL: (key, value) => {
    if (!value) {
      throw new Error(`Missing ${key} env variable`)
    }

    if (!value.endsWith('/')) {
      return `${value}/`
    }

    return value
  },
}
```

Now, in your client front-end code, when you call `import.meta.env.VITE_AUTH_API_URL`, you can be sure that it will always end with a slash.

## Typing `import.meta.env`
In order to have a type-safe `import.meta.env`, the ideal is to use the dedicated configuration file `env.ts`.
Once this is done, you would only need to add an `env.d.ts` to augment `ImportMetaEnv` (as [suggested here](https://vitejs.dev/guide/env-and-mode.html#env-files) ) with the following content:

```ts
type EnvSchema = typeof import('../env').default
type Env = { [K in keyof EnvSchema]: ReturnType<EnvSchema[K]> }

interface ImportMetaEnv extends Env {
  // Now import.meta.env is totally type-safe and based on your `env.ts` schema definition
  // Here you can always add custom things that are not in your schema ?
}
```

## License

[MIT](./LICENSE.md) License © 2022 [Julien Ripouteau](https://github.com/Julien-R44)

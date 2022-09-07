<p align="center">
  <img src="https://user-images.githubusercontent.com/8337858/188329992-e74b3393-5bec-48b3-bba9-a8c45d279866.png">
</p>

This Vite plugin allows you to validate your environment variables at build or dev time. This allows your build/dev-server to [fail-fast](https://en.wikipedia.org/wiki/Fail-fast) if your setup is misconfigured.

No more CI to restart because you are missing an environment variable, or to realize after 10 minutes of debugging that you forgot a variable 🥲

## Features
- Validate your environment variables at build time. No runtime overhead
- Totally type-safe
- Support multiple validation librairies ( [Zod](https://zod.dev/), and [@poppinss/validator-lite](https://github.com/poppinss/validator-lite/) )
- Parsing, validation, transformation
- Custom rules and error messages

## Installation

```sh
pnpm add -D @julr/vite-plugin-validate-env
```

## Usage
`vite-plugin-validate-env` plugin allows you to validate your env, either with a very simplified builtin validation lib, or with Zod in the most complex cases when you want a very strict validation.

### Plugin options 
The easiest way to define the options is to directly define the scheme as follows: 
```ts
import { defineConfig } from '@julr/vite-plugin-validate-env'

export default defineConfig({
  plugins: [
    ValidateEnv({
      VITE_MY_VAR: Schema.string()
    }),
  ],
})
```

In case you want to change some plugin options, in particular change the validator (for Zod), you have to set your options as follows: 
```ts
export default defineConfig({
  plugins: [
    ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_MY_VAR: z.string()
      }
    }),
  ],
})
```

### Built-in validator

```ts
import { Schema, ValidateEnv, defineConfig } from '@julr/vite-plugin-validate-env'

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

### Zod Validator
To use the Zod validator, you must first install it if you have not already done so
```
pnpm install zod
```

Then, you can use it as follows: 
```ts
// env.ts
export default defineConfig({
  validator: 'zod',
  schema: {
    VITE_MY_STRING: z.string().min(5, 'This is too short !'),
    VITE_ENUM: z.enum(['a', 'b', 'c']),
    VITE_BOOLEAN_VARIABLE: z.boolean(),
  }
})
```

Beware, there are some limitations if you use Zod. For example, you can't use a boolean or number type directly. Because everything that comes from your `.env` file is a string by default.

So to validate a boolean you must use `preprocess`, and `transform`, like this:
```ts
// env.ts
export default defineConfig({
  validator: 'zod',
  schema: {
    VITE_BOOLEAN_VARIABLE: z
      .preprocess((value) => value === 'true' || value === '1', z.boolean())
  }
})
```

In this case, `true` and `1` will be transformed to `true` and your variable will be valid and considered as a boolean. 

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
export default defineConfig({
 VITE_MY_VAR: Schema.enum(['foo', 'bar'] as const),
})
```

## Transforming variables
In addition to the validation of your variables, there is also a parsing that is done. This means that you can modify the value of an environment variable before it is injected. 

Let's imagine the following case: you want to expose a variable `VITE_AUTH_API_URL` in order to use it to call an API. However, you absolutely need a trailing slash at the end of this environment variable. Here's how it can be done :

```ts
// Built-in validation
export default defineConfig({
  VITE_AUTH_API_URL: (key, value) => {
    if (!value) {
      throw new Error(`Missing ${key} env variable`)
    }

    if (!value.endsWith('/')) {
      return `${value}/`
    }

    return value
  },
})
```

```ts
// Zod validation
export default defineConfig({
  validator: 'zod',
  schema: {
    VITE_AUTH_API_URL: z
      .string()
      .transform((value) => value.endsWith('/') ? value : `${value}/`),
  },
})
```

Now, in your client front-end code, when you call `import.meta.env.VITE_AUTH_API_URL`, you can be sure that it will always end with a slash.

## Typing `import.meta.env`
In order to have a type-safe `import.meta.env`, the ideal is to use the dedicated configuration file `env.ts`.
Once this is done, you would only need to add an `env.d.ts` in `src/` folder to augment `ImportMetaEnv` (as [suggested here](https://vitejs.dev/guide/env-and-mode.html#env-files) ) with the following content:

```ts
/// <reference types="vite/client" />

type ImportMetaEnvAugmented = import('@julr/vite-plugin-validate-env').ImportMetaEnvAugmented<
  typeof import('../env').default
>

interface ImportMetaEnv extends ImportMetaEnvAugmented {
  // Now import.meta.env is totally type-safe and based on your `env.ts` schema definition
  // You can also add custom variables that are not defined in your schema
}

```

## License

[MIT](./LICENSE.md) License © 2022 [Julien Ripouteau](https://github.com/Julien-R44)

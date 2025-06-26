<p align="center">
  <img src="https://user-images.githubusercontent.com/8337858/188329992-e74b3393-5bec-48b3-bba9-a8c45d279866.png">
</p>

# vite-plugin-validate-env

A Vite plugin that validates your environment variables at **build** or **dev time**. This helps you catch misconfigurations early by [failing fast](https://en.wikipedia.org/wiki/Fail-fast). No more broken builds or 10 minutes of debugging just to realize you forgot a variable 🥲

---

## ✅ Features

* Validate environment variables **at build time only**, zero runtime overhead
* Fully **type-safe**
* Supports [standard-schema](https://github.com/standard-schema/standard-schema) — works with Zod, Valibot, ArkType, and more
* Built-in parsing, validation, and transformation
* Custom rules and error messages

---

## Installation

```sh
pnpm add -D @julr/vite-plugin-validate-env
```

## Basic Usage

You can use the plugin with the [built-in validator](https://github.com/poppinss/validator-lite) for simple use cases, or with libraries like Zod for more advanced schemas.

> [!TIP]
> I would recommend using a dedicated `env.ts` file to keep your Vite config clean and separate from your environment variable definitions. See the [Using a Dedicated `env.ts` Config File](#using-a-dedicated-envts-config-file) section for more details.

### Built-in Validator

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { Schema, ValidateEnv } from '@julr/vite-plugin-validate-env'

export default defineConfig({
  plugins: [
    ValidateEnv({
      validator: 'builtin',
      schema: {
        VITE_MY_VAR: Schema.string()
      }
    }),
  ],
})
```

### Standard Schema Validators

If you want to use Zod or another validator compatible with [standard-schema](https://github.com/standard-schema/standard-schema), pass the `validator` and `schema` manually:

```ts
import { defineConfig } from 'vite'
import { z } from 'zod'
import { ValidateEnv } from '@julr/vite-plugin-validate-env'

export default defineConfig({
  plugins: [
    ValidateEnv({
      validator: 'standard', // 👈
      schema: {
        VITE_MY_VAR: z.string()
      }
    }),
  ],
})
```

## Built-in Validator Examples

```ts
ValidateEnv({
  VITE_STRING: Schema.string(),
  VITE_NUMBER: Schema.number(),
  VITE_BOOLEAN: Schema.boolean(),
  VITE_ENUM: Schema.enum(['foo', 'bar'] as const),

  // Optional
  VITE_OPTIONAL: Schema.boolean.optional(),

  // With format and protocol checks
  VITE_API_URL: Schema.string({ format: 'url', protocol: true }),

  // With custom error message
  VITE_PORT: Schema.number({ message: 'You must set a port!' }),

  // Custom validator + transform function
  VITE_URL_SUFFIXED_WITH_SLASH: (key, value) => {
    if (!value) throw new Error(`Missing ${key}`)

    return value.endsWith('/')
      ? value
      : `${value}/`
  },
})
```

## Using Standard Schema

`standard-schema` provides a common interface for multiple validation libraries.

Here’s how to use it with Zod, Valibot, or ArkType, or any other library that supports it.

```ts
import { defineConfig } from '@julr/vite-plugin-validate-env'
import { z } from 'zod'
import * as v from 'valibot'
import { type } from 'arktype'

export default defineConfig({
  validator: 'standard',
  schema: {
    VITE_ZOD_VAR: z.string(),
    VITE_VALIBOT_VAR: v.string(),
    VITE_ARKTYPE_VAR: type.string(),
  },
})
```

## Using a Dedicated `env.ts` Config File

You can move your env definitions to a separate file like this:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { ValidateEnv } from '@julr/vite-plugin-validate-env'

export default defineConfig({
  plugins: [ValidateEnv({
    // Optional: you can specify a custom path for the config file
    configFile: 'config/env'
  })],
})
```

```ts
// env.ts
import { defineConfig, Schema } from '@julr/vite-plugin-validate-env'

export default defineConfig({
  validator: "builtin",
  schema: {
    VITE_MY_VAR: Schema.enum(['foo', 'bar'] as const),
  },
})
```

## Typing `import.meta.env`

In order to have a type-safe `import.meta.env`, the ideal is to use the dedicated configuration file `env.ts`.
Once this is done, you would only need to add an `env.d.ts` in `src/` folder to augment `ImportMetaEnv` (as [suggested here](https://vitejs.dev/guide/env-and-mode.html#env-files) ) with the following content:

```ts
/// <reference types="vite/client" />

type ImportMetaEnvAugmented = import('@julr/vite-plugin-validate-env').ImportMetaEnvAugmented<
  typeof import('../env').default
>

interface ViteTypeOptions {
  // Avoid adding an index type to `ImportMetaDev` so
  // there's an error when accessing unknown properties.
  // ⚠️ This option requires Vite 6.3.x or higher
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv extends ImportMetaEnvAugmented {
  // Now import.meta.env is totally type-safe and based on your `env.ts` schema definition
  // You can also add custom variables that are not defined in your schema
}
```

## Validation without Vite

In some cases, you might want to validate environment variables outside of Vite and reuse the same schema. You can do so by using the `loadAndValidateEnv` function directly. This function will validate and also load the environment variables inside the `process.env` object.

> [!WARNING]
> `process.env` only accept string values, so don't be surprised if a `number` or `boolean` variable comes back as a string when accessing it after validation.

```ts
import { loadAndValidateEnv } from '@julr/vite-plugin-validate-env';

const env = await loadAndValidateEnv(
  {
    mode: 'development', // required
    root: import.meta.dirname, // optional
  },
  { 
    // Plugin options. Also optional if you 
    // are using a dedicated `env.ts` file
    validator: 'builtin',
    schema: { VITE_MY_VAR: Schema.string() },
  },
);

console.log(env.VITE_MY_VAR);
console.log(process.env.VITE_MY_VAR)
```

## 💖 Sponsors

If you find this useful, consider [sponsoring me](https://github.com/sponsors/Julien-R44)! It helps support and maintain the project 🙏

<p align="center">
  <img src="https://github.com/julien-r44/static/blob/main/sponsorkit/sponsors.png?raw=true">
</p>

---

## License

MIT © [Julien Ripouteau](https://github.com/Julien-R44)

/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */

// @ts-ignore
import { z } from 'zod/v4'
import { defineConfig } from 'vite'

// @ts-ignore
import { Schema, ValidateEnv } from '../src/index.js'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    // ValidateEnv({
    //   validator: 'builtin',
    //   debug: true,
    //   schema: {
    //     VITE_STRING: Schema.string(),
    //     VITE_NUMBER: Schema.number(),
    //     VITE_BOOLEAN: Schema.boolean(),
    //   },
    // }),
    ValidateEnv({
      validator: 'standard',
      debug: false,
      schema: {
        VITE_STRING: z.string(),
        VITE_NUMBER: z.preprocess((value) => Number(value), z.number()),
        VITE_BOOLEAN: z.preprocess((value) => value === 'true' || value === '1', z.boolean()),

        VITE_OBJECT: z.preprocess(
          (value) => JSON.parse(value as string),
          z.object({
            a: z.string(),
            b: z.number(),
          }),
        ),
      },
    }),
  ],
})

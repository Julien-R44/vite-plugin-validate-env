/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod'
import { defineConfig } from 'vite'

// @ts-expect-error osef
import { Schema, ValidateEnv } from '../src/index.js'

export default defineConfig({
  root: __dirname,
  plugins: [
    // ValidateEnv({
    //   VITE_STRING: Schema.string(),
    //   VITE_NUMBER: Schema.number(),
    //   VITE_BOOLEAN: Schema.boolean(),
    // }),
    ValidateEnv({
      validator: 'zod',
      schema: {
        VITE_STRING: z.string(),
        VITE_NUMBER: z.preprocess((value) => Number(value), z.number()),
        VITE_BOOLEAN: z.preprocess((value) => value === 'true' || value === '1', z.boolean()),

        VITE_OBJECT: z.preprocess(
          (value) => {
            console.log(value)
            return JSON.parse(value as string)
          },
          z.object({
            a: z.string(),
            b: z.number(),
          }),
        ),
      },
    }),
  ],
})

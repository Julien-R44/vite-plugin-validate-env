import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  clean: true,
  sourcemap: true,
  format: ['esm'],
  deps: {
    neverBundle: ['vite'],
  },
  target: false,
})

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  clean: true,
  external: ['vite'],
  sourcemap: true,
  format: ['cjs', 'esm'],
})

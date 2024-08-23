import { defineConfig, type Options } from 'tsup'
import { bundleless } from 'tsup-plugin-bundleless'

const tsupConfig: Options = {
  bundle: true,
  dts: true,
  external: [/^virtual:.*/],
}

const esm: Options = {
  ...tsupConfig,
  entry: ['src/client/**/*.ts'],
  target: 'es2022',
  outDir: 'dist/client',
  format: ['esm'],
  splitting: false,
  outExtension: () => ({ js: '.js' }),
  plugins: [bundleless({ ext: '.js' })],
  dts: {
    banner: '/// <reference types="vite/client" />',
  },
}

const cjs: Options = {
  ...tsupConfig,
  outDir: 'dist/node',
  entry: ['src/node/index.ts'],
  format: ['cjs', 'esm'],
}

export default defineConfig([esm, cjs])

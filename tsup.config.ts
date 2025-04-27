import { defineConfig, type Options } from 'tsup'
import { bundleless } from 'tsup-plugin-bundleless'

const tsupConfig: Options = {
  bundle: true,
  dts: true,
  external: [/^virtual:.*/],
}

const esm: Options = {
  ...tsupConfig,
  entry: ['src/isomorph/**/*.ts'],
  target: 'es2022',
  outDir: 'dist/isomorph',
  format: ['esm', 'cjs'],
  splitting: false,
  dts: {
    banner: '/// <reference types="vite/client" />',
  },
  ...bundleless(),
}

const cjs: Options = {
  ...tsupConfig,
  outDir: 'dist/node',
  entry: ['src/node/index.ts'],
  format: ['cjs', 'esm'],
  banner(ctx) {
    if (ctx.format === 'esm') {
      return {
        js: `import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
    `,
      }
    }
  },
}

export default defineConfig([esm, cjs])

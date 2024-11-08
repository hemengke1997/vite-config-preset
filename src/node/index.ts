import type tsconfigPaths from 'vite-tsconfig-paths'
import { type Options as ReactOptions } from '@vitejs/plugin-react'
import createDebug from 'debug'
import deepMerge from 'deepmerge'
import glob from 'fast-glob'
import path from 'node:path'
import {
  type ConfigEnv,
  loadEnv,
  normalizePath,
  type PluginOption,
  splitVendorChunkPlugin,
  type UserConfig,
  mergeConfig as viteMergeConfig,
} from 'vite'
import { type Json5Options } from 'vite-plugin-json5'
import { type VitePluginSvgrOptions } from 'vite-plugin-svgr'
import { type viteVConsoleOptions } from 'vite-plugin-vconsole'
import { type LegacyOptions } from './plugins/legacy'
import { visualizer as visualizerPlugin } from './plugins/visualizer'
import { injectEnv, pathsMapToAlias } from './utils'
import { isBoolean } from './utils/is'

const debug = createDebug('vite-config')

interface PluginOptions {
  /**
   * @default
   * { svgrOptions: { icon: true } }
   */
  svgr?: VitePluginSvgrOptions | false
  /**
   * @default false
   */
  legacy?: LegacyOptions | boolean
  /**
   * @default
   * when csr and not legacy render
   * @suggestion
   * disable if you want legacy render
   */
  splitVendorChunk?: boolean
  /**
   * @default true
   */
  logBuildTime?: boolean
  /**
   * @default false
   */
  vConsole?: boolean | viteVConsoleOptions
  /**
   * tsconfig alias
   * @default true
   */
  tsconfigPaths?: boolean | Parameters<typeof tsconfigPaths>[0]
  /**
   * @default true
   */
  react?: boolean | ReactOptions
  /**
   * @default true
   */
  json5?: boolean | Json5Options
}

const defaultOptions: PluginOptions = {
  svgr: { svgrOptions: { icon: true } },
  legacy: false,
  splitVendorChunk: undefined,
  logBuildTime: true,
  vConsole: false,
  tsconfigPaths: true,
  react: true,
  json5: true,
}

async function setupPlugins(options: PluginOptions, configEnv: ConfigEnv, root: string) {
  options = deepMerge(defaultOptions, options, { arrayMerge: (_, source) => source })

  debug('options:', options)

  const { isSsrBuild } = configEnv

  let { svgr, legacy, splitVendorChunk, logBuildTime, vConsole, tsconfigPaths, react, json5 } =
    options as Required<PluginOptions>

  const vitePlugins: PluginOption = [visualizerPlugin()]

  if (svgr !== false) {
    const { svgr: svgrPlugin } = await import('./plugins/svgr')
    vitePlugins.push(svgrPlugin(svgr))
  }

  if (splitVendorChunk !== false) {
    // splitVendorChunk brings inline css which make style order
    // and css weights wrong in legacy render
    // https://github.com/vitejs/vite/issues/2062
    !isSsrBuild && !legacy && vitePlugins?.push(splitVendorChunkPlugin())
  }

  if (legacy !== false) {
    const { legacy: legacyPlugin } = await import('./plugins/legacy')

    if (legacy === true) {
      legacy = {
        renderLegacyChunks: true,
        renderModernChunks: true,
        polyfills: true,
        modernPolyfills: true,
        additionalLegacyPolyfills: ['core-js/proposals/global-this'],
      }
    }

    vitePlugins.push(legacyPlugin(legacy))
  }

  if (logBuildTime) {
    const { logBuildTime: logBuildTimePlugin } = await import('./plugins/log-build-time')
    vitePlugins.push(logBuildTimePlugin(configEnv))
  }

  if (vConsole) {
    let entryDir = 'src'
    const { isPackageExists } = await import('local-pkg')
    if (isPackageExists('vite-plugin-remix-flat-routes')) {
      entryDir = 'app'
    }
    const { vConsole: vConsolePlugin } = await import('./plugins/vconsole')
    const entries = await glob(normalizePath(`${root}/${entryDir}/main.ts{,x}`))

    const consoleConfig = isBoolean(vConsole) ? ({} as viteVConsoleOptions) : vConsole

    vitePlugins.push(
      vConsolePlugin({
        ...consoleConfig,
        entry: consoleConfig?.entry || normalizePath(`${entries[0]}`),
      }),
    )
  }

  if (tsconfigPaths) {
    const { tsconfigPathsPlugin } = await import('./plugins/tsconfig-paths')
    vitePlugins.push(tsconfigPathsPlugin(isBoolean(tsconfigPaths) ? {} : tsconfigPaths))
  }

  if (react) {
    const { react: reactPlugin } = await import('./plugins/react')
    vitePlugins.push(reactPlugin(isBoolean(react) ? {} : react))
  }

  if (json5) {
    const { json5: json5Plugin } = await import('./plugins/json5')
    vitePlugins.push(json5Plugin(isBoolean(json5) ? {} : json5))
  }

  debug('plugins:', vitePlugins)

  return vitePlugins
}

const getDefaultConfig = async (config: { root: string } & ConfigEnv, options?: PluginOptions): Promise<UserConfig> => {
  const { root, ...configEnv } = config

  return {
    root,
    mode: configEnv.mode,
    resolve: {
      alias: pathsMapToAlias(root),
    },
    plugins: await setupPlugins(options || {}, configEnv, root),
    build: {
      minify: 'esbuild',
      chunkSizeWarningLimit: 2048,
      sourcemap: false,

      // https://github.com/evanw/esbuild/issues/121#issuecomment-646956379
      target: options?.legacy === false ? ['es2015'] : undefined,
      reportCompressedSize: false,
      rollupOptions: {
        treeshake: true,
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes(`"use client"`)) {
            return
          }
          warn(warning)
        },
        output: {
          chunkFileNames(chunkInfo) {
            if (chunkInfo.facadeModuleId) {
              const pageChunkNames = ['index', 'route', 'page', 'layout']
              if (pageChunkNames.some((chunk) => new RegExp(`_?${chunk}$`).test(chunkInfo.name))) {
                const parentDir = path.basename(path.dirname(chunkInfo.facadeModuleId))
                if (parentDir) {
                  return `${parentDir}.[name]-[hash].js`
                }
              }
            }
            return `[name]-[hash].js`
          },
        },
      },
      ssrManifest: configEnv.isSsrBuild,
    },
  }
}

const preset = async (
  userConfig: UserConfig & {
    env: ConfigEnv
  },
  options?: PluginOptions,
) => {
  const { env, ...viteConfig } = userConfig
  const { mode } = env
  const root = viteConfig.root || process.cwd()

  const envVars = loadEnv(mode, root)
  debug('envVars:', envVars)
  injectEnv(envVars)

  const config = viteMergeConfig(await getDefaultConfig({ root, ...env }, options), viteConfig)
  debug('config:', config)

  return config
}

export { preset }
export default preset

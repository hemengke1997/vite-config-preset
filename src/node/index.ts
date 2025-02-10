import type tsconfigPaths from 'vite-tsconfig-paths'
import { type Options as ReactOptions } from '@vitejs/plugin-react'
import createDebug from 'debug'
import deepMerge from 'deepmerge'
import glob from 'fast-glob'
import { isPackageExists } from 'local-pkg'
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
import { type MinChunkSizeOptions } from './plugins/min-chunk-size'
import { type RestrictImagesOptions } from './plugins/restrict-images'
import { visualizer as visualizerPlugin } from './plugins/visualizer'
import { injectEnv, pathsMapToAlias } from './utils'
import { isBoolean } from './utils/is'

const debug = createDebug('vite-config')

interface PluginOptions {
  /**
   * 是否把 .env 中的变量注入到 process.env 中
   * @default false
   */
  injectDotEnv?: boolean
  /**
   * svgr 插件
   *
   * @default
   * { svgrOptions: { icon: true } }
   */
  svgr?: VitePluginSvgrOptions | false
  /**
   * legacy 插件
   * 自动探测 @vitejs/plugin-legacy
   */
  legacy?: LegacyOptions | boolean
  /**
   * 分包策略
   *
   * @default
   * when csr and not legacy render
   * @suggestion
   * disable if you want legacy render
   */
  splitVendorChunk?: boolean
  /**
   * 打印构建时间
   *
   * @default true
   */
  logBuildTime?: boolean
  /**
   * vconsole 插件
   *
   * 按需自行安装 vconsole
   *
   * @default false
   */
  vConsole?: boolean | viteVConsoleOptions
  /**
   * tsconfig 别名
   *
   * tsconfig alias
   * @default true
   */
  tsconfigPaths?: boolean | Parameters<typeof tsconfigPaths>[0]
  /**
   * react 插件
   * 自动探测 @vitejs/plugin-react
   */
  react?: boolean | ReactOptions
  /**
   * @default true
   */
  json5?: boolean | Json5Options
  /**
   * 增强构建后的 chunk 文件结构和名称可读性
   *
   * make chunk file name more readable
   * @default true
   */
  chunkReadable?: boolean
  /**
   * chunk size limit. If the size of a chunk is less than the limit, it will be inlined into the parent chunk.
   * @default false
   */
  minChunkSize?: boolean | MinChunkSizeOptions
  /**
   * 限制图片导入类型，只允许指定类型的图片导入
   * 如果开启，默认只允许导入 .webp 和 .svg 类型的图片
   * 也可传入 allowedExtensions 来指定允许导入的图片类型
   *
   * Restrict the types of images imported, only allow importing images of the specified types
   * If enabled, only .webp and .svg images are allowed to be imported by default
   * You can also pass in allowedExtensions to specify the types of images that are allowed to be imported
   *
   * @default false
   */
  restrictImages?: boolean | RestrictImagesOptions
}

const defaultOptions: PluginOptions = {
  svgr: { svgrOptions: { icon: true } },
  legacy: undefined,
  splitVendorChunk: undefined,
  logBuildTime: true,
  vConsole: false,
  tsconfigPaths: true,
  react: undefined,
  json5: true,
  chunkReadable: true,
  minChunkSize: false,
  restrictImages: false,
}

async function setupPlugins(options: PluginOptions, configEnv: ConfigEnv, root: string) {
  debug('options:', options)

  const { isSsrBuild } = configEnv

  let {
    svgr,
    legacy,
    splitVendorChunk,
    logBuildTime,
    vConsole,
    tsconfigPaths,
    react,
    json5,
    chunkReadable,
    minChunkSize,
    restrictImages,
  } = options as Required<PluginOptions>

  const vitePlugins: PluginOption = [visualizerPlugin()]

  if (chunkReadable !== false) {
    const { chunkReadable } = await import('./plugins/chunk-readable')
    vitePlugins.push(chunkReadable())
  }

  if (minChunkSize !== false) {
    const { minChunkSize: minChunkSizePlugin } = await import('./plugins/min-chunk-size')
    vitePlugins.push(minChunkSizePlugin(isBoolean(minChunkSize) ? {} : minChunkSize))
  }

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
    // detect @vitejs/plugin-legacy
    if (isPackageExists('@vitejs/plugin-legacy')) {
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
  }

  if (logBuildTime) {
    const { logBuildTime: logBuildTimePlugin } = await import('./plugins/log-build-time')
    vitePlugins.push(logBuildTimePlugin(configEnv))
  }

  if (vConsole) {
    let entryDir = 'src'
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

  if (react !== false) {
    if (isPackageExists('@vitejs/plugin-react')) {
      const { react: reactPlugin } = await import('./plugins/react')
      vitePlugins.push(reactPlugin(isBoolean(react) ? {} : react))
    }
  }

  if (json5) {
    const { json5: json5Plugin } = await import('./plugins/json5')
    vitePlugins.push(json5Plugin(isBoolean(json5) ? {} : json5))
  }

  if (restrictImages) {
    const { restrictImages: restrictImagesPlugin } = await import('./plugins/restrict-images')
    vitePlugins.push(restrictImagesPlugin(isBoolean(restrictImages) ? {} : restrictImages))
  }

  debug('plugins:', vitePlugins)

  return vitePlugins
}

const getDefaultConfig = async (config: { root: string } & ConfigEnv, options?: PluginOptions): Promise<UserConfig> => {
  const { root, ...configEnv } = config

  const ASSETS_DIR = 'assets'

  return {
    root,
    mode: configEnv.mode,
    resolve: {
      alias: pathsMapToAlias(root),
    },
    ssr: {
      noExternal: ['vite-config-preset'],
    },
    plugins: await setupPlugins(options || {}, configEnv, root),
    build: {
      minify: 'esbuild',
      chunkSizeWarningLimit: 2048,
      sourcemap: false,
      // https://github.com/evanw/esbuild/issues/121#issuecomment-646956379
      target: options?.legacy === false ? ['es2015'] : undefined,
      reportCompressedSize: false,
      assetsDir: ASSETS_DIR,
      rollupOptions: {
        treeshake: true,
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes(`"use client"`)) {
            return
          }
          warn(warning)
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
  options = deepMerge(defaultOptions, options || {}, { arrayMerge: (_, source) => source })
  const { injectDotEnv } = options
  const { env, ...viteConfig } = userConfig
  const { mode } = env
  const root = viteConfig.root || process.cwd()

  if (injectDotEnv) {
    const envVars = loadEnv(mode, root, viteConfig.envPrefix)
    debug('envVars:', envVars)
    injectEnv(envVars)
  }

  const config = viteMergeConfig(await getDefaultConfig({ root, ...env }, options), viteConfig)
  debug('config:', config)

  return config
}

export { preset }
export default preset

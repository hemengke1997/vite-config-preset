import { isArray, isObject } from 'lodash-es'
import path from 'node:path'
import { type PluginOption } from 'vite'

// make chunk file name more readable
export function chunkReadable(): PluginOption {
  return [
    {
      name: 'vite-chunk-readable',
      config(config) {
        const output = config.build?.rollupOptions?.output
        if (!output || (isObject(output) && !isArray(output) && !output.chunkFileNames)) {
          const { assetsDir } = config.build || {}

          return {
            build: {
              rollupOptions: {
                output: {
                  chunkFileNames(chunkInfo) {
                    if (chunkInfo.facadeModuleId) {
                      const pageChunkNames = ['index', 'route', 'page', 'layout']
                      if (pageChunkNames.some((chunk) => new RegExp(`_?${chunk}$`).test(chunkInfo.name))) {
                        const parentDir = path.basename(path.dirname(chunkInfo.facadeModuleId))
                        if (parentDir) {
                          return `${assetsDir}/js/${parentDir}.[name].[hash].js`
                        }
                      }
                    }
                    return `${assetsDir}/js/[name].[hash].js`
                  },
                  entryFileNames: `${assetsDir}/js/[name].[hash].js`,
                  assetFileNames: (assetInfo) => {
                    const extType = assetInfo.name
                    if (extType && /css/i.test(extType)) {
                      return `${assetsDir}/css/[name].[hash][extname]`
                    }
                    return `${assetsDir}/static/[name].[hash][extname]`
                  },
                },
              },
            },
            worker: {
              rollupOptions: {
                output: {
                  entryFileNames() {
                    return `${assetsDir}/js/worker/[name].[hash].js`
                  },
                  assetFileNames() {
                    return `${assetsDir}/js/worker/[name].[hash].js`
                  },
                },
              },
            },
          }
        }
      },
    },
  ]
}

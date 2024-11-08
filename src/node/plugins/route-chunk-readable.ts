import path from 'node:path'
import { type PluginOption } from 'vite'

function isObject(obj: unknown): obj is Record<string, unknown> {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

// make route chunk file name more readable
export function chunkReadable(): PluginOption {
  return [
    {
      name: 'vite-route-chunk-readable',
      config(config) {
        const output = config.build?.rollupOptions?.output
        if (!output || (isObject(output) && !output.chunkFileNames)) {
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
                          return `${assetsDir}/${parentDir}.[name]-[hash].js`
                        }
                      }
                    }
                    return `${assetsDir}/[name]-[hash].js`
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

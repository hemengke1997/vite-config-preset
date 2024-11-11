import { isArray, isObject } from 'lodash-es'
import { type PluginOption } from 'vite'

export type MinChunkSizeOptions = {
  size?: number
}

export function minChunkSize(option?: MinChunkSizeOptions): PluginOption {
  const { size = 200 } = option || {}

  return {
    name: 'vite-min-chunk-size',
    config(config) {
      const output = config.build?.rollupOptions?.output
      if (!output || (isObject(output) && !isArray(output) && !output.experimentalMinChunkSize)) {
        return {
          build: {
            rollupOptions: {
              output: {
                experimentalMinChunkSize: size * 1000, // {size} kb
              },
              experimentalLogSideEffects: false,
            },
          },
        }
      }
    },
  }
}

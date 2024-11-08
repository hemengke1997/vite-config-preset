import { logTimeInfo } from 'picologger'
import { type ConfigEnv, type PluginOption } from 'vite'

export function logBuildTime(configEnv: ConfigEnv): PluginOption {
  const { mode } = configEnv

  const infoStr = logTimeInfo(mode)

  return {
    name: 'vite-log-build-time',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return {
          html,
          tags: [
            {
              injectTo: 'body',
              children: infoStr,
              tag: 'script',
            },
          ],
        }
      },
    },
  }
}

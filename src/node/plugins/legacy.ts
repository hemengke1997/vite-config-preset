import pluginLegacy from '@vitejs/plugin-legacy'
import { type Plugin } from 'vite'

export type LegacyOptions = Parameters<typeof pluginLegacy>[0]

export function legacy(options?: LegacyOptions): Plugin[] {
  return pluginLegacy({
    ...options,
  }) as Plugin[]
}

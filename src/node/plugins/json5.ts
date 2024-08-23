import json5Plugin, { type Json5Options } from 'vite-plugin-json5'

export function json5(options?: Json5Options) {
  return json5Plugin(options)
}

import { type PluginContext } from 'rollup'
import { type PluginOption } from 'vite'

export type RestrictImagesOptions = {
  imageExtensions?: string[]
  allowedExtensions?: string[]
  level?: 'error' | 'warn'
}

export function restrictImages(options: RestrictImagesOptions): PluginOption {
  let { allowedExtensions, level = 'error', imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'] } = options

  if (!allowedExtensions || allowedExtensions.length === 0) {
    allowedExtensions = ['.webp', '.svg']
  }

  const checkExtension = (ctx: PluginContext, id: string) => {
    const extension = id.slice(id.lastIndexOf('.'))
    if (!imageExtensions.includes(extension)) {
      return
    }

    if (!allowedExtensions.includes(extension)) {
      const msg = `[vite-config-preset]: Only ${allowedExtensions.join(', ')} images are allowed. Found: ${id}`
      if (level === 'warn') {
        ctx.warn(msg)
      } else {
        ctx.error(msg)
      }
    }
  }

  return {
    name: 'vite-plugin-restrict-images',
    enforce: 'pre',
    load(id) {
      checkExtension(this, id)
    },
    transform(code, id) {
      if (id.endsWith('.css')) {
        const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g
        const matches = code.matchAll(urlRegex)
        for (const match of matches) {
          checkExtension(this, match[1])
        }
        return code
      }
    },
  }
}

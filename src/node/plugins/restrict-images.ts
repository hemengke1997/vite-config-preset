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

  return {
    name: 'vite-plugin-restrict-images',
    enforce: 'pre',
    load(id) {
      const extension = id.slice(id.lastIndexOf('.'))

      if (!imageExtensions.includes(extension)) {
        return
      }

      if (!allowedExtensions.includes(extension)) {
        const msg = `[vite-config-preset]: Only ${allowedExtensions.join(', ')} images are allowed. Found: ${id}`
        if (level === 'warn') {
          this.warn(msg)
          return
        } else {
          this.error(msg)
        }
      }
    },
  }
}

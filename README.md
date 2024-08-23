# vite-config

预设常用的vite配置，包括：

- [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) (按需安装)
- [@vitejs/plugin-legacy](https://www.npmjs.com/package/@vitejs/plugin-legacy) (按需安装)
- [vite-plugin-svgr](https://www.npmjs.com/package/vite-plugin-svgr) (内置)
- [vite-tsconfig-paths](https://www.npmjs.com/package/vite-tsconfig-paths) (内置)
- [vite-plugin-vconsole](https://www.npmjs.com/package/vite-plugin-vconsole) (内置)
- [rollup-plugin-visualizer](https://www.npmjs.com/package/rollup-plugin-visualizer) (内置)
- [vite-plugin-json5](https://www.npmjs.com/package/vite-plugin-json5) (内置)

## 安装

```bash
npm i vite @vitejs/plugin-react @vitejs/plugin-legacy -D
```

## 使用

### vite.config.ts

```ts
import { defineConfig } from 'vite'
import { preset } from 'vite-config-preset'

// https://vitejs.dev/config/
export default defineConfig((env) => {
  return preset(
    {
      env,
    },
    {
      legacy: true, // 是否启用 legacy 插件
    },
  )
})
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["vite-config-preset/plugin"]
  }
}
```

## 其他常用vite插件

未内置，但常用的vite插件

- [vite-plugin-i18n-ally](https://www.npmjs.com/package/vite-plugin-i18n-ally)
- [vite-plugin-public-typescript](https://www.npmjs.com/package/vite-plugin-public-typescript)
- [vite-plugin-html](https://www.npmjs.com/package/vite-plugin-html)
- [vite-plugin-istanbul-widget](https://www.npmjs.com/package/vite-plugin-istanbul-widget)
- [vite-plugin-remix-flat-routes](https://www.npmjs.com/package/vite-plugin-remix-flat-routes)

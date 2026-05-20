import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [
    vue(),
    cssInjectedByJsPlugin()
  ],

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api']
      }
    }
  },

  build: {
    lib: {
      entry: resolve(__dirname, 'src/components/VueFuckingGallery.js'),
      name: 'VueFuckingGallery',
      fileName: 'vue-fucking-gallery'
    },
    rollupOptions: {
      external: ['vue', 'zrender'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          zrender: 'ZRender'
        }
      }
    }
  }
})
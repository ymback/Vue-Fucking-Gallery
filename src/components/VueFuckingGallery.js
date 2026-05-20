import VueFuckingGalleryLib from './VueFuckingGallery.vue'

// 1. 具名导出，支持局部引入：import { VueFuckingGallery } from 'vue-fucking-gallery'
export const VueFuckingGallery = VueFuckingGalleryLib

// 2. 默认导出插件，支持全局引入：app.use(FuckingGalleryPlugin)
const vueFuckingGalleryInstall = {
  install(app) {
    app.component('vue-fucking-gallery', VueFuckingGalleryLib)
    app.component('VueFuckingGallery', VueFuckingGalleryLib)
  }
}

export default vueFuckingGalleryInstall
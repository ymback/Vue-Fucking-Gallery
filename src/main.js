import { createApp } from 'vue'
import App from './App.vue'
import VueFuckingGallery from './components/vue-fucking-gallery.js' // 指向你上面的那个文件

const app = createApp(App)

// 使用插件
app.use(VueFuckingGallery)

app.mount('#app')
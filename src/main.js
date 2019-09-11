import Vue from 'vue'
import App from './App.vue'
import VueFuckingGallery from './lib/vue-fucking-gallery.js'

Vue.use(VueFuckingGallery)

new Vue({
  el: '#app',
  render: h => h(App)
})

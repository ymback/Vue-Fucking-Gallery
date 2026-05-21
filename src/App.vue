<template>
  <div id="appContainer" :class="loadingClass">
    <div ref="loaderWrapper" id="loader-wrapper">
      <div id="loader"></div>
      <div class="loader-section section-left"></div>
      <div class="loader-section section-right"></div>
      <div class="load-title">Loading Vue Fucking Gallery Demo<br><span>Build 3.0.0</span></div>
    </div>

    <VueFuckingGallery :element-id="id" :grid-max-width="gridMaxWidth" :grid-max-height="gridMaxHeight"
      :grid-divider-width="gridDividerWidth" :grid-divider-color="gridDividerColor" :slide-wait-time="slideWaitTime"
      :use-animate="useAnimate" :animate-speed="animateSpeed" :animate-speed-delay="animateSpeedDelay"
      :animate-item-direction="animateItemDirection" :animate-row-direction="animateRowDirection"
      :animate-column-direction="animateColumnDirection" :animate-show-order="animateShowOrder"
      :animate-effect="animateEffect" :canvas-animate-easing="canvasAnimateEasing" :image-list="imageList"
      :use-un-splash="useUnSplash" :un-splash-tag="unSplashTag" :un-splash-access-key="unSplashAccessKey"
      :init-load-finish-callback="initLoadFinishCallback" :photo-load-success-callback="photoLoadSuccessCallback"
      :animate-begin-callback="animateBeginCallback" :animate-end-callback="animateEndCallback" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
// 确保这里的路径和你实际存放组件的路径一致
import VueFuckingGallery from './components/vue-fucking-gallery.vue'

// ==========================================
// 1. 模板引用 DOM
// ==========================================
const loaderWrapper = ref(null)

// ==========================================
// 2. 响应式配置参数 (替代 data)
// ==========================================
const id = ref('gallery')
const gridMaxWidth = ref(180)
const gridMaxHeight = ref(180)
const gridDividerWidth = ref(0)
const gridDividerColor = ref('#fff')
const slideWaitTime = ref(4000)
const useAnimate = ref(true)
const animateSpeed = ref(100)
const animateSpeedDelay = ref(10)
const animateItemDirection = ref('snake')
const animateRowDirection = ref('left')
const animateColumnDirection = ref('top')
const animateShowOrder = ref('singleItem')
const animateEffect = ref('opacity')
const canvasAnimateEasing = ref('SinusoidalInOut')
const imageList = ref([])
const useUnSplash = ref(true)
const unSplashTag = ref('japan')
const unSplashAccessKey = ref(import.meta.env.VITE_UNSPLASH_ACCESS_KEY)
const loadingClass = ref('')

// ==========================================
// 3. 工具方法
// ==========================================
const isIE = () => {
  return !!window.ActiveXObject || 'ActiveXObject' in window || (/Trident\/7\./).test(navigator.userAgent)
}

// ==========================================
// 4. 回调函数配置
// ==========================================
const initLoadFinishCallback = () => {
  loadingClass.value = 'loaded'

  if (isIE()) {
    if (loaderWrapper.value) {
      const titleEl = loaderWrapper.value.querySelector('.load-title')
      if (titleEl) titleEl.removeNode(true)
      setTimeout(() => {
        if (loaderWrapper.value) loaderWrapper.value.removeNode(true)
      }, 3000)
    }
    return
  }

  if (loaderWrapper.value) {
    const titleEl = loaderWrapper.value.querySelector('.load-title')
    if (titleEl) titleEl.remove()
    setTimeout(() => {
      if (loaderWrapper.value) loaderWrapper.value.remove()
    }, 3000)
  }
}

const photoLoadSuccessCallback = () => {
  // console.log('Photo loaded successfully')
}

const animateBeginCallback = () => {
  // console.log('Animation began')
}

const animateEndCallback = (stats) => {
  // console.log('Animation ended', stats)
}
</script>

<style lang="scss">
html {
  width: 100%;
  height: 100%;
  overflow: hidden;

  body {
    width: 100%;
    height: 100%;
    margin: 0;

    #app {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;

      #appContainer {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }
    }
  }
}

#loader-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999999;

  #loader {
    display: block;
    position: relative;
    left: 50%;
    top: 50%;
    width: 150px;
    height: 150px;
    margin: -75px 0 0 -75px;
    border-radius: 50%;
    border: 3px solid transparent;
    /* COLOR 1 */
    border-top-color: #FFF;
    -webkit-animation: spin 2s linear infinite;
    /* Chrome, Opera 15+, Safari 5+ */
    -ms-animation: spin 2s linear infinite;
    /* Chrome, Opera 15+, Safari 5+ */
    -moz-animation: spin 2s linear infinite;
    /* Chrome, Opera 15+, Safari 5+ */
    -o-animation: spin 2s linear infinite;
    /* Chrome, Opera 15+, Safari 5+ */
    animation: spin 2s linear infinite;
    /* Chrome, Firefox 16+, IE 10+, Opera */
    z-index: 1001;

    &:before {
      content: "";
      position: absolute;
      top: 5px;
      left: 5px;
      right: 5px;
      bottom: 5px;
      border-radius: 50%;
      border: 3px solid transparent;
      /* COLOR 2 */
      border-top-color: #FFF;
      -webkit-animation: spin 3s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      -moz-animation: spin 3s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      -o-animation: spin 3s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      -ms-animation: spin 3s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      animation: spin 3s linear infinite;
      /* Chrome, Firefox 16+, IE 10+, Opera */
    }

    &:after {
      content: "";
      position: absolute;
      top: 15px;
      left: 15px;
      right: 15px;
      bottom: 15px;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: #FFF;
      /* COLOR 3 */
      -moz-animation: spin 1.5s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      -o-animation: spin 1.5s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      -ms-animation: spin 1.5s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      -webkit-animation: spin 1.5s linear infinite;
      /* Chrome, Opera 15+, Safari 5+ */
      animation: spin 1.5s linear infinite;
      /* Chrome, Firefox 16+, IE 10+, Opera */
    }
  }

  .loader-section {
    position: fixed;
    top: 0;
    width: 51%;
    height: 100%;
    background: #6cf;
    z-index: 1000;
    -webkit-transform: translateX(0);
    /* Chrome, Opera 15+, Safari 3.1+ */
    -ms-transform: translateX(0);
    /* IE 9 */
    transform: translateX(0);
    /* Firefox 16+, IE 10+, Opera */
  }

  .loader-section.section-left {
    left: 0;
  }

  .loader-section.section-right {
    right: 0;
  }

  .load-title {
    font-family: 'Open Sans';
    color: #FFF;
    font-size: 19px;
    width: 100%;
    text-align: center;
    z-index: 9999999999999;
    position: absolute;
    top: 60%;
    opacity: 1;
    line-height: 30px;

    span {
      font-weight: normal;
      font-style: italic;
      font-size: 13px;
      color: #FFF;
      opacity: 0.5;
    }
  }
}

@-webkit-keyframes spin {
  0% {
    -webkit-transform: rotate(0deg);
    /* Chrome, Opera 15+, Safari 3.1+ */
    -ms-transform: rotate(0deg);
    /* IE 9 */
    transform: rotate(0deg);
    /* Firefox 16+, IE 10+, Opera */
  }

  100% {
    -webkit-transform: rotate(360deg);
    /* Chrome, Opera 15+, Safari 3.1+ */
    -ms-transform: rotate(360deg);
    /* IE 9 */
    transform: rotate(360deg);
    /* Firefox 16+, IE 10+, Opera */
  }
}

@keyframes spin {
  0% {
    -webkit-transform: rotate(0deg);
    /* Chrome, Opera 15+, Safari 3.1+ */
    -ms-transform: rotate(0deg);
    /* IE 9 */
    transform: rotate(0deg);
    /* Firefox 16+, IE 10+, Opera */
  }

  100% {
    -webkit-transform: rotate(360deg);
    /* Chrome, Opera 15+, Safari 3.1+ */
    -ms-transform: rotate(360deg);
    /* IE 9 */
    transform: rotate(360deg);
    /* Firefox 16+, IE 10+, Opera */
  }
}

.loaded {
  width: 100%;
  height: 100%;
  margin: 0;

  #loader-wrapper {
    visibility: hidden;
    -webkit-transform: translateY(-100%);
    /* Chrome, Opera 15+, Safari 3.1+ */
    -ms-transform: translateY(-100%);
    /* IE 9 */
    transform: translateY(-100%);
    /* Firefox 16+, IE 10+, Opera */
    -webkit-transition: all 0.3s 1s ease-out;
    transition: all 0.3s 1s ease-out;

    .loader-section.section-left {
      -webkit-transform: translateX(-100%);
      /* Chrome, Opera 15+, Safari 3.1+ */
      -ms-transform: translateX(-100%);
      /* IE 9 */
      transform: translateX(-100%);
      /* Firefox 16+, IE 10+, Opera */
      -webkit-transition: all 0.7s 0.3s cubic-bezier(0.645, 0.045, 0.355, 1.000);
      transition: all 0.7s 0.3s cubic-bezier(0.645, 0.045, 0.355, 1.000);
    }

    .loader-section.section-right {
      -webkit-transform: translateX(100%);
      /* Chrome, Opera 15+, Safari 3.1+ */
      -ms-transform: translateX(100%);
      /* IE 9 */
      transform: translateX(100%);
      /* Firefox 16+, IE 10+, Opera */
      -webkit-transition: all 0.7s 0.3s cubic-bezier(0.645, 0.045, 0.355, 1.000);
      transition: all 0.7s 0.3s cubic-bezier(0.645, 0.045, 0.355, 1.000);
    }
  }

  #loader {
    opacity: 0;
    -webkit-transition: all 0.3s ease-out;
    transition: all 0.3s ease-out;
  }
}
</style>
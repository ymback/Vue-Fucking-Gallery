<!--suppress ReservedWordAsName, JSUnusedGlobalSymbols -->
<template>
  <div ref="fuckingDiv" :id="elementId" class="vue-fucking-gallery-container">
    <div class='vue-fucking-gallery-div' v-show="currentImageObject !== null && showCanvas">
      <div v-show="animationSolution === 'byCanvas'">
        <canvas ref="fuckingByCanvas"></canvas>
      </div>
      <ul ref="fuckingByCss3" v-show="animationSolution === 'byCss3'"></ul>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
import * as ZRender from 'zrender'

// ==========================================
// 1. 定义 Props
// ==========================================
const props = defineProps({
  elementId: { type: String, default: 'vue-fucking-gallery' },
  animationSolution: {
    type: String, default: 'byCanvas',
    validator: (value) => ['byCanvas', 'byCss3'].includes(value)
  },
  showCanvas: { type: Boolean, default: true },
  gridMaxWidth: {
    type: Number, default: 200,
    validator: (value) => value >= 48 && Number.isInteger(value)
  },
  gridMaxHeight: {
    type: Number, default: 200,
    validator: (value) => value >= 48 && Number.isInteger(value)
  },
  gridDividerWidth: {
    type: Number, default: 1,
    validator: (value) => value >= 0 && value <= 100 && Number.isInteger(value)
  },
  gridDividerColor: {
    type: String, default: '#fff',
    validator: (value) => /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(value)
  },
  slideWaitTime: {
    type: Number, default: 5000,
    validator: (value) => value >= 1000 && Number.isInteger(value)
  },
  useAnimate: { type: Boolean, default: true },
  animateSpeed: {
    type: Number, default: 150,
    validator: (value) => value >= 100 && Number.isInteger(value)
  },
  animateSpeedDelay: {
    type: Number, default: 10,
    validator: (value) => value >= 5 && Number.isInteger(value)
  },
  animateItemDirection: {
    type: String, default: 'left',
    validator: (value) => ['left', 'top', 'right', 'bottom', 'random', 'none', 'snake'].includes(value)
  },
  animateRowDirection: {
    type: String, default: 'left',
    validator: (value) => ['left', 'right', 'random'].includes(value)
  },
  animateColumnDirection: {
    type: String, default: 'top',
    validator: (value) => ['top', 'bottom', 'random'].includes(value)
  },
  animateShowOrder: {
    type: String, default: 'singleItem',
    validator: (value) => ['singleItem', 'multiLine', 'random'].includes(value)
  },
  animateEffect: {
    type: String, default: 'opacity',
    validator: (value) => ['opacity', 'none', 'sameRandom', 'eachRandom'].includes(value)
  },
  canvasAnimateEasing: {
    type: String, default: 'SinusoidalInOut',
    validator: (value) => ['Linear', 'QuadraticIn', 'QuadraticOut', 'QuadraticInOut', 'CubicIn', 'CubicOut', 'CubicInOut', 'QuarticIn', 'QuarticOut', 'QuarticInOut', 'QuinticIn', 'QuinticOut', 'QuinticInOut', 'SinusoidalIn', 'SinusoidalOut', 'SinusoidalInOut', 'ExponentialIn', 'ExponentialOut', 'ExponentialInOut', 'CircularIn', 'CircularOut', 'CircularInOut', 'ElasticIn', 'ElasticOut', 'ElasticInOut', 'BackIn', 'BackOut', 'BackInOut', 'BounceIn', 'BounceOut', 'BounceInOut', 'sameRandom', 'eachRandom'].includes(value)
  },
  css3AnimateEasing: {
    type: String, default: 'ease',
    validator: (value) => ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'sameRandom', 'eachRandom'].includes(value) ||
      /^cubic-bezier\((1|(0\.\d+)),(1|(0\.\d+)),(1|(0\.\d+)),(1|(0\.\d+))\)$/.test(value)
  },
  imageList: { type: Array, default: () => [] },
  useUnSplash: { type: Boolean, default: false },
  unSplashTag: { type: String, default: 'japan' },
  unSplashAccessKey: { type: String, default: '' },
  initLoadFinishCallback: Function,
  photoLoadSuccessCallback: Function,
  animateBeginCallback: Function,
  animateEndCallback: Function
})

// ==========================================
// 2. 模板 DOM 引用
// ==========================================
const fuckingDiv = ref(null)
const fuckingByCanvas = ref(null)
const fuckingByCss3 = ref(null)

// ==========================================
// 3. 响应式状态定义
// ==========================================
const drawImageObjectCanvas = shallowRef(null)
const rootZRender = shallowRef(null)
const css3GridParent = shallowRef(null)
const css3SlideGridList = shallowRef(null)
const css3SlideGridAList = shallowRef(null)
const css3SlideGridBList = shallowRef(null)
const zRenderStaticImageGroup = shallowRef(null)
const zRenderAnimationImageGroup = shallowRef(null)
const currentImageObject = shallowRef(null)
const nextImageObject = shallowRef(null)
const snakeSort = shallowRef(null)

const unSplashUrl = ref(null)
const useUnSplashService = ref(false)
const rowCount = ref(1)
const columnCount = ref(1)
const gridItemCount = ref(1)
const normalRowItemWidth = ref(null)
const lastRowItemWidth = ref(null)
const normalColumnItemHeight = ref(null)
const lastColumnItemHeight = ref(null)
const excludeDividerElementWidth = ref(null)
const excludeDividerElementHeight = ref(null)
const activeImageListIndex = ref(0)
const nextImageStartLoadTime = ref(0)
const loadErrorTimes = ref(0)
const animationRunning = ref(false)
const isLoadingImage = ref(false)

let windowResizeSetTimer = null
let waitAnimationFinishTimer = null
let slideWaitTimer = null

// ==========================================
// 4. 监听器 Watchers
// ==========================================
watch(() => props.animationSolution, (newVal, oldVal) => {
  if (newVal === oldVal) return
  if (newVal === 'byCanvas') { clearCss3() } else { clearCanvas() }
  resizeElement(false, true)
})

watch(() => props.showCanvas, (newVal, oldVal) => {
  if (newVal === oldVal) return
  if (newVal === true) { start(); return }
  clearCanvas()
  clearCss3()
})

watch(() => props.gridMaxWidth, (newVal, oldVal) => {
  if (newVal === oldVal) return
  resizeElement(false, true)
})

watch(() => props.gridMaxHeight, (newVal, oldVal) => {
  if (newVal === oldVal) return
  resizeElement(false, true)
})

watch(() => props.gridDividerWidth, (newVal, oldVal) => {
  if (newVal === oldVal) return
  resizeElement(false, true)
})

watch(() => props.gridDividerColor, (newVal, oldVal) => {
  if (newVal === oldVal) return
  redrawDividerColor()
})

watch(() => props.imageList, (newVal, oldVal) => {
  if (newVal.length === oldVal.length && newVal.every(a => oldVal.some(b => a === b)) && oldVal.every(_b => newVal.some(_a => _a === _b))) {
    return
  }
  initImageSource()
}, { deep: true })

watch(() => props.useUnSplash, (newVal, oldVal) => {
  if (newVal === oldVal) return
  initImageSource()
})

watch(() => props.unSplashTag, (newVal, oldVal) => {
  if (newVal === oldVal) return
  initImageSource()
})

// ==========================================
// 【终极完善】处理 Resize 事件并重新请求高清图
// ==========================================
const handleResize = () => {
  if (windowResizeSetTimer !== null) clearTimeout(windowResizeSetTimer)

  // 防抖时间稍微加长到 200ms，避免拖拽窗口边缘时疯狂发请求
  windowResizeSetTimer = setTimeout(() => {
    resizeElement(true, true)

    // 【核心需求：resize要重新拿图并在下一张替换掉】
    // 只有在动态获取图片的模式下，且当前不在播放动画的等待期内
    if (useUnSplashService.value && !animationRunning.value) {

      // 1. 打断当前的幻灯片倒计时
      if (slideWaitTimer !== null) clearTimeout(slideWaitTimer)

      // 2. 丢弃那张尺寸不对的旧 "下一张图"
      nextImageObject.value = null

      // 3. 强制释放加载锁
      isLoadingImage.value = false

      // 4. 发起请求，它会根据刚计算出的新尺寸重新 fetch
      // 获取成功后，imageLoaded 会自动重启计时器进入下一张
      loadImage(true)
    }

    windowResizeSetTimer = null
  }, 200)
}

onMounted(() => {
  rootZRender.value = ZRender.init(fuckingByCanvas.value)
  drawImageObjectCanvas.value = ZRender.util.createCanvas()

  redrawDividerColor()
  initImageSource()
  resizeElement(false, false)

  if (props.showCanvas) {
    start()
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (windowResizeSetTimer !== null) clearTimeout(windowResizeSetTimer)
  if (waitAnimationFinishTimer !== null) clearTimeout(waitAnimationFinishTimer)
  if (slideWaitTimer !== null) clearTimeout(slideWaitTimer)

  window.removeEventListener('resize', handleResize)
  if (rootZRender.value) rootZRender.value.dispose()
})

// ==========================================
// 6. 核心方法 Methods
// ==========================================
function start() {
  loadImage()
}

function clearCanvas() {
  if (zRenderStaticImageGroup.value !== null) {
    rootZRender.value.remove(zRenderStaticImageGroup.value)
    zRenderStaticImageGroup.value = null
  }
  if (zRenderAnimationImageGroup.value !== null) {
    rootZRender.value.remove(zRenderAnimationImageGroup.value)
    zRenderAnimationImageGroup.value = null
  }
  animationRunning.value = false
  if (windowResizeSetTimer !== null) clearTimeout(windowResizeSetTimer)
  if (waitAnimationFinishTimer !== null) clearTimeout(waitAnimationFinishTimer)
  if (slideWaitTimer !== null) clearTimeout(slideWaitTimer)
}

function clearCss3() {
  if (fuckingByCss3.value) fuckingByCss3.value.innerHTML = ''
  if (css3GridParent.value !== null) {
    if (isIE()) { css3GridParent.value.removeNode(true) } else { css3GridParent.value.remove() }
  }
  css3SlideGridList.value = null
  css3SlideGridAList.value = null
  css3SlideGridBList.value = null
}

function reset() {
  clearCanvas()
  clearCss3()
  currentImageObject.value = null
  nextImageObject.value = null
}

function initImageSource() {
  activeImageListIndex.value = 0
  useUnSplashService.value = props.useUnSplash === true || (props.imageList === null || props.imageList.length < 1)
}

// ==========================================
// 【终极重写】动态判断横竖屏 + 动态高清像素级拉取
// ==========================================
async function loadImage(notResetStartTime) {
  if (isLoadingImage.value === true) return
  isLoadingImage.value = true
  if (notResetStartTime !== true) nextImageStartLoadTime.value = new Date().getTime()

  let imageObj = new Image()
  imageObj.setAttribute('crossOrigin', 'Anonymous')

  let finalUrl = ''

  if (useUnSplashService.value) {
    // 获取当前容器的真实物理尺寸
    const containerWidth = fuckingDiv.value.offsetWidth || window.innerWidth
    const containerHeight = fuckingDiv.value.offsetHeight || window.innerHeight

    // 1. 动态判断请求横图还是竖图
    let orientation = 'landscape'
    if (containerHeight > containerWidth) {
      orientation = 'portrait'
    } else if (containerHeight === containerWidth) {
      orientation = 'squarish'
    }

    if (props.unSplashAccessKey) {
      try {
        // 请求 API 时带上动态算出的 orientation
        const res = await fetch(`https://api.unsplash.com/photos/random?client_id=${props.unSplashAccessKey}&query=${props.unSplashTag}&orientation=${orientation}`)
        if (!res.ok) throw new Error(`Unsplash API Error: ${res.status}`)
        const data = await res.json()

        // 2. 极致高清图方案 (结合 dpr 视网膜屏幕像素比)
        const dpr = window.devicePixelRatio || 1
        const targetW = Math.round(containerWidth * dpr)
        const targetH = Math.round(containerHeight * dpr)

        // 使用 raw 原始地址，通过 Imgix 引擎动态裁剪出完美适配当前屏幕的高清图 (q=85 保证画质与体积平衡)
        finalUrl = `${data.urls.raw}&w=${targetW}&h=${targetH}&fit=crop&q=85&auto=format`

      } catch (e) {
        console.warn('⚠️ Unsplash API 请求失败或超限，已自动降级为 Picsum 占位图。', e.message)
        // 假设这是计算出的目标宽高
        const targetW = Math.round(containerWidth * (window.devicePixelRatio || 1))
        const targetH = Math.round(containerHeight * (window.devicePixelRatio || 1))

        // 把原来的 picsum.photos 替换为 loremflickr，并传入用户的 tag
        const fallbackTag = props.unSplashTag || 'landscape'
        finalUrl = `https://loremflickr.com/${targetW}/${targetH}/${fallbackTag}?random=${new Date().getTime()}`
      }
    } else {
      // 假设这是计算出的目标宽高
      const targetW = Math.round(containerWidth * (window.devicePixelRatio || 1))
      const targetH = Math.round(containerHeight * (window.devicePixelRatio || 1))

      // 把原来的 picsum.photos 替换为 loremflickr，并传入用户的 tag
      const fallbackTag = props.unSplashTag || 'landscape'
      finalUrl = `https://loremflickr.com/${targetW}/${targetH}/${fallbackTag}?random=${new Date().getTime()}`
    }
  } else {
    finalUrl = props.imageList[activeImageListIndex.value]
  }

  imageObj.src = finalUrl

  if (imageObj.complete) {
    imageLoaded(imageObj)
    return
  }
  imageObj.onload = () => { imageLoaded(imageObj) }
  imageObj.onerror = () => {
    loadErrorTimes.value++
    if (useUnSplashService.value === false && loadErrorTimes.value > props.imageList.length) {
      isLoadingImage.value = false
      console.error('图片列表全部加载失败，请检查 imageList。')
      return
    }
    setActiveImageListToNext()
    loadImage(true)
  }
}

function imageLoaded(imageObj) {
  isLoadingImage.value = false
  if (!props.showCanvas) return
  let firstTime = currentImageObject.value === null

  if (firstTime) {
    if (props.initLoadFinishCallback !== null && (typeof props.initLoadFinishCallback) !== 'undefined') {
      props.initLoadFinishCallback()
    }
    currentImageObject.value = imageObj
  } else {
    let currentImageToDataURL = getImageObjectCanvas(currentImageObject.value, { width: currentImageObject.value.width, height: currentImageObject.value.height }).toDataURL()
    let nextImageObjectToDataURL = getImageObjectCanvas(imageObj, { width: imageObj.width, height: imageObj.height }).toDataURL()
    if (currentImageToDataURL === nextImageObjectToDataURL) {
      setActiveImageListToNext()
      loadImage(true)
      return
    }
    nextImageObject.value = imageObj
  }

  if (props.photoLoadSuccessCallback !== null && (typeof props.photoLoadSuccessCallback) !== 'undefined') {
    props.photoLoadSuccessCallback()
  }

  loadErrorTimes.value = 0
  let timeDiff = new Date().getTime() - nextImageStartLoadTime.value

  if (firstTime) {
    redraw()
    setActiveImageListToNext()
    loadImage()
    return
  }

  if (slideWaitTimer !== null) clearTimeout(slideWaitTimer)

  if (timeDiff >= props.slideWaitTime) {
    setActiveImageListToNext()
    startAnimation()
    return
  }

  slideWaitTimer = setTimeout(() => {
    setActiveImageListToNext()
    startAnimation()
  }, props.slideWaitTime - timeDiff)
}

function resizeElement(windowResize, needRedraw) {
  if (!fuckingDiv.value) return
  rowCount.value = Math.floor((fuckingDiv.value.offsetWidth + props.gridDividerWidth) / (props.gridMaxWidth + props.gridDividerWidth))
  columnCount.value = Math.floor((fuckingDiv.value.offsetHeight + props.gridDividerWidth) / (props.gridMaxHeight + props.gridDividerWidth))
  gridItemCount.value = rowCount.value * columnCount.value
  excludeDividerElementWidth.value = fuckingDiv.value.offsetWidth - props.gridDividerWidth * (rowCount.value - 1)
  excludeDividerElementHeight.value = fuckingDiv.value.offsetHeight - props.gridDividerWidth * (columnCount.value - 1)
  normalRowItemWidth.value = Math.floor(excludeDividerElementWidth.value / rowCount.value)
  normalColumnItemHeight.value = Math.floor(excludeDividerElementHeight.value / columnCount.value)
  lastRowItemWidth.value = excludeDividerElementWidth.value - (rowCount.value - 1) * normalRowItemWidth.value
  lastColumnItemHeight.value = excludeDividerElementHeight.value - (columnCount.value - 1) * normalColumnItemHeight.value

  rotationSnakeSort()

  if (props.animationSolution === 'byCanvas') {
    resizeCanvas(windowResize, needRedraw)
    return
  }
  resizeCss3(windowResize, needRedraw)
}

function resizeCanvas(windowResize, needRedraw) {
  rootZRender.value.resize({ width: fuckingDiv.value.offsetWidth, height: fuckingDiv.value.offsetHeight })
  if (windowResize || needRedraw) { redraw(windowResize === true) }
}

function resizeCss3(windowResize, needRedraw) {
  clearCss3()
  let gridHtml = ''
  let htmlTemp = {
    parentTemp: '<li class="slider-parent"></li>',
    gridTemp: '<div class="slider-grid"><div class="slider-grid-a"></div><div class="slider-grid-b"></div></div>'
  }
  fuckingByCss3.value.innerHTML = htmlTemp.parentTemp
  css3GridParent.value = fuckingByCss3.value.querySelector('.slider-parent')
  for (let i = 0; i < gridItemCount.value; i++) { gridHtml += htmlTemp.gridTemp }
  css3GridParent.value.innerHTML = gridHtml
  css3SlideGridList.value = css3GridParent.value.querySelectorAll('.slider-grid')
  css3SlideGridAList.value = css3GridParent.value.querySelectorAll('.slider-grid-a')
  css3SlideGridBList.value = css3GridParent.value.querySelectorAll('.slider-grid-b')

  ZRender.util.each(css3SlideGridList.value, (gridItem, index) => {
    let top = Math.floor(index / rowCount.value) % columnCount.value * (normalColumnItemHeight.value + props.gridDividerWidth)
    let left = index % rowCount.value * (normalRowItemWidth.value + props.gridDividerWidth)
    let gridItemWidth = (index % rowCount.value < rowCount.value - 1) ? normalRowItemWidth.value : lastRowItemWidth.value
    let gridItemHeight = Math.floor(index / rowCount.value) < (columnCount.value - 1) ? normalColumnItemHeight.value : lastColumnItemHeight.value
    gridItem.style['left'] = left + 'px'
    gridItem.style['top'] = top + 'px'
    gridItem.style['width'] = gridItemWidth + 'px'
    gridItem.style['height'] = gridItemHeight + 'px'
  })

  if (windowResize || needRedraw) { redraw(windowResize === true) }
}

function redraw(forceRedraw) {
  if (!props.showCanvas) return
  if (currentImageObject.value === null) {
    loadImage()
    return
  }
  redrawDividerColor()
  if (props.animationSolution === 'byCanvas') {
    redrawCanvas(forceRedraw)
    return
  }
  redrawCss3(forceRedraw)
}

function redrawCanvas(forceRedraw) {
  if (animationRunning.value) {
    if (forceRedraw !== true) return
    if (waitAnimationFinishTimer !== null) clearTimeout(waitAnimationFinishTimer)
    if (nextImageObject.value !== null) {
      currentImageObject.value = nextImageObject.value
      nextImageObject.value = null
    }
    loadImage()
    if (zRenderAnimationImageGroup.value !== null) {
      rootZRender.value.remove(zRenderAnimationImageGroup.value)
      zRenderAnimationImageGroup.value = null
    }
    rootZRender.value.clearAnimation()
    if (props.animateEndCallback !== null && (typeof props.animateEndCallback) !== 'undefined') {
      props.animateEndCallback()
    }
  }
  animationRunning.value = false
  if (zRenderStaticImageGroup.value !== null) {
    rootZRender.value.remove(zRenderStaticImageGroup.value)
    zRenderStaticImageGroup.value = null
  }
  zRenderStaticImageGroup.value = new ZRender.Group()
  ZRender.util.each(getZRenderImageListForCanvas(currentImageObject.value), (image) => {
    zRenderStaticImageGroup.value.add(image)
  })
  rootZRender.value.add(zRenderStaticImageGroup.value)
  rootZRender.value.refreshImmediately()
}

function redrawCss3(forceRedraw) {
  if (animationRunning.value) {
    if (forceRedraw !== true) return
    if (waitAnimationFinishTimer !== null) clearTimeout(waitAnimationFinishTimer)
    if (nextImageObject.value !== null) {
      currentImageObject.value = nextImageObject.value
      nextImageObject.value = null
    }
    loadImage()
  }
  animationRunning.value = false
  resetGridB()
  let canvasList = getImageCanvasListForCss3(currentImageObject.value)
  ZRender.util.each(css3SlideGridAList.value, (gridItem, index) => {
    gridItem.style['background-image'] = 'url(' + canvasList[index] + ')'
    gridItem.style['background-repeat'] = 'no-repeat'
    gridItem.style['background-size'] = '100% 100%'
  })
}

function resetGridB() {
  ZRender.util.each(css3SlideGridBList.value, (gridItem) => {
    gridItem.style['display'] = 'none'
    gridItem.style['background-image'] = ''
    gridItem.style['animation-name'] = ''
    gridItem.style['animation-duration'] = ''
    gridItem.style['animation-delay'] = ''
    gridItem.style['animation-fill-mode'] = ''
    gridItem.style['animation-timing-function'] = ''
    gridItem.style['top'] = 0 + 'px'
    gridItem.style['left'] = 0 + 'px'
  })
}

function redrawDividerColor() {
  if (rootZRender.value !== null && rootZRender.value.dom) {
    rootZRender.value.dom.style.backgroundColor = props.gridDividerColor
  }
  if (fuckingByCss3.value !== null) {
    fuckingByCss3.value.style.backgroundColor = props.gridDividerColor
  }
}

function startAnimation() {
  if (props.useAnimate !== true) {
    noUseAnimationFinished()
    return
  }
  animationRunning.value = true
  if (props.animateBeginCallback !== null && (typeof props.animateBeginCallback) !== 'undefined') {
    props.animateBeginCallback()
  }
  let maxRunTime
  if (props.animationSolution === 'byCanvas') {
    maxRunTime = calcAnimationAndReturnMaxRunTimeByCanvas()
  } else {
    maxRunTime = calcAnimationAndReturnMaxRunTimeByCss3()
  }
  waitAnimationFinishTimer = setTimeout(() => {
    animationFinished()
  }, maxRunTime + 250)
}

function animationFinished() {
  animationRunning.value = false
  currentImageObject.value = nextImageObject.value
  nextImageObject.value = null
  waitAnimationFinishTimer = null
  if (zRenderAnimationImageGroup.value !== null) {
    rootZRender.value.remove(zRenderAnimationImageGroup.value)
    zRenderAnimationImageGroup.value = null
  }
  if (props.animateEndCallback !== null && (typeof props.animateEndCallback) !== 'undefined') {
    props.animateEndCallback()
  }
  redraw()
  loadImage()
}

function noUseAnimationFinished() {
  animationRunning.value = false
  currentImageObject.value = nextImageObject.value
  nextImageObject.value = null
  if (zRenderAnimationImageGroup.value !== null) {
    rootZRender.value.remove(zRenderAnimationImageGroup.value)
    zRenderAnimationImageGroup.value = null
  }
  redraw()
  loadImage()
}

function getBaseAnimationConfig() {
  let resultConfig = {}
  resultConfig.animateItemDirection = props.animateItemDirection
  resultConfig.animateShowOrder = props.animateShowOrder
  if (resultConfig.animateItemDirection === 'random') { resultConfig.animateShowOrder = 'random' }
  if (resultConfig.animateItemDirection === 'snake') { resultConfig.animateShowOrder = 'singleItem' }

  let canvasAnimateEasingTemp = props.canvasAnimateEasing
  if (canvasAnimateEasingTemp === 'sameRandom') canvasAnimateEasingTemp = getCanvasRandomEasing()
  resultConfig.canvasAnimateEasing = canvasAnimateEasingTemp

  let css3AnimateEasingTemp = props.css3AnimateEasing
  if (css3AnimateEasingTemp === 'sameRandom') css3AnimateEasingTemp = getCss3RandomEasing()
  resultConfig.css3AnimateEasing = css3AnimateEasingTemp

  let animateRowDirectionTemp = props.animateRowDirection
  if (animateRowDirectionTemp === 'random') animateRowDirectionTemp = ['left', 'right'][parseInt(Math.random() * 2, 10)]
  resultConfig.animateRowDirection = animateRowDirectionTemp

  let animateColumnDirectionTemp = props.animateColumnDirection
  if (animateColumnDirectionTemp === 'random') animateColumnDirectionTemp = ['top', 'bottom'][parseInt(Math.random() * 2, 10)]
  resultConfig.animateColumnDirection = animateColumnDirectionTemp

  let animateEffectCanUseArray = []
  if (resultConfig.animateItemDirection === 'none') {
    animateEffectCanUseArray = ['opacity']
  } else {
    switch (props.animateEffect) {
      case 'none': animateEffectCanUseArray = ['none']; break
      case 'sameRandom': animateEffectCanUseArray = [['opacity', 'none'][parseInt(Math.random() * 3, 10)]]; break
      case 'eachRandom': animateEffectCanUseArray = ['opacity', 'none']; break
      default: animateEffectCanUseArray = [props.animateEffect]; break
    }
  }
  resultConfig.animateEffectCanUseArray = animateEffectCanUseArray
  return resultConfig
}

function getItemSingleConfig(item, baseConfig, index) {
  let storeConfig = {}
  if (item !== null) storeConfig = { x: item.style.x, y: item.style.y }
  storeConfig.animateItemDirection = baseConfig.animateItemDirection
  storeConfig.animateRowDirection = baseConfig.animateRowDirection
  storeConfig.animateColumnDirection = baseConfig.animateColumnDirection

  if (storeConfig.animateItemDirection === 'random') {
    storeConfig.animateItemDirectionRunning = ['left', 'top', 'right', 'bottom'][parseInt(Math.random() * 4, 10)]
  } else if (storeConfig.animateItemDirection === 'snake') {
    let indexInRow = index % rowCount.value
    let indexInColumn = Math.floor(index / rowCount.value)
    if (indexInRow >= indexInColumn && indexInRow <= (rowCount.value - (indexInColumn + 1)) && indexInColumn <= (Math.floor(columnCount.value / 2) - (columnCount.value % 2 === 0 ? 1 : 0))) {
      storeConfig.animateItemDirectionRunning = 'left'
    } else if (indexInRow >= (columnCount.value - indexInColumn - 1) && indexInRow < (rowCount.value - (columnCount.value - indexInColumn)) && indexInColumn > (Math.floor(columnCount.value / 2) - (columnCount.value % 2 === 0 ? 1 : 0))) {
      storeConfig.animateItemDirectionRunning = 'right'
    } else if (indexInColumn > indexInRow && indexInColumn < (columnCount.value - (indexInRow + 1)) && indexInRow <= Math.ceil(rowCount.value / 2)) {
      storeConfig.animateItemDirectionRunning = 'bottom'
    } else {
      storeConfig.animateItemDirectionRunning = 'top'
    }
  } else {
    storeConfig.animateItemDirectionRunning = storeConfig.animateItemDirection
  }

  storeConfig.animateShowOrder = baseConfig.animateShowOrder
  storeConfig.animateEffect = baseConfig.animateEffectCanUseArray[parseInt(Math.random() * baseConfig.animateEffectCanUseArray.length, 10)]
  if (baseConfig.canvasAnimateEasing === 'eachRandom') storeConfig.canvasAnimateEasing = getCanvasRandomEasing()
  if (baseConfig.css3AnimateEasing === 'eachRandom') storeConfig.css3AnimateEasing = getCss3RandomEasing()

  storeConfig.runTime = Math.floor(props.animateSpeed * props.animateSpeedDelay)
  storeConfig.delayTime = calcDelayTime(baseConfig, index)
  return storeConfig
}

function rotationSnakeSort() {
  let k = 1
  let result = []
  for (let i = 0; i < columnCount.value; i++) result[i] = []
  let small = Math.min(rowCount.value, columnCount.value)
  let count = Math.ceil(small / 2)
  for (let i = 0; i < count; i++) {
    let maxRight = rowCount.value - 1 - i
    let maxBottom = columnCount.value - 1 - i
    for (let j = i; j <= maxRight; j++) result[i][j] = k++
    for (let j = i; j < maxBottom; j++) result[j + 1][maxRight] = k++
    for (let j = maxRight - 1; j >= i; j--) {
      if (result[maxBottom][j]) break
      result[maxBottom][j] = k++
    }
    for (let j = maxBottom - 1; j > i; j--) {
      if (result[j][i]) break
      result[j][i] = k++
    }
  }
  snakeSort.value = result
}

function calcDelayTime(config, index) {
  if (config.animateItemDirection === 'snake') {
    let newIndex = snakeSort.value[Math.floor(index / rowCount.value)][index % rowCount.value]
    return Math.ceil(props.animateSpeed * newIndex / (props.animateSpeedDelay * 0.2))
  }
  if (config.animateShowOrder === 'random') return Math.ceil(props.animateSpeed * parseInt(Math.random() * props.animateSpeedDelay, 10))
  if (config.animateShowOrder === 'multiLine') {
    switch (config.animateItemDirection) {
      case 'left': return Math.ceil(props.animateSpeed * (index % rowCount.value) / (props.animateSpeedDelay * 0.2))
      case 'right': return Math.ceil(props.animateSpeed * (rowCount.value - index % rowCount.value - 1) / (props.animateSpeedDelay * 0.2))
      case 'top': return Math.floor(props.animateSpeed * Math.floor(index / rowCount.value) / (props.animateSpeedDelay * 0.2))
      case 'bottom': return Math.floor(props.animateSpeed * (columnCount.value - Math.floor(index / rowCount.value) - 1) / (props.animateSpeedDelay * 0.2))
    }
    return Math.ceil(props.animateSpeed * parseInt(Math.random() * props.animateSpeedDelay, 10))
  }
  if (config.animateShowOrder === 'singleItem') {
    if (config.animateRowDirection === 'right') {
      switch (config.animateColumnDirection) {
        case 'bottom':
          let currentLineDesc = columnCount.value - Math.floor(index / rowCount.value)
          let newIndexDesc = (rowCount.value - index % rowCount.value - 1) + rowCount.value * currentLineDesc
          return Math.ceil(props.animateSpeed * newIndexDesc / (props.animateSpeedDelay * 0.2))
        default:
          let currentLine = Math.floor(index / rowCount.value)
          let newIndex = (rowCount.value - index % rowCount.value - 1) + rowCount.value * currentLine
          return Math.ceil(props.animateSpeed * newIndex / (props.animateSpeedDelay * 0.2))
      }
    }
    switch (config.animateColumnDirection) {
      case 'bottom':
        let currentLineDesc = columnCount.value - Math.floor(index / rowCount.value)
        let newIndexDesc = index % rowCount.value + rowCount.value * currentLineDesc
        return Math.ceil(props.animateSpeed * newIndexDesc / (props.animateSpeedDelay * 0.2))
      default:
        return Math.ceil(props.animateSpeed * index / (props.animateSpeedDelay * 0.2))
    }
  }
  return Math.ceil(props.animateSpeed * parseInt(Math.random() * props.animateSpeedDelay, 10))
}

function calcAnimationAndReturnMaxRunTimeByCanvas() {
  if (zRenderAnimationImageGroup.value !== null) {
    rootZRender.value.remove(zRenderAnimationImageGroup.value)
    zRenderAnimationImageGroup.value = null
  }
  zRenderAnimationImageGroup.value = new ZRender.Group()
  let zRenderImageList = getZRenderImageListForCanvas(nextImageObject.value)
  let maxRunTime = 0
  let baseConfig = getBaseAnimationConfig()

  ZRender.util.each(zRenderImageList, (item, index) => {
    item.initConfigData = getItemSingleConfig(item, baseConfig, index)
    if (item.initConfigData.animateItemDirection !== 'none') {
      item.setClipPath(new ZRender.Rect({ cursor: null, shape: { x: item.style.x, y: item.style.y, width: item.style.width, height: item.style.height } }))
    }
    if (item.initConfigData.animateEffect === 'opacity') item.style.opacity = 0
    switch (item.initConfigData.animateItemDirectionRunning) {
      case 'left': item.style.x = item.style.x - item.style.width; break
      case 'top': item.style.y = item.style.y - item.style.height; break
      case 'right': item.style.x = item.style.x + item.style.width; break
      case 'bottom': item.style.y = item.style.y + item.style.height; break
    }
  })

  ZRender.util.each(zRenderImageList, (image) => { zRenderAnimationImageGroup.value.add(image) })
  rootZRender.value.add(zRenderAnimationImageGroup.value)

  ZRender.util.each(zRenderImageList, (item) => {
    if (item.initConfigData.runTime + item.initConfigData.delayTime > maxRunTime) {
      maxRunTime = item.initConfigData.runTime + item.initConfigData.delayTime
    }
    item.animateTo({
      style: { opacity: 1, x: item.initConfigData.x, y: item.initConfigData.y }
    }, item.initConfigData.runTime, item.initConfigData.delayTime, item.initConfigData.canvasAnimateEasing)
  })
  return maxRunTime
}

function calcAnimationAndReturnMaxRunTimeByCss3() {
  resetGridB()
  let canvasList = getImageCanvasListForCss3(nextImageObject.value)
  let maxRunTime = 0
  let baseConfig = getBaseAnimationConfig()

  ZRender.util.each(css3SlideGridBList.value, (gridItem, index) => {
    let singleConfig = getItemSingleConfig(null, baseConfig, index)
    if (singleConfig.runTime + singleConfig.delayTime > maxRunTime) {
      maxRunTime = singleConfig.runTime + singleConfig.delayTime
    }
    let useOpacity = false
    if (singleConfig.animateEffect === 'opacity') {
      gridItem.style['opacity'] = 0
      useOpacity = true
    } else {
      gridItem.style['opacity'] = 1
    }
    let animationName = ''
    switch (singleConfig.animateItemDirectionRunning) {
      case 'left':
        gridItem.style['left'] = '-100%'
        animationName = useOpacity ? 'fromLeftToRightWithOpacityChange' : 'fromLeftToRight'
        break
      case 'top':
        gridItem.style['top'] = '-100%'
        animationName = useOpacity ? 'fromTopToBottomWithOpacityChange' : 'fromTopToBottom'
        break
      case 'right':
        gridItem.style['left'] = '100%'
        animationName = useOpacity ? 'fromRightToLeftWithOpacityChange' : 'fromRightToLeft'
        break
      case 'bottom':
        gridItem.style['top'] = '100%'
        animationName = useOpacity ? 'fromBottomToTopWithOpacityChange' : 'fromBottomToTop'
        break
    }
    gridItem.style['display'] = 'block'
    gridItem.style['background-image'] = 'url(' + canvasList[index] + ')'
    gridItem.style['background-repeat'] = 'no-repeat'
    gridItem.style['background-size'] = '100% 100%'
    gridItem.style['animation-iteration-count'] = '1'
    gridItem.style['animation-fill-mode'] = 'forwards'
    gridItem.style['animation-timing-function'] = singleConfig.css3AnimateEasing
    gridItem.style['animation-name'] = animationName
    gridItem.style['animation-duration'] = singleConfig.runTime + 'ms'
    gridItem.style['animation-delay'] = singleConfig.delayTime + 'ms'
  })
  return maxRunTime
}

function calcImageNewSizeToCoverScreen(imageObject) {
  let sourceWidth = imageObject.width
  let sourceHeight = imageObject.height
  let newWidth = 0, newHeight = 0, fromLeft = 0, fromTop = 0
  if (sourceWidth / sourceHeight <= excludeDividerElementWidth.value / excludeDividerElementHeight.value) {
    newWidth = excludeDividerElementWidth.value
    newHeight = Math.ceil(sourceHeight * excludeDividerElementWidth.value / sourceWidth)
    fromLeft = 0
    let canUseHeight = newWidth * excludeDividerElementHeight.value / excludeDividerElementWidth.value
    fromTop = Math.round((newHeight - canUseHeight) / 2)
  } else {
    newHeight = excludeDividerElementHeight.value
    newWidth = Math.ceil(sourceWidth * excludeDividerElementHeight.value / sourceHeight)
    fromTop = 0
    let canUseWidth = newHeight * excludeDividerElementWidth.value / excludeDividerElementHeight.value
    fromLeft = Math.round((newWidth - canUseWidth) / 2)
  }
  return { height: newHeight, width: newWidth, fromTop: fromTop, fromLeft: fromLeft }
}

function getImageObjectCanvas(imageObject, calcImageNewSize) {
  let zRenderImage = new ZRender.Image({
    cursor: null,
    style: { image: imageObject, x: 0, y: 0, width: calcImageNewSize.width, height: calcImageNewSize.height }
  })
  let zRender = ZRender.init(drawImageObjectCanvas.value, { width: calcImageNewSize.width, height: calcImageNewSize.height })
  zRender.add(zRenderImage)
  let canvasResult = zRender.painter.getRenderedCanvas()
  zRender.dispose()
  return canvasResult
}

function getImageCanvasListForCss3(imageObject) {
  let canvasList = []
  let newSize = calcImageNewSizeToCoverScreen(imageObject)
  let imageCanvas = getImageObjectCanvas(imageObject, newSize)

  for (let i = 0; i < gridItemCount.value; i++) {
    let imagePortionPositionX = newSize.fromLeft + (i % rowCount.value) * normalRowItemWidth.value
    let imagePortionPositionY = newSize.fromTop + Math.floor(i / rowCount.value) % columnCount.value * normalColumnItemHeight.value
    let imageWidth = (i % rowCount.value < rowCount.value - 1) ? normalRowItemWidth.value : lastRowItemWidth.value
    let imageHeight = (Math.floor(i / rowCount.value) < columnCount.value - 1) ? normalColumnItemHeight.value : lastColumnItemHeight.value
    let canvas = getImagePortion(imageCanvas, imagePortionPositionX, imagePortionPositionY, imageWidth, imageHeight)
    canvasList.push(canvas.toDataURL())
  }
  return canvasList
}

function getZRenderImageListForCanvas(imageObject) {
  let zRenderImageList = []
  let newSize = calcImageNewSizeToCoverScreen(imageObject)
  let imageCanvas = getImageObjectCanvas(imageObject, newSize)
  for (let i = 0; i < gridItemCount.value; i++) {
    let imagePositionX = (i % rowCount.value) * (normalRowItemWidth.value + props.gridDividerWidth)
    let imagePositionY = Math.floor(i / rowCount.value) % columnCount.value * (normalColumnItemHeight.value + props.gridDividerWidth)
    let imagePortionPositionX = newSize.fromLeft + (i % rowCount.value) * normalRowItemWidth.value
    let imagePortionPositionY = newSize.fromTop + Math.floor(i / rowCount.value) % columnCount.value * normalColumnItemHeight.value
    let imageWidth = (i % rowCount.value < rowCount.value - 1) ? normalRowItemWidth.value : lastRowItemWidth.value
    let imageHeight = (Math.floor(i / rowCount.value) < columnCount.value - 1) ? normalColumnItemHeight.value : lastColumnItemHeight.value
    let image = new ZRender.Image({
      cursor: null, progressive: i + 1,
      style: {
        image: getImagePortion(imageCanvas, imagePortionPositionX, imagePortionPositionY, imageWidth, imageHeight),
        x: imagePositionX, y: imagePositionY, width: imageWidth, height: imageHeight
      }
    })
    zRenderImageList.push(image)
  }
  return zRenderImageList
}

function getImagePortion(imageCanvas, imgLeft, imgTop, imageWidth, imageHeight) {
  let zCanvas = ZRender.util.createCanvas()
  let zCanvasContext = zCanvas.getContext('2d')
  zCanvas.width = imageWidth
  zCanvas.height = imageHeight
  zCanvasContext.drawImage(imageCanvas, imgLeft, imgTop, imageWidth, imageHeight, 0, 0, imageWidth, imageHeight)
  return zCanvas
}

function getImageUrl() {
  return useUnSplashService.value
    ? 'https://picsum.photos/' + fuckingDiv.value.offsetWidth + '/' + fuckingDiv.value.offsetHeight + '?random=' + new Date().getTime()
    : props.imageList[activeImageListIndex.value]
}

function setActiveImageListToNext() {
  if (useUnSplashService.value) { activeImageListIndex.value = 0; return }
  activeImageListIndex.value = activeImageListIndex.value === props.imageList.length - 1 ? 0 : activeImageListIndex.value + 1
}

function getCanvasRandomEasing() {
  let easingArray = ['Linear', 'QuadraticIn', 'QuadraticOut', 'QuadraticInOut', 'CubicIn', 'CubicOut', 'CubicInOut', 'QuarticIn', 'QuarticOut', 'QuarticInOut', 'QuinticIn', 'QuinticOut', 'QuinticInOut', 'SinusoidalIn', 'SinusoidalOut', 'SinusoidalInOut', 'ExponentialIn', 'ExponentialOut', 'ExponentialInOut', 'CircularIn', 'CircularOut', 'CircularInOut', 'ElasticIn', 'ElasticOut', 'ElasticInOut', 'BackIn', 'BackOut', 'BackInOut', 'BounceIn', 'BounceOut', 'BounceInOut']
  return easingArray[parseInt(Math.random() * easingArray.length, 10)]
}

function getCss3RandomEasing() {
  let easingArray = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']
  return easingArray[parseInt(Math.random() * easingArray.length, 10)]
}

function isIE() {
  return !!window.ActiveXObject || 'ActiveXObject' in window || (/Trident\/7\./).test(navigator.userAgent)
}
</script>

<style lang="scss">
.vue-fucking-gallery-container {
  width: 100%;
  height: 100%;
  margin: 0;

  .vue-fucking-gallery-div {
    width: 100%;
    height: 100%;
    margin: 0;

    canvas {
      margin: 0;
    }

    ul {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
      overflow: hidden;

      .slider-parent {
        position: relative;

        .slider-grid {
          width: 10%;
          height: 100px;
          float: left;
          overflow: hidden;
          position: absolute;
          box-sizing: border-box;

          .slider-grid-a,
          .slider-grid-b {
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            position: absolute;
          }

          .slider-grid-b {
            z-index: 1;
            display: none;
          }

          @keyframes fromLeftToRightWithOpacityChange {
            0% {
              left: -100%;
              opacity: 0;
              display: block;
            }

            100% {
              left: 0;
              opacity: 1;
            }
          }

          @keyframes fromRightToLeftWithOpacityChange {
            0% {
              left: 100%;
              opacity: 0;
              display: block;
            }

            100% {
              left: 0;
              opacity: 1;
            }
          }

          @keyframes fromTopToBottomWithOpacityChange {
            0% {
              top: -100%;
              opacity: 0;
              display: block;
            }

            100% {
              top: 0;
              opacity: 1;
            }
          }

          @keyframes fromBottomToTopWithOpacityChange {
            0% {
              top: 100%;
              opacity: 0;
              display: block;
            }

            100% {
              top: 0;
              opacity: 1;
            }
          }

          @keyframes fromLeftToRight {
            0% {
              left: -100%;
              display: block;
            }

            100% {
              left: 0;
            }
          }

          @keyframes fromRightToLeft {
            0% {
              left: 100%;
              display: block;
            }

            100% {
              left: 0;
            }
          }

          @keyframes fromTopToBottom {
            0% {
              top: -100%;
              display: block;
            }

            100% {
              top: 0;
            }
          }

          @keyframes fromBottomToTop {
            0% {
              top: 100%;
              display: block;
            }

            100% {
              top: 0;
            }
          }
        }
      }
    }
  }
}
</style>
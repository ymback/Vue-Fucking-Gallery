<!-- vue-fucking-gallery.vue -->
<template>
  <div ref="fuckingDiv" :id="elementId" class="vue-fucking-gallery-container">
    <div class="vue-fucking-gallery-div">
      <canvas ref="glCanvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { BitmapLoader, updateLoaderSizeCache } from './bitmap-loader.js';
import { LayoutEngine } from './layout-engine.js';
import { AnimationEngine, STRIDE_FLOATS } from './animation-engine.js';
import { WebGLRenderer } from './webgl-renderer.js';

const STATIC_FLOATS = 8;
const DYNAMIC_FLOATS = 6;

const props = defineProps({
  elementId: { type: String, default: 'vue-fucking-gallery' },
  gridMaxWidth: { type: Number, default: 200 },
  gridMaxHeight: { type: Number, default: 200 },
  gridDividerWidth: { type: Number, default: 1 },
  gridDividerColor: { type: String, default: '#000000' },
  slideWaitTime: { type: Number, default: 5000 },
  useAnimate: { type: Boolean, default: true },
  animateSpeed: { type: Number, default: 150 },
  animateSpeedDelay: { type: Number, default: 10 },
  animateItemDirection: { type: String, default: 'left' },
  animateRowDirection: { type: String, default: 'left' },
  animateColumnDirection: { type: String, default: 'top' },
  animateShowOrder: { type: String, default: 'singleItem' },
  animateEffect: { type: String, default: 'opacity' },
  canvasAnimateEasing: { type: String, default: 'SinusoidalInOut' },
  assumeOpaqueTextures: { type: Boolean, default: false },
  imageList: { type: Array, default: () => [] },
  useUnSplash: { type: Boolean, default: false },
  unSplashTag: { type: String, default: 'japan' },
  unSplashAccessKey: { type: String, default: '' },
  initLoadFinishCallback: Function,
  photoLoadSuccessCallback: Function,
  animateBeginCallback: Function,
  animateEndCallback: Function
});

const fuckingDiv = ref(null);
const glCanvasRef = ref(null);

let loader = null;
let layout = null;
let animEngine = null;
let renderer = null;

let activeImageListIndex = 0;
let slideWaitTimer = null;
let animationRunning = false;
let isTabHidden = false;

let isLoadingImage = false;
let nextImageStartLoadTime = 0;
let loadErrorTimes = 0;

let rAnimateFrameId = null;
let animationLoopStartTime = null;
let maxAnimDuration = 0;
let delayActiveCursor = 0;
let lastElapsedForCursor = -1;

let currentImageBitmap = null;
let nextImageBitmap = null;
let sharedStaticMode = false;
let oldStaticBuffer = new Float32Array(0);
let newStaticBuffer = new Float32Array(0);
let newDynamicBuffer = new Float32Array(0);
let delaySortedValues = new Float32Array(0);
let delayReorderScratch = new Float32Array(0);
let delaySortIndices = new Uint32Array(0);
let delayBucketCounts = new Uint32Array(0);
let delayBucketCursor = new Uint32Array(0);
let staticReorderScratch = new Float32Array(0);
let dynamicReorderScratch = new Float32Array(0);
let dirtyMinXByIndex = new Float32Array(0);
let dirtyMinYByIndex = new Float32Array(0);
let dirtyMaxXByIndex = new Float32Array(0);
let dirtyMaxYByIndex = new Float32Array(0);
let dirtyMinXScratch = new Float32Array(0);
let dirtyMinYScratch = new Float32Array(0);
let dirtyMaxXScratch = new Float32Array(0);
let dirtyMaxYScratch = new Float32Array(0);
let dirtyPrefixMinX = new Float32Array(0);
let dirtyPrefixMinY = new Float32Array(0);
let dirtyPrefixMaxX = new Float32Array(0);
let dirtyPrefixMaxY = new Float32Array(0);

const RAND_LUT_SIZE = 1024;
const randomLUT = new Float32Array(RAND_LUT_SIZE);
for (let i = 0; i < RAND_LUT_SIZE; i++) randomLUT[i] = Math.random();
let randPtr = 0;
function fastRandom() { return randomLUT[(randPtr++) & (RAND_LUT_SIZE - 1)]; }

const itemConfigTemp = {
  animateItemDirectionRunning: 'left',
  animateEffect: 'opacity',
  canvasAnimateEasing: 'Linear',
  runTime: 0,
  delayTime: 0
};

const DIRECTION_TO_CODE = { left: 0, top: 1, right: 2, bottom: 3 };
const NO_MOTION_DIRECTION_CODE = 255;
const animationPresetCache = new Map();
const directionPresetCache = new Map();
const delayPresetCache = new Map();
const MAX_PRESET_CACHE_SIZE = 32;

const easingRegistry = {
  Linear: (t) => t, QuadraticIn: (t) => t * t, QuadraticOut: (t) => t * (2 - t), QuadraticInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  CubicIn: (t) => t * t * t, CubicOut: (t) => (--t) * t * t + 1, CubicInOut: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  QuarticIn: (t) => t * t * t * t, QuarticOut: (t) => 1 - (--t) * t * t * t, QuarticInOut: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  QuinticIn: (t) => t * t * t * t * t, QuinticOut: (t) => 1 + (--t) * t * t * t * t, QuinticInOut: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  SinusoidalIn: (t) => 1 - Math.cos((t * Math.PI) / 2), SinusoidalOut: (t) => Math.sin((t * Math.PI) / 2), SinusoidalInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  ExponentialIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)), ExponentialOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  ExponentialInOut: (t) => { if (t === 0) return 0; if (t === 1) return 1; if ((t *= 2) < 1) return 0.5 * Math.pow(2, 10 * (t - 1)); return 0.5 * (-Math.pow(2, -10 * --t) + 2); },
  CircularIn: (t) => 1 - Math.sqrt(1 - t * t), CircularOut: (t) => Math.sqrt(1 - (--t) * t), CircularInOut: (t) => (t *= 2) < 1 ? -0.5 * (Math.sqrt(1 - t * t) - 1) : 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1),
  ElasticIn: (t) => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)), ElasticOut: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  ElasticInOut: (t) => { if (t === 0) return 0; if (t === 1) return 1; const c = (2 * Math.PI) / 4.5; return t < 0.5 ? -0.5 * (Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c)) : 0.5 * (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c)) + 1; },
  BackIn: (t) => 2.70158 * t * t * t - 1.70158 * t * t, BackOut: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2), BackInOut: (t) => { const c = 1.70158 * 1.525; return t < 0.5 ? 0.5 * (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) : 0.5 * (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2); },
  BounceIn: (t) => 1 - easingRegistry.BounceOut(1 - t), BounceOut: (t) => { if (t < 1 / 2.75) return 7.5625 * t * t; if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75; if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375; return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375; }, BounceInOut: (t) => t < 0.5 ? 0.5 * easingRegistry.BounceIn(t * 2) : 0.5 * easingRegistry.BounceOut(t * 2 - 1) + 0.5
};

const easingNameList = Object.keys(easingRegistry);

const handleVisibilityChange = () => {
  isTabHidden = document.visibilityState === 'hidden';
  if (isTabHidden && animationRunning) forceFinishAnimationImmediately();
};

onMounted(() => {
  loader = new BitmapLoader();
  layout = new LayoutEngine();
  animEngine = new AnimationEngine();
  animEngine.initEasingLUT(easingRegistry);

  renderer = new WebGLRenderer(glCanvasRef.value);
  renderer.setAssumeOpaqueTextures(props.assumeOpaqueTextures);
  renderer.setOpaqueBaseCoversViewport(props.gridDividerWidth <= 0);
  renderer.uploadLUT(animEngine.lutData, animEngine.LUT_RESOLUTION, animEngine.lutHeight);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  initImageSource();
  resizeElement();
  loadImage();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('resize', handleResize);
  if (loader) loader.destroy();
  if (rAnimateFrameId !== null) cancelAnimationFrame(rAnimateFrameId);
  if (currentImageBitmap) currentImageBitmap.close();
  if (nextImageBitmap) nextImageBitmap.close();
});

let windowResizeSetTimer = null;
const handleResize = () => {
  if (windowResizeSetTimer !== null) clearTimeout(windowResizeSetTimer);
  windowResizeSetTimer = setTimeout(() => {
    resizeElement();
    if (!animationRunning) {
      if (slideWaitTimer !== null) clearTimeout(slideWaitTimer);
      if (nextImageBitmap) { nextImageBitmap.close(); nextImageBitmap = null; }
      isLoadingImage = false;
      loadImage(true);
    }
    windowResizeSetTimer = null;
  }, 200);
};

let pendingLayoutUpdate = false;
const queueLayoutUpdate = () => {
  if (pendingLayoutUpdate) return;
  pendingLayoutUpdate = true;
  Promise.resolve().then(() => { resizeElement(); pendingLayoutUpdate = false; });
};

watch(() => props.showCanvas, (newVal) => { if (newVal) loadImage(); else { if (rAnimateFrameId) cancelAnimationFrame(rAnimateFrameId); } });
watch(() => props.gridMaxWidth, queueLayoutUpdate);
watch(() => props.gridMaxHeight, queueLayoutUpdate);
watch(() => props.gridDividerWidth, () => {
  queueLayoutUpdate();
  if (renderer) renderer.setOpaqueBaseCoversViewport(props.gridDividerWidth <= 0);
});
watch(() => props.gridDividerColor, () => { if (renderer) renderer.clearBackgroundColor(props.gridDividerColor); });
watch(() => props.assumeOpaqueTextures, (newVal) => { if (renderer) renderer.setAssumeOpaqueTextures(newVal); });
watch(() => props.imageList, () => initImageSource(), { deep: true });
watch(() => props.useUnSplash, () => initImageSource());
watch(() => props.unSplashTag, () => initImageSource());

function initImageSource() { activeImageListIndex = 0; }
function setActiveImageListToNext() {
  const useUnSplashService = props.useUnSplash === true || (!props.imageList || props.imageList.length < 1);
  if (useUnSplashService) { activeImageListIndex = 0; return; }
  activeImageListIndex = activeImageListIndex === props.imageList.length - 1 ? 0 : activeImageListIndex + 1;
}

function ensurePackedBuffers(count) {
  const staticLen = count * STATIC_FLOATS;
  const dynamicLen = count * DYNAMIC_FLOATS;
  if (oldStaticBuffer.length !== staticLen) oldStaticBuffer = new Float32Array(staticLen);
  if (newStaticBuffer.length !== staticLen) newStaticBuffer = new Float32Array(staticLen);
  if (newDynamicBuffer.length !== dynamicLen) newDynamicBuffer = new Float32Array(dynamicLen);
  if (delaySortedValues.length !== count) delaySortedValues = new Float32Array(count);
  if (delayReorderScratch.length !== count) delayReorderScratch = new Float32Array(count);
  if (delaySortIndices.length !== count) delaySortIndices = new Uint32Array(count);
  if (staticReorderScratch.length !== staticLen) staticReorderScratch = new Float32Array(staticLen);
  if (dynamicReorderScratch.length !== dynamicLen) dynamicReorderScratch = new Float32Array(dynamicLen);
  if (dirtyMinXByIndex.length !== count) dirtyMinXByIndex = new Float32Array(count);
  if (dirtyMinYByIndex.length !== count) dirtyMinYByIndex = new Float32Array(count);
  if (dirtyMaxXByIndex.length !== count) dirtyMaxXByIndex = new Float32Array(count);
  if (dirtyMaxYByIndex.length !== count) dirtyMaxYByIndex = new Float32Array(count);
  if (dirtyMinXScratch.length !== count) dirtyMinXScratch = new Float32Array(count);
  if (dirtyMinYScratch.length !== count) dirtyMinYScratch = new Float32Array(count);
  if (dirtyMaxXScratch.length !== count) dirtyMaxXScratch = new Float32Array(count);
  if (dirtyMaxYScratch.length !== count) dirtyMaxYScratch = new Float32Array(count);
  if (dirtyPrefixMinX.length !== count) dirtyPrefixMinX = new Float32Array(count);
  if (dirtyPrefixMinY.length !== count) dirtyPrefixMinY = new Float32Array(count);
  if (dirtyPrefixMaxX.length !== count) dirtyPrefixMaxX = new Float32Array(count);
  if (dirtyPrefixMaxY.length !== count) dirtyPrefixMaxY = new Float32Array(count);
}

function upperBoundSortedFloat32(arr, value, length) {
  let lo = 0;
  let hi = length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function ensureDelayBucketCapacity(maxDelay) {
  const need = maxDelay + 1;
  if (delayBucketCounts.length < need) {
    delayBucketCounts = new Uint32Array(need);
    delayBucketCursor = new Uint32Array(need);
  }
}

function reorderAnimationBuffersByDelay(count, maxDelay) {
  ensureDelayBucketCapacity(maxDelay);
  for (let d = 0; d <= maxDelay; d++) delayBucketCounts[d] = 0;

  for (let i = 0; i < count; i++) {
    let bucket = delaySortedValues[i] | 0;
    if (bucket < 0) bucket = 0;
    if (bucket > maxDelay) bucket = maxDelay;
    delayBucketCounts[bucket]++;
  }

  let cursor = 0;
  for (let d = 0; d <= maxDelay; d++) {
    delayBucketCursor[d] = cursor;
    cursor += delayBucketCounts[d];
  }

  for (let i = 0; i < count; i++) {
    let bucket = delaySortedValues[i] | 0;
    if (bucket < 0) bucket = 0;
    if (bucket > maxDelay) bucket = maxDelay;
    const writePos = delayBucketCursor[bucket]++;
    delaySortIndices[writePos] = i;
  }

  for (let i = 0; i < count; i++) {
    const srcIndex = delaySortIndices[i];
    const srcStaticOff = srcIndex * STATIC_FLOATS;
    const dstStaticOff = i * STATIC_FLOATS;
    staticReorderScratch.set(newStaticBuffer.subarray(srcStaticOff, srcStaticOff + STATIC_FLOATS), dstStaticOff);

    const srcDynamicOff = srcIndex * DYNAMIC_FLOATS;
    const dstDynamicOff = i * DYNAMIC_FLOATS;
    dynamicReorderScratch.set(newDynamicBuffer.subarray(srcDynamicOff, srcDynamicOff + DYNAMIC_FLOATS), dstDynamicOff);

    dirtyMinXScratch[i] = dirtyMinXByIndex[srcIndex];
    dirtyMinYScratch[i] = dirtyMinYByIndex[srcIndex];
    dirtyMaxXScratch[i] = dirtyMaxXByIndex[srcIndex];
    dirtyMaxYScratch[i] = dirtyMaxYByIndex[srcIndex];
  }

  newStaticBuffer.set(staticReorderScratch.subarray(0, count * STATIC_FLOATS));
  newDynamicBuffer.set(dynamicReorderScratch.subarray(0, count * DYNAMIC_FLOATS));
  dirtyMinXByIndex.set(dirtyMinXScratch.subarray(0, count));
  dirtyMinYByIndex.set(dirtyMinYScratch.subarray(0, count));
  dirtyMaxXByIndex.set(dirtyMaxXScratch.subarray(0, count));
  dirtyMaxYByIndex.set(dirtyMaxYScratch.subarray(0, count));

  for (let i = 0; i < count; i++) {
    delayReorderScratch[i] = delaySortedValues[delaySortIndices[i]];
  }
  delaySortedValues.set(delayReorderScratch.subarray(0, count));
}

function isDeterministicAnimationConfig(baseConfig) {
  return (
    baseConfig.animateItemDirection !== 'random' &&
    baseConfig.animateShowOrder !== 'random' &&
    baseConfig.canvasAnimateEasing !== 'eachRandom' &&
    baseConfig.animateEffectCanUseArray.length === 1
  );
}

function buildAnimationPresetKey(baseConfig, count) {
  const fixedEffect = baseConfig.animateEffectCanUseArray[0] || 'opacity';
  return [
    count,
    layout.rowCount,
    layout.columnCount,
    props.animateSpeed,
    props.animateSpeedDelay,
    baseConfig.animateItemDirection,
    baseConfig.animateShowOrder,
    baseConfig.animateRowDirection,
    baseConfig.animateColumnDirection,
    baseConfig.canvasAnimateEasing,
    fixedEffect
  ].join('|');
}

function resolveDirectionCode(itemDirection, index) {
  if (itemDirection === 'snake') {
    let indexInRow = index % layout.rowCount;
    let indexInColumn = Math.floor(index / layout.rowCount);
    if (indexInRow >= indexInColumn && indexInRow <= (layout.rowCount - (indexInColumn + 1)) && indexInColumn <= (Math.floor(layout.columnCount / 2) - (layout.columnCount % 2 === 0 ? 1 : 0))) {
      return DIRECTION_TO_CODE.left;
    }
    if (indexInRow >= (layout.columnCount - indexInColumn - 1) && indexInRow < (layout.rowCount - (layout.columnCount - indexInColumn)) && indexInColumn > (Math.floor(layout.columnCount / 2) - (layout.columnCount % 2 === 0 ? 1 : 0))) {
      return DIRECTION_TO_CODE.right;
    }
    if (indexInColumn > indexInRow && indexInColumn < (layout.columnCount - (indexInRow + 1)) && indexInRow <= Math.ceil(layout.rowCount / 2)) {
      return DIRECTION_TO_CODE.bottom;
    }
    return DIRECTION_TO_CODE.top;
  }
  return DIRECTION_TO_CODE[itemDirection] ?? NO_MOTION_DIRECTION_CODE;
}

function resolveDeterministicDelay(baseConfig, index, delayDivisor) {
  const itemDirection = baseConfig.animateItemDirection;
  if (itemDirection === 'snake') {
    let newIndex = layout.snakeSortMatrix[Math.floor(index / layout.rowCount)][index % layout.rowCount];
    return Math.ceil(props.animateSpeed * newIndex / delayDivisor);
  }

  if (baseConfig.animateShowOrder === 'multiLine') {
    switch (itemDirection) {
      case 'left': return Math.ceil(props.animateSpeed * (index % layout.rowCount) / delayDivisor);
      case 'right': return Math.ceil(props.animateSpeed * (layout.rowCount - index % layout.rowCount - 1) / delayDivisor);
      case 'top': return Math.floor(props.animateSpeed * Math.floor(index / layout.rowCount) / delayDivisor);
      case 'bottom': return Math.floor(props.animateSpeed * (layout.columnCount - Math.floor(index / layout.rowCount) - 1) / delayDivisor);
      default: return Math.ceil(props.animateSpeed * index / delayDivisor);
    }
  }

  if (baseConfig.animateShowOrder === 'singleItem') {
    if (baseConfig.animateRowDirection === 'right') {
      if (baseConfig.animateColumnDirection === 'bottom') {
        let currentLineDesc = layout.columnCount - Math.floor(index / layout.rowCount);
        let newIndexDesc = (layout.rowCount - index % layout.rowCount - 1) + layout.rowCount * currentLineDesc;
        return Math.ceil(props.animateSpeed * newIndexDesc / delayDivisor);
      }
      let currentLine = Math.floor(index / layout.rowCount);
      let newIndex = (layout.rowCount - index % layout.rowCount - 1) + layout.rowCount * currentLine;
      return Math.ceil(props.animateSpeed * newIndex / delayDivisor);
    }

    if (baseConfig.animateColumnDirection === 'bottom') {
      let currentLineDesc = layout.columnCount - Math.floor(index / layout.rowCount);
      let newIndexDesc = index % layout.rowCount + layout.rowCount * currentLineDesc;
      return Math.ceil(props.animateSpeed * newIndexDesc / delayDivisor);
    }
    return Math.ceil(props.animateSpeed * index / delayDivisor);
  }

  return Math.ceil(props.animateSpeed * index / delayDivisor);
}

function getAnimationPreset(baseConfig, count) {
  if (!isDeterministicAnimationConfig(baseConfig)) return null;

  const key = buildAnimationPresetKey(baseConfig, count);
  const cached = animationPresetCache.get(key);
  if (cached) return cached;

  const runTime = Math.floor(props.animateSpeed * props.animateSpeedDelay);
  const delayDivisor = props.animateSpeedDelay * 0.2;
  const directionCodes = new Uint8Array(count);
  const delayTimes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    directionCodes[i] = resolveDirectionCode(baseConfig.animateItemDirection, i);
    delayTimes[i] = resolveDeterministicDelay(baseConfig, i, delayDivisor);
  }

  const preset = {
    directionCodes,
    delayTimes,
    runTime,
    useOpacity: baseConfig.animateEffectCanUseArray[0] === 'opacity',
    easingId: animEngine.easingIdMap[baseConfig.canvasAnimateEasing] || 0
  };

  if (animationPresetCache.size >= MAX_PRESET_CACHE_SIZE) {
    animationPresetCache.clear();
  }
  animationPresetCache.set(key, preset);
  return preset;
}

function buildDirectionPresetKey(baseConfig, count) {
  return [
    count,
    layout.rowCount,
    layout.columnCount,
    baseConfig.animateItemDirection
  ].join('|');
}

function getDirectionPreset(baseConfig, count) {
  if (baseConfig.animateItemDirection === 'random') return null;

  const key = buildDirectionPresetKey(baseConfig, count);
  const cached = directionPresetCache.get(key);
  if (cached) return cached;

  const directionCodes = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    directionCodes[i] = resolveDirectionCode(baseConfig.animateItemDirection, i);
  }

  if (directionPresetCache.size >= MAX_PRESET_CACHE_SIZE) {
    directionPresetCache.clear();
  }
  directionPresetCache.set(key, directionCodes);
  return directionCodes;
}

function buildDelayPresetKey(baseConfig, count) {
  return [
    count,
    layout.rowCount,
    layout.columnCount,
    props.animateSpeed,
    props.animateSpeedDelay,
    baseConfig.animateItemDirection,
    baseConfig.animateShowOrder,
    baseConfig.animateRowDirection,
    baseConfig.animateColumnDirection
  ].join('|');
}

function getDelayPreset(baseConfig, count) {
  if (baseConfig.animateShowOrder === 'random' || baseConfig.animateItemDirection === 'random') {
    return null;
  }

  const key = buildDelayPresetKey(baseConfig, count);
  const cached = delayPresetCache.get(key);
  if (cached) return cached;

  const delayDivisor = props.animateSpeedDelay * 0.2;
  const delayTimes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    delayTimes[i] = resolveDeterministicDelay(baseConfig, i, delayDivisor);
  }

  if (delayPresetCache.size >= MAX_PRESET_CACHE_SIZE) {
    delayPresetCache.clear();
  }
  delayPresetCache.set(key, delayTimes);
  return delayTimes;
}

function resizeElement() {
  if (!fuckingDiv.value) return;
  const w = fuckingDiv.value.offsetWidth;
  const h = fuckingDiv.value.offsetHeight;
  updateLoaderSizeCache(w, h);
  layout.calculateGrid(w, h, props);

  renderer.resize(w, h, props.gridDividerColor);

  if (animationRunning) {
    // 动画中 resize 时直接停止并重绘
    forceFinishAnimationImmediately();
  } else if (currentImageBitmap) {
    animEngine.buildInstanceBuffer(layout, currentImageBitmap, props);
    renderStaticState();
  }
}

function renderStaticState() {
  const buf = animEngine.instanceData;
  const staticBuf = animEngine.staticData;
  const count = layout.gridItemCount;
  const staticLen = count * STATIC_FLOATS;
  ensurePackedBuffers(count);
  for (let i = 0; i < layout.gridItemCount; i++) {
    let off = i * STRIDE_FLOATS;
    buf[off + 8] = buf[off + 4];
    buf[off + 9] = buf[off + 5];
    buf[off + 10] = 1.0;
    buf[off + 11] = 0.0;
    buf[off + 12] = 0.0;
    buf[off + 13] = 0.0;
  }
  oldStaticBuffer.set(staticBuf.subarray(0, staticLen));
  renderer.uploadTextures(null, currentImageBitmap);
  renderer.flushInstanceData(buf, count);
  renderer.syncOldLayerStaticData(oldStaticBuffer, count);
  renderer.setOldPassBypassEligible(false);
  renderer.setDirtyRect(null);
  // 确保 canvas 在首次渲染前已经达到正确尺寸（Safari 兼容性修复）
  renderer.ensureCanvasReady();
  renderer.renderFrame(0);
}

function forceFinishAnimationImmediately() {
  if (rAnimateFrameId !== null) { cancelAnimationFrame(rAnimateFrameId); rAnimateFrameId = null; }
  animationRunning = false;
  if (nextImageBitmap) {
    const oldBitmap = currentImageBitmap;
    currentImageBitmap = nextImageBitmap;
    nextImageBitmap = null;
    if (oldBitmap) setTimeout(() => oldBitmap.close(), 32);

    animEngine.buildInstanceBuffer(layout, currentImageBitmap, props);
    renderStaticState();
  }
  if (props.animateEndCallback) {
    const perfStats = renderer ? renderer.getPerfStats(true) : null;
    props.animateEndCallback(perfStats);
  }
  triggerNextCycle();
}

function triggerNextCycle() {
  isLoadingImage = false;
  loadImage();
}

function loadImage(isResizeRetrigger) {
  if (isLoadingImage || isTabHidden) return;
  isLoadingImage = true;
  if (!isResizeRetrigger) nextImageStartLoadTime = Date.now();

  loader.load(
    props,
    activeImageListIndex,
    (bitmap) => {
      isLoadingImage = false;
      let firstTime = currentImageBitmap === null;

      if (firstTime) {
        if (props.initLoadFinishCallback) props.initLoadFinishCallback();
        currentImageBitmap = bitmap;
        animEngine.buildInstanceBuffer(layout, bitmap, props);
        renderStaticState();
        setActiveImageListToNext();
        loadImage();
      } else {
        if (nextImageBitmap) { nextImageBitmap.close(); }
        nextImageBitmap = bitmap;
        if (props.photoLoadSuccessCallback) props.photoLoadSuccessCallback();

        let timeDiff = Date.now() - nextImageStartLoadTime;
        if (slideWaitTimer !== null) clearTimeout(slideWaitTimer);
        slideWaitTimer = setTimeout(() => {
          setActiveImageListToNext();
          startAnimation();
        }, Math.max(0, props.slideWaitTime - timeDiff));
      }
    },
    (errMsg) => {
      console.warn("Loader Info:", errMsg);
      loadErrorTimes++;
      setActiveImageListToNext();
      triggerNextCycle();
    }
  );
}

function startAnimation() {
  if (isTabHidden || !nextImageBitmap || props.useAnimate !== true) {
    animationRunning = false;
    if (nextImageBitmap) {
      const oldBitmap = currentImageBitmap;
      currentImageBitmap = nextImageBitmap;
      nextImageBitmap = null;
      if (oldBitmap) setTimeout(() => oldBitmap.close(), 32);
      animEngine.buildInstanceBuffer(layout, currentImageBitmap, props);
      renderStaticState();
    }
    triggerNextCycle();
    return;
  }

  animationRunning = true;
  if (renderer) renderer.resetPerfStats();
  if (props.animateBeginCallback) props.animateBeginCallback();

  let baseConfig = getBaseAnimationConfig();

  animEngine.buildInstanceBuffer(layout, nextImageBitmap, props, false);

  // 核心：上传新旧贴图供 Shader 使用
  renderer.uploadTextures(currentImageBitmap, nextImageBitmap);
  sharedStaticMode =
    !!currentImageBitmap &&
    !!nextImageBitmap &&
    currentImageBitmap.width === nextImageBitmap.width &&
    currentImageBitmap.height === nextImageBitmap.height;
  renderer.setSplitStaticSharedMode(sharedStaticMode);
  renderer.setSinglePassMixEnabled(false);

  maxAnimDuration = 0;
  const staticBuf = animEngine.staticData;
  const count = layout.gridItemCount;
  const animationPreset = getAnimationPreset(baseConfig, count);
  const directionPreset = animationPreset ? null : getDirectionPreset(baseConfig, count);
  const delayPreset = animationPreset ? null : getDelayPreset(baseConfig, count);
  const runTimeFixed = animationPreset ? animationPreset.runTime : Math.floor(props.animateSpeed * props.animateSpeedDelay);
  const fixedUseOpacity = animationPreset ? animationPreset.useOpacity : (baseConfig.animateEffectCanUseArray.length === 1 ? baseConfig.animateEffectCanUseArray[0] === 'opacity' : null);
  const fixedEasingId = animationPreset ? animationPreset.easingId : (baseConfig.canvasAnimateEasing === 'eachRandom' ? -1 : (animEngine.easingIdMap[baseConfig.canvasAnimateEasing] || 0));
  let maxDelay = 0;
  let hasSpatialMotion = false;
  let hasOpacityAnimation = false;
  let isDelayNonDecreasing = true;
  let prevDelayForOrder = -Infinity;
  ensurePackedBuffers(count);
  newStaticBuffer.set(staticBuf.subarray(0, count * STATIC_FLOATS));

  for (let i = 0; i < layout.gridItemCount; i++) {
    let staticOff = i * STATIC_FLOATS;
    let dynamicWordOff = i * DYNAMIC_FLOATS;
    let useOp = false;
    let easingId = 0;
    let delayTime = 0;
    let runTime = 0;
    let directionCode = NO_MOTION_DIRECTION_CODE;

    if (animationPreset) {
      useOp = animationPreset.useOpacity;
      easingId = animationPreset.easingId;
      delayTime = animationPreset.delayTimes[i];
      runTime = animationPreset.runTime;
      directionCode = animationPreset.directionCodes[i];
    } else {
      if (baseConfig.animateItemDirection === 'random') {
        directionCode = (fastRandom() * 4) | 0;
      } else if (directionPreset) {
        directionCode = directionPreset[i];
      }

      if (fixedUseOpacity === null) {
        const effectName = baseConfig.animateEffectCanUseArray[(fastRandom() * baseConfig.animateEffectCanUseArray.length) | 0];
        useOp = effectName === 'opacity';
      } else {
        useOp = fixedUseOpacity;
      }

      if (fixedEasingId >= 0) {
        easingId = fixedEasingId;
      } else {
        const easingName = easingNameList[(fastRandom() * easingNameList.length) | 0];
        easingId = animEngine.easingIdMap[easingName] || 0;
      }

      if (delayPreset) {
        delayTime = delayPreset[i];
      } else {
        delayTime = Math.ceil(props.animateSpeed * (fastRandom() * props.animateSpeedDelay));
      }

      runTime = runTimeFixed;
    }

    let targetX = staticBuf[staticOff + 4];
    let targetY = staticBuf[staticOff + 5];
    let targetW = staticBuf[staticOff + 6];
    let targetH = staticBuf[staticOff + 7];

    let startX = targetX;
    let startY = targetY;

    switch (directionCode) {
      case 0: startX = targetX - targetW; break;
      case 1: startY = targetY - targetH; break;
      case 2: startX = targetX + targetW; break;
      case 3: startY = targetY + targetH; break;
    }

    if (startX !== targetX || startY !== targetY) {
      hasSpatialMotion = true;
    }
    if (useOp) {
      hasOpacityAnimation = true;
    }

    dirtyMinXByIndex[i] = Math.min(startX, targetX);
    dirtyMinYByIndex[i] = Math.min(startY, targetY);
    dirtyMaxXByIndex[i] = Math.max(startX + targetW, targetX + targetW);
    dirtyMaxYByIndex[i] = Math.max(startY + targetH, targetY + targetH);

    newDynamicBuffer[dynamicWordOff + 0] = startX;
    newDynamicBuffer[dynamicWordOff + 1] = startY;
    newDynamicBuffer[dynamicWordOff + 2] = useOp ? 0 : 1;
    newDynamicBuffer[dynamicWordOff + 3] = delayTime;
    newDynamicBuffer[dynamicWordOff + 4] = runTime;
    newDynamicBuffer[dynamicWordOff + 5] = easingId > 255 ? 255 : (easingId < 0 ? 0 : easingId);
    delaySortedValues[i] = delayTime;
    if (delayTime < prevDelayForOrder) isDelayNonDecreasing = false;
    prevDelayForOrder = delayTime;
    if (delayTime > maxDelay) maxDelay = delayTime;

    maxAnimDuration = Math.max(maxAnimDuration, delayTime + runTime);
  }

  if (count > 1 && maxDelay > 0 && !isDelayNonDecreasing) {
    reorderAnimationBuffersByDelay(count, maxDelay);
  }

  if (count > 0) {
    let minX = dirtyMinXByIndex[0];
    let minY = dirtyMinYByIndex[0];
    let maxX = dirtyMaxXByIndex[0];
    let maxY = dirtyMaxYByIndex[0];
    dirtyPrefixMinX[0] = minX;
    dirtyPrefixMinY[0] = minY;
    dirtyPrefixMaxX[0] = maxX;
    dirtyPrefixMaxY[0] = maxY;
    for (let i = 1; i < count; i++) {
      const iMinX = dirtyMinXByIndex[i];
      const iMinY = dirtyMinYByIndex[i];
      const iMaxX = dirtyMaxXByIndex[i];
      const iMaxY = dirtyMaxYByIndex[i];
      if (iMinX < minX) minX = iMinX;
      if (iMinY < minY) minY = iMinY;
      if (iMaxX > maxX) maxX = iMaxX;
      if (iMaxY > maxY) maxY = iMaxY;
      dirtyPrefixMinX[i] = minX;
      dirtyPrefixMinY[i] = minY;
      dirtyPrefixMaxX[i] = maxX;
      dirtyPrefixMaxY[i] = maxY;
    }
  }

  renderer.syncAnimatedLayerStaticData(newStaticBuffer, count);
  renderer.flushAnimatedDynamicData(newDynamicBuffer, count);
  delayActiveCursor = upperBoundSortedFloat32(delaySortedValues, 0, count);
  lastElapsedForCursor = 0;
  renderer.setAnimatedInstanceCount(delayActiveCursor);
  renderer.setSinglePassMixEnabled(sharedStaticMode && !hasSpatialMotion);
  renderer.setOldPassBypassEligible(!hasSpatialMotion && !hasOpacityAnimation);

  if (delayActiveCursor > 0) {
    const idx = delayActiveCursor - 1;
    const margin = 1;
    renderer.setDirtyRectValues(
      dirtyPrefixMinX[idx] - margin,
      dirtyPrefixMinY[idx] - margin,
      (dirtyPrefixMaxX[idx] - dirtyPrefixMinX[idx]) + margin * 2,
      (dirtyPrefixMaxY[idx] - dirtyPrefixMinY[idx]) + margin * 2
    );
  } else {
    renderer.setDirtyRect(null);
  }

  animationLoopStartTime = null;
  rAnimateFrameId = requestAnimationFrame(nativeRenderLoop);
}

function nativeRenderLoop(timestamp) {
  if (isTabHidden) return;
  if (!animationLoopStartTime) animationLoopStartTime = timestamp;
  let elapsed = timestamp - animationLoopStartTime;
  if (elapsed > maxAnimDuration) elapsed = maxAnimDuration;

  const totalCount = layout.gridItemCount;
  if (elapsed < lastElapsedForCursor) {
    delayActiveCursor = upperBoundSortedFloat32(delaySortedValues, elapsed, totalCount);
  } else {
    while (delayActiveCursor < totalCount && delaySortedValues[delayActiveCursor] <= elapsed) {
      delayActiveCursor++;
    }
  }
  lastElapsedForCursor = elapsed;
  renderer.setAnimatedInstanceCount(delayActiveCursor);

  if (delayActiveCursor > 0) {
    const idx = delayActiveCursor - 1;
    const margin = 1;
    renderer.setDirtyRectValues(
      dirtyPrefixMinX[idx] - margin,
      dirtyPrefixMinY[idx] - margin,
      (dirtyPrefixMaxX[idx] - dirtyPrefixMinX[idx]) + margin * 2,
      (dirtyPrefixMaxY[idx] - dirtyPrefixMinY[idx]) + margin * 2
    );
  } else {
    renderer.setDirtyRect(null);
  }

  renderer.renderFrame(elapsed);

  if (elapsed < maxAnimDuration) {
    rAnimateFrameId = requestAnimationFrame(nativeRenderLoop);
  } else {
    rAnimateFrameId = null;
    animationRunning = false;
    const oldBitmap = currentImageBitmap;
    currentImageBitmap = nextImageBitmap;
    nextImageBitmap = null;
    if (oldBitmap) setTimeout(() => oldBitmap.close(), 32);

    const swappedStaticBuffer = oldStaticBuffer;
    oldStaticBuffer = newStaticBuffer;
    newStaticBuffer = swappedStaticBuffer;
    if (!sharedStaticMode) {
      renderer.syncOldLayerStaticData(oldStaticBuffer, layout.gridItemCount);
    }
    renderer.setDirtyRect(null);

    if (props.animateEndCallback) {
      const perfStats = renderer ? renderer.getPerfStats(true) : null;
      props.animateEndCallback(perfStats);
    }
    triggerNextCycle();
  }
}

function getBaseAnimationConfig() {
  let resultConfig = { animateItemDirection: props.animateItemDirection, animateShowOrder: props.animateShowOrder };
  if (resultConfig.animateItemDirection === 'random') resultConfig.animateShowOrder = 'random';
  if (resultConfig.animateItemDirection === 'snake') resultConfig.animateShowOrder = 'singleItem';

  let canvasAnimateEasingTemp = props.canvasAnimateEasing;
  if (canvasAnimateEasingTemp === 'sameRandom') {
    canvasAnimateEasingTemp = easingNameList[(fastRandom() * easingNameList.length) | 0];
  }
  resultConfig.canvasAnimateEasing = canvasAnimateEasingTemp;

  let animateRowDirectionTemp = props.animateRowDirection;
  if (animateRowDirectionTemp === 'random') animateRowDirectionTemp = ['left', 'right'][(fastRandom() * 2) | 0];
  resultConfig.animateRowDirection = animateRowDirectionTemp;

  let animateColumnDirectionTemp = props.animateColumnDirection;
  if (animateColumnDirectionTemp === 'random') animateColumnDirectionTemp = ['top', 'bottom'][(fastRandom() * 2) | 0];
  resultConfig.animateColumnDirection = animateColumnDirectionTemp

  let animateEffectCanUseArray = [];
  if (resultConfig.animateItemDirection === 'none') animateEffectCanUseArray = ['opacity'];
  else {
    switch (props.animateEffect) {
      case 'none': animateEffectCanUseArray = ['none']; break;
      case 'sameRandom': animateEffectCanUseArray = [['opacity', 'none'][(fastRandom() * 2) | 0]]; break;
      case 'eachRandom': animateEffectCanUseArray = ['opacity', 'none']; break;
      default: animateEffectCanUseArray = [props.animateEffect]; break;
    }
  }
  resultConfig.animateEffectCanUseArray = animateEffectCanUseArray;
  return resultConfig;
}

function getItemSingleConfig(item, baseConfig, index) {
  return fillItemSingleConfig(baseConfig, index, {
    animateItemDirectionRunning: 'left',
    animateEffect: 'opacity',
    canvasAnimateEasing: 'Linear',
    runTime: 0,
    delayTime: 0
  });
}

function fillItemSingleConfig(baseConfig, index, outConfig) {
  const itemDirection = baseConfig.animateItemDirection;
  const rowDirection = baseConfig.animateRowDirection;
  const columnDirection = baseConfig.animateColumnDirection;
  let animateItemDirectionRunning = itemDirection;

  if (itemDirection === 'random') {
    animateItemDirectionRunning = ['left', 'top', 'right', 'bottom'][(fastRandom() * 4) | 0];
  } else if (itemDirection === 'snake') {
    let indexInRow = index % layout.rowCount;
    let indexInColumn = Math.floor(index / layout.rowCount);
    if (indexInRow >= indexInColumn && indexInRow <= (layout.rowCount - (indexInColumn + 1)) && indexInColumn <= (Math.floor(layout.columnCount / 2) - (layout.columnCount % 2 === 0 ? 1 : 0))) {
      animateItemDirectionRunning = 'left';
    } else if (indexInRow >= (layout.columnCount - indexInColumn - 1) && indexInRow < (layout.rowCount - (layout.columnCount - indexInColumn)) && indexInColumn > (Math.floor(layout.columnCount / 2) - (layout.columnCount % 2 === 0 ? 1 : 0))) {
      animateItemDirectionRunning = 'right';
    } else if (indexInColumn > indexInRow && indexInColumn < (layout.columnCount - (indexInRow + 1)) && indexInRow <= Math.ceil(layout.rowCount / 2)) {
      animateItemDirectionRunning = 'bottom';
    } else {
      animateItemDirectionRunning = 'top';
    }
  }

  outConfig.animateItemDirectionRunning = animateItemDirectionRunning;
  outConfig.animateEffect = baseConfig.animateEffectCanUseArray[(fastRandom() * baseConfig.animateEffectCanUseArray.length) | 0];

  if (baseConfig.canvasAnimateEasing === 'eachRandom') {
    outConfig.canvasAnimateEasing = easingNameList[(fastRandom() * easingNameList.length) | 0];
  } else {
    outConfig.canvasAnimateEasing = baseConfig.canvasAnimateEasing;
  }

  outConfig.runTime = Math.floor(props.animateSpeed * props.animateSpeedDelay);

  if (itemDirection === 'snake') {
    let newIndex = layout.snakeSortMatrix[Math.floor(index / layout.rowCount)][index % layout.rowCount];
    outConfig.delayTime = Math.ceil(props.animateSpeed * newIndex / (props.animateSpeedDelay * 0.2));
  } else if (baseConfig.animateShowOrder === 'random') {
    outConfig.delayTime = Math.ceil(props.animateSpeed * (fastRandom() * props.animateSpeedDelay));
  } else if (baseConfig.animateShowOrder === 'multiLine') {
    switch (itemDirection) {
      case 'left': outConfig.delayTime = Math.ceil(props.animateSpeed * (index % layout.rowCount) / (props.animateSpeedDelay * 0.2)); break;
      case 'right': outConfig.delayTime = Math.ceil(props.animateSpeed * (layout.rowCount - index % layout.rowCount - 1) / (props.animateSpeedDelay * 0.2)); break;
      case 'top': outConfig.delayTime = Math.floor(props.animateSpeed * Math.floor(index / layout.rowCount) / (props.animateSpeedDelay * 0.2)); break;
      case 'bottom': outConfig.delayTime = Math.floor(props.animateSpeed * (layout.columnCount - Math.floor(index / layout.rowCount) - 1) / (props.animateSpeedDelay * 0.2)); break;
    }
  } else if (baseConfig.animateShowOrder === 'singleItem') {
    if (rowDirection === 'right') {
      switch (columnDirection) {
        case 'bottom': {
          let currentLineDesc = layout.columnCount - Math.floor(index / layout.rowCount);
          let newIndexDesc = (layout.rowCount - index % layout.rowCount - 1) + layout.rowCount * currentLineDesc;
          outConfig.delayTime = Math.ceil(props.animateSpeed * newIndexDesc / (props.animateSpeedDelay * 0.2)); break;
        }
        default: {
          let currentLine = Math.floor(index / layout.rowCount);
          let newIndex = (layout.rowCount - index % layout.rowCount - 1) + layout.rowCount * currentLine;
          outConfig.delayTime = Math.ceil(props.animateSpeed * newIndex / (props.animateSpeedDelay * 0.2)); break;
        }
      }
    } else {
      switch (columnDirection) {
        case 'bottom': {
          let currentLineDesc = layout.columnCount - Math.floor(index / layout.rowCount);
          let newIndexDesc = index % layout.rowCount + layout.rowCount * currentLineDesc;
          outConfig.delayTime = Math.ceil(props.animateSpeed * newIndexDesc / (props.animateSpeedDelay * 0.2)); break;
        }
        default:
          outConfig.delayTime = Math.ceil(props.animateSpeed * index / (props.animateSpeedDelay * 0.2)); break;
      }
    }
  } else {
    outConfig.delayTime = Math.ceil(props.animateSpeed * (fastRandom() * props.animateSpeedDelay));
  }
  return outConfig;
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
      display: block;
    }
  }
}
</style>
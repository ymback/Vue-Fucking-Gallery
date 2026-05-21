[![GitHub stars](https://img.shields.io/github/stars/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery/issues)
[![GitHub forks](https://img.shields.io/github/forks/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery/network)
[![GitHub last commit](https://img.shields.io/github/last-commit/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery)  
[![npm](https://img.shields.io/npm/v/vue-fucking-gallery.svg)](https://www.npmjs.com/package/vue-fucking-gallery)
[![npm](https://img.shields.io/npm/l/vue-fucking-gallery.svg)](https://www.npmjs.com/package/vue-fucking-gallery)

# Vue Fucking Gallery (v3.x)

A gallery component based on Vue 3, rendering with WebGL 2.0  
中文文档, 看[这里](README.md)

> ⚠️ **Notice:** v3.x version has fully embraced the **Vue 3 + Vite** modern frontend architecture with WebGL 2.0 rendering. If your project is still using Vue 2, please install and use the v1.x version.

## Intro

* This is a component you'll always say 'fuck', you'll say 'fuck' when configuring, and say 'fuck' when refreshing the browser
* Zero-configuration setup - just use it directly
* High-performance WebGL 2.0-based rendering with optimization for Android devices
* Support configurable animation duration and wait time
* Support animation direction control for grid items (row-by-row, column-by-column, or snake mode)
* Extensive easing function library (30+ timing functions)
* Most configurations support randomization
* Support custom image arrays or auto-fetch from [Unsplash](https://unsplash.com/)
* Unsplash tag filtering for thematic image collections
* Preload-first strategy: once the first frame is rendered, the next image starts loading in background for seamless post-animation swaps
* Configurable opacity effects and item animations
* Customizable grid divider width and color
* Unique 'Snake' mode for creative transitions
* Integrated Unsplash official API with dynamic container ratio calculation and `devicePixelRatio`-aware Retina image fetching
* Enterprise-grade fallback mechanism: Auto-degrades to `LoremFlickr` placeholder service when API key is missing or quota exceeded - guaranteed no blank pages

## Example

[Example Site](http://gallery.sayyoulove.me/#/)  
  
[![](example/1.jpg)](example/1.jpg "Example 1")
[![](example/2.jpg)](example/2.jpg "Example 2")
[![](example/3.jpg)](example/3.jpg "Example 3")
[![](example/4.jpg)](example/4.jpg "Example 4")

## Browser Support

All modern browsers with WebGL 2.0 support.

**Performance Features:**
- WebGL 2.0 + dual-buffer rendering pipeline optimized for Android devices
- Dynamic attributes use FLOAT32 data type to avoid Mali/Adreno driver slow paths
- Static Base Cache (FBO) mechanism reduces redundant draws during animation
- Automatic single-pass blend rendering and dirty rectangle optimization
- Safari WebGL 2.0 context initialization compatibility fix for correct first-frame rendering

## Install

### NPM

``` bash
$ npm install vue-fucking-gallery
```

## Import (Vue 3 Style)

``` javascript
import { createApp } from 'vue'
import App from './App.vue'
import VueFuckingGallery from 'vue-fucking-gallery'

const app = createApp(App)
app.use(VueFuckingGallery)
app.mount('#app')
```

## Use

### Basic

```vue
<template>
    <vue-fucking-gallery class="gallery"></vue-fucking-gallery>
</template>

<style>
/* Component must set width and height */
.gallery {
  width: 100%;
  height: 100%;
  margin: 0;
}
</style>
```

### Advance

```vue
<template>
    <vue-fucking-gallery 
        :element-id="id" 
        :grid-max-width="gridMaxWidth"
        :grid-max-height="gridMaxHeight"
        :grid-divider-width="gridDividerWidth"
        :grid-divider-color="gridDividerColor"
        :slide-wait-time="slideWaitTime"
        :use-animate="useAnimate"
        :animate-speed="animateSpeed"
        :animate-speed-delay="animateSpeedDelay"
        :animate-item-direction="animateItemDirection"
        :animate-row-direction="animateRowDirection"
        :animate-column-direction="animateColumnDirection"
        :animate-show-order="animateShowOrder"
        :animate-effect="animateEffect"
        :canvas-animate-easing="canvasAnimateEasing"
        :image-list="imageList"
        :use-un-splash="useUnSplash"
        :un-splash-tag="unSplashTag"
        :un-splash-access-key="unSplashAccessKey"
        :assume-opaque-textures="assumeOpaqueTextures"
        :init-load-finish-callback="initLoadFinishCallback"
        :photo-load-success-callback="photoLoadSuccessCallback"
        :animate-begin-callback="animateBeginCallback"
        :animate-end-callback="animateEndCallback"
        class="gallery"></vue-fucking-gallery>
</template>

<style>
/* Component must set width and height */
.gallery {
  width: 100%;
  height: 100%;
  margin: 0;
}
</style>
```

## Configuration (Props)

All configurations are reactive. Unless layout reset is required, animation will not stop and will smoothly transition to the next image.

### Base Configuration

| Name | Type | Default | Description |
| ---- | ---- | ---- | ----------- |
| elementId | String | `'vue-fucking-gallery'` | Component element ID |
| gridMaxWidth | Integer | `200` | Maximum width of grid items; for performance, should not be less than `48` |
| gridMaxHeight | Integer | `200` | Maximum height of grid items; for performance, should not be less than `48`  |
| gridDividerWidth | Integer | `1` | Grid divider line width, can be set to `0` to hide |
| gridDividerColor | String | `'#fff'` | Grid divider color, accepts 3-digit or 6-digit hex values like `'#fff'` or `'#ffffff'` |
| useAnimate | Boolean | `true` | Enable animation; if `false`, next image displays after wait time |
| slideWaitTime | Integer | `5000` | Wait time between animation completion and next animation start (milliseconds); values below `1000` are clamped to `1000` |
| animateSpeed | Integer | `150` | Animation speed; combined with `animateSpeedDelay` to determine animation duration (milliseconds); values below `100` are clamped to `100` |
| animateSpeedDelay | Integer | `10` | Animation speed multiplier; combined with `animateSpeed` to calculate duration; values below `5` are clamped to `5` |
| animateItemDirection | String | `'left'` | Direction of grid item animation<br/>`'left'`: left to right<br/>`'top'`: top to bottom<br/>`'right'`: right to left<br/>`'bottom'`: bottom to top<br/>`'random'`: fully random (forces `animateShowOrder` to `'random'`)<br/>`'none'`: no movement, opacity only (forces `animateEffect` to `'opacity'`)<br/>`'snake'`: snake pattern from top-left counter-clockwise (forces `animateShowOrder` to `'singleItem'`) |
| animateRowDirection | String | `'left'` | Row animation direction<br/>`'left'`: items show left to right within each row<br/>`'right'`: items show right to left within each row<br/>`'random'`: randomly choose `'left'` or `'right'` per row |
| animateColumnDirection | String | `'top'` | Column animation direction<br/>`'top'`: items show top to bottom within each column<br/>`'bottom'`: items show bottom to top within each column<br/>`'random'`: randomly choose `'top'` or `'bottom'` per column |
| animateShowOrder | String | `'singleItem'` | Timing stagger between item animations (interval determined by `animateSpeed` + `animateSpeedDelay`)<br/>`'singleItem'`: each item animates after the previous one completes<br/>`'multiLine'`: all items in same row/column animate simultaneously, following `animateItemDirection`<br/>`'random'`: random animation start time per item |
| animateEffect | String | `'opacity'` | Grid item animation effect<br/>`'opacity'`: fade from transparent to opaque<br/>`'none'`: no effect, always opaque<br/>`'sameRandom'`: all items randomly use `'opacity'` or `'none'` (same choice)<br/>`'eachRandom'`: each item independently randomizes its effect |
| imageList | Array | `[]` | Image URL array; if empty, Unsplash service is used |
| useUnSplash | Boolean | `false` | Enable Unsplash service; even if `false`, empty `imageList` forces this to `true` |
| unSplashTag | String | `'japan'` | Unsplash image tag filter; different tags return thematically matched random images |
| unSplashAccessKey | String | `''` | **(v2.0+)** Your Unsplash API Access Key from [Unsplash Developers](https://unsplash.com/developers). If missing or quota exceeded, auto-degrades to free placeholder service. |
| assumeOpaqueTextures | Boolean | `false` | **(v3.0+)** Assume all textures are fully opaque; enables blending state optimization for better performance (only use when confirmed textures have no transparent regions) |
| initLoadFinishCallback | Function | `null` | Callback triggered after first image loads and displays |
| photoLoadSuccessCallback | Function | `null` | Callback triggered after each image loads (including initial image) |
| animateBeginCallback | Function | `null` | Callback triggered when animation starts |
| animateEndCallback | Function | `null` | Callback triggered when animation completes, receives `stats` performance object with: `frames` (total frames), `bufferUploads` (buffer upload count), `textureUploads` (texture upload count), `sharedStaticHits` (static cache hits), `singlePassHits` (single-pass blend hits), `animatedInstancesPeak` (peak animated items), etc. |
| canvasAnimateEasing | String | `'SinusoidalInOut'` | WebGL animation easing curve. Options include: `'Linear'` `'QuadraticIn'` `'QuadraticOut'` `'QuadraticInOut'` `'CubicIn'` `'CubicOut'` `'CubicInOut'` `'QuarticIn'` `'QuarticOut'` `'QuarticInOut'` `'QuinticIn'` `'QuinticOut'` `'QuinticInOut'` `'SinusoidalIn'` `'SinusoidalOut'` `'SinusoidalInOut'` `'ExponentialIn'` `'ExponentialOut'` `'ExponentialInOut'` `'CircularIn'` `'CircularOut'` `'CircularInOut'` `'ElasticIn'` `'ElasticOut'` `'ElasticInOut'` `'BackIn'` `'BackOut'` `'BackInOut'` `'BounceIn'` `'BounceOut'` `'BounceInOut'`. Two randomization options:<br/>`'sameRandom'`: all items use the same randomly selected curve<br/>`'eachRandom'`: each item independently randomizes its curve |

## Performance Optimization Features (v3.0+)

This version includes extensive performance optimizations, particularly targeting low-end devices and Android platforms:

| Feature | Description | Enabled By |
| ---- | ---- | ----------- |
| **FLOAT32 Data Layout** | 24-byte-aligned FLOAT32 attribute format avoiding Mali/Adreno GPU HALF_FLOAT slow paths | Default |
| **Static Base Cache** | Framebuffer Object (FBO) caches the static render layer, eliminating redundant draws during animation | Auto-detected |
| **Single-Pass Blending** | When new and old textures are same size with no spatial animation, both blend in single pass | Auto-detected |
| **Old Pass Bypass** | When all animation items are fully transparent with no spatial movement, skips old layer rendering | Auto-detected |
| **Dirty Rectangle** | Only renders animation-affected regions, reducing pixel fill workload | Auto-enabled |
| **Opaque Assumption** | Setting `assumeOpaqueTextures: true` disables blending state management for further performance gain | Manual enable |
| **Safari Context Fix** | Automatically handles WebGL 2.0 context initialization timing on Safari for correct first-frame rendering | Default |


## Important Notes

* Configuration changes apply reactively and immediately. Some configs force animation termination, trigger next image draw, and invoke `animateEndCallback`.
* If `imageList` is provided but all images fail to load, the component stops loading until you update configuration.
* Duplicate consecutive images are automatically skipped; the component continues to the next unique image.
* On browser window `resize` events, the system automatically discards mismatched proportions images and fetches a new perfectly-fit image based on the updated window dimensions for seamless replacement.
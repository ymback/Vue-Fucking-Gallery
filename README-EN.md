[![GitHub stars](https://img.shields.io/github/stars/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery/issues)
[![GitHub forks](https://img.shields.io/github/forks/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery/network)
[![GitHub last commit](https://img.shields.io/github/last-commit/ymback/vue-fucking-gallery.svg?style=flat-square)](https://github.com/ymback/vue-fucking-gallery)  
[![npm](https://img.shields.io/npm/v/vue-fucking-gallery.svg)](https://www.npmjs.com/package/vue-fucking-gallery)
[![npm](https://img.shields.io/npm/l/vue-fucking-gallery.svg?maxAge=2592000)](https://www.npmjs.com/package/vue-fucking-gallery)

# Vue Fucking Gallery

A gallery component based on Vue, draw canvas with [ZRender](https://github.com/ecomfe/zrender)  
中文文档, 看[这里](README.md)

## Intro

* This is a component you'll always say 'fuck', you'll say 'fuck' when config, and say 'fuck' when refresh your browser
* You can config nothing, just use and run
* Support drawing animation with css3 or canvas, all by your config
* Support setting animation run time and delay time
* Support setting the running direction of every grid item when animate, support one by one or multi row/column run
* Support all animation-timing-function when using css3, all easing functions of ZRender when using canvas
* Some configurations support random mode
* Support setting image address list, or use [Unsplash](https://unsplash.com/) random image
* Support setting tag of [Unsplash](https://unsplash.com/) random image
* Load next image when animation finished
* Support opacity setting
* Support setting divider width and color
* Special 'Snake' mode

## Example

[![](example/1.jpg)](example/1.jpg "Example 1")
[![](example/2.jpg)](example/2.jpg "Example 2")
[![](example/3.jpg)](example/3.jpg "Example 3")
[![](example/4.jpg)](example/4.jpg "Example 4")

## Browser support

All modern browser,Internet Explorer 11,not tested on other browser

## Install

### NPM

``` bash
$ npm install vue-fucking-gallery
```

## Import

``` javascript
import Vue from 'vue'
import FuckingGallery from 'vue-fucking-gallery'

Vue.use(FuckingGallery)
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
        :show-canvas="showCanvas"
        :animation-solution="animationSolution"
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
        :css3-animate-easing="css3AnimateEasing"
        :image-list="imageList"
        :use-un-splash="useUnSplash"
        :un-splash-tag="unSplashTag"
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

## Configuration(Props)

All configurations are responsive, and unless it's necessary to resize, animation will not stop and draw next image

### Base

| Name | Type | Default | Intro |
| ---- | ---- | ---- | ----------- |
| elementId | String | `'vue-fucking-gallery'` | Component element id |
| animationSolution | String | `'byCanvas'` | The way to draw, use option below<br/>`'byCss3'`: use css3 to draw<br/>`'byCanvas'`: use canvas to draw |
| showCanvas | Boolean | `true` | Show or not |
| gridMaxWidth | Integer | `200` | The max width of item in page grid, as for performance, this value should not be less than `48` |
| gridMaxHeight | Integer | `200` | The max height of item in page grid, as for performance, this value should not be less than `48`  |
| gridDividerWidth | Integer | `1` | Grid divider width, can be set to `0` |
| gridDividerColor | String | `'#fff'` | Grid divider color, like `'#fff'` or `'#ffffff'` |
| useAnimate | Boolean | `true` | Using animation or not, if set `false`, next image will show after delay time |
| slideWaitTime | Integer | `5000` | Wait time between last animation finished and next animation start, millisecond, no less than `1000` |
| animateSpeed | Integer | `150` | Animation speed, calculate animation run time using this and `animateSpeedDelay`, no less than `100` |
| animateSpeedDelay | Integer | `10` | A factor to calc Animation speed, no less than `5` |
| animateItemDirection | String | `'left'` | Every item's animate direction when move, use option below<br/>`'left'`: from left to right<br/>`'top'`: from top to bottom<br/>`'right'`:from right to left<br/>`'bottom'`: from bottom to top<br/>`'random'`: all random, if use this, `animateShowOrder` will force set to `'random'`<br/>`'none'`: no moving animation，and `animateEffect` will force set to `'opacity'`<br/>`'snake'`: 'Snake' Mode, if set to this, the first item to show animation will force set to left top 0, `animateShowOrder` force set to `'singleItem'` |
| animateRowDirection | String | `'left'` | The direction in every row, use option below<br/>`'left'`: every item in row show from left 0 to right 0<br/>`'right'`: every item in row show from right 0 to left 0<br/>`'random'`: random choose `'left'` or `'right'` |
| animateColumnDirection | String | `'top'` | The direction in every column, use option below<br/>`'top'`: every item in column show from top 0 to bottom 0<br/>`'bottom'`: every item in column show from bottom 0 to top 0<br/>`'random'`: random choose`'top'` or `'bottom'` |
| animateShowOrder | String | `'singleItem'` | Show all line or single item at the same time, the time between two item's animation depends on `animateSpeed` and `animateSpeedDelay`, use option below<br/>`'singleItem'`: every item show after last item show<br/>`'multiLine'`: every item in same row or column show at the same time, use the direction of `animateItemDirection` as start position<br/>`'random'`: random set every item's show time |
| animateEffect | String | `'opacity'` | Effect of item, use the options below<br/>`'opacity'`: from `0` to `1`<br/>`'none'`: opacity always `1`<br/>`'sameRandom'`: all item will use same option, random choose one in `'opacity'` and `'none'`<br/>`'allRandom'`: each item use their own config in random |
| imageList | Array | `[]` | The image list, empty will use unsplash |
| useUnSplash | Boolean | `false` | Use unsplash or not, notice that even set to `false`, if `imageList` is empty, this will force set to `true` |
| unSplashTag | String | `'japan'` | The tag of unsplash, different tags will return different images which fit this tag |
| initLoadFinishCallback | Function | `null` | Callback after first image loaded and show |
| photoLoadSuccessCallback | Function | `null` | Callback after image loaded, include the first image in init |
| animateBeginCallback | Function | `null` | Callback when animation Start |
| animateEndCallback | Function | `null` | Callback when animation Finished |

### Valid configuration when animationSolution set to `'byCss3'`

| Name | Type | Default | Intro |
| ---- | ---- | ---- | ----------- |
| css3AnimateEasing | String | `'ease'` | The `animation-timing-function` value of css3, support `'linear'` `'ease'` `'ease-in'` `'ease-out'` `'ease-in-out'` `'cubic-bezier(*,*,*,*)'`, and other two random config below<br/>`'sameRandom'`: all item in grid will use same config, choose one in `'linear'` `'ease'` `'ease-in'` `'ease-out'` `'ease-in-out'`<br/>`'allRandom'`: each item in grid will use their own config, choose one in`'linear'` `'ease'` `'ease-in'` `'ease-out'` `'ease-in-out'` |

### Valid configuration when animationSolution set to `'byCanvas'`

| Name | Type | Default | Intro |
| ---- | ---- | ---- | ----------- |
| canvasAnimateEasing | String | `'SinusoidalInOut'` | The easing functions of ZRender, include `'Linear'` `'QuadraticIn'` `'QuadraticOut'` `'QuadraticInOut'` `'CubicIn'` `'CubicOut'` `'CubicInOut'` `'QuarticIn'` `'QuarticOut'` `'QuarticInOut'` `'QuinticIn'` `'QuinticOut'` `'QuinticInOut'` `'SinusoidalIn'` `'SinusoidalOut'` `'SinusoidalInOut'` `'ExponentialIn'` `'ExponentialOut'` `'ExponentialInOut'` `'CircularIn'` `'CircularOut'` `'CircularInOut'` `'ElasticIn'` `'ElasticOut'` `'ElasticInOut'` `'BackIn'` `'BackOut'` `'BackInOut'` `'BounceIn'` `'BounceOut'` `'BounceInOut'`, see [ZRender official example of easing functions](http://echarts.baidu.com/gallery/editor.html?c=line-easing), like above `css3AnimateEasing`, include `'sameRandom'` and `'allRandom'` to set random |

## Notice

* When change config above, it will use new config to draw immediately, some of configs will force stop animation and draw next image, then load image normally, with call of `animateEndCallback`
* If use `imageList`, but all of the image in list load failed, this component will stop load until you set new config
* If the image showing now is equal to the next image loaded, it will not use the next image, but still load the one after next

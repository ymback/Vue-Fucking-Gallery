# Fucking-Gallery

**A sample gallery library for you to fuck, animate loading next! [中文看这里](README-CN.md)**

[![](example/1.jpg)](example/1.jpg "Example 1")

[![](example/2.jpg)](example/2.jpg "Example 2")

[![](example/3.jpg)](example/3.jpg "Example 3")

## How to use
- Add the script and link tag in the head of html.

```html
 <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
 <script src="https://cdnjs.cloudflare.com/ajax/libs/konva/4.0.6/konva.min.js"></script>
 <script src="/js/slider.js"></script>
 <link rel="stylesheet" type="text/css" href="/css/loader.css"/>
```
- Add `<ul>` to the body.

```html
<ul class="giveMeFuckingClassName"></ul>
```
- Call init function.

```javascript
    $().ready(function () {
        var ul = $(".giveMeFuckingClassName");
        ul.slider();
    });
```
## Config
- Config your base image list (not necessary if use [Unsplash](https://unsplash.com/) image service).

```javascript
    var imageList = [
        "/images/1.jpg",
        "/images/2.jpg",
        "/images/3.jpg",
        "/images/4.jpg",
        "/images/5.jpg"
    ];
```

- More config, edit slide.js

```javascript
    //The unit of time is ms.
    Slider.DEFAULTS = {
        xMaxWidth: 200, //Max width of grid item.
        yMaxHeight: 200, //Max height of grid item.
        sliderSpeed: 4000, //Wait time to start next change image animation.
        animateSpeed: 150, //Animate speed.
        animateSpeedDelay: 10, //Animate speed to delay.
        space: 0, //Grid divider width.
        spaceColor: '#fff', //Grid divider color.
        useUnSplash: true, //If set true or the imageList you set is empty, it will load Unsplash random image.
        unSplashTag: "japan" //Unsplash random image tag, you can use anything word you like, e.g. japan/sky/mountain etc.
    };
```

# 操蛋的相册

**让你觉得操蛋的相册库，加载下一张图片时，你会得到乱七八糟的动画！ [English here](readme)**

[![](example/1.jpg)](example/1.jpg "Example 1")

[![](example/2.jpg)](example/2.jpg "Example 2")

[![](example/3.jpg)](example/3.jpg "Example 3")

## 怎么用
- 把Js和Css的引用放到head里面

```html
 <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
 <script src="https://cdnjs.cloudflare.com/ajax/libs/konva/4.0.6/konva.min.js"></script>
 <script src="/js/slider.js"></script>
 <link rel="stylesheet" type="text/css" href="/css/loader.css"/>
```
- 把 `<ul>` 放到body里面.

```html
<ul class="giveMeFuckingClassName"></ul>
```
- 调用初始化函数.

```javascript
    $().ready(function () {
        var ul = $(".giveMeFuckingClassName");
        ul.slider();
    });
```
## 配置
- 配置你的图片地址数组 (如果你用[Unsplash](https://unsplash.com/)随机图片服务，那么这个爱配不配).

```javascript
    var imageList = [
        "/images/1.jpg",
        "/images/2.jpg",
        "/images/3.jpg",
        "/images/4.jpg",
        "/images/5.jpg"
    ];
```

- 更多的配置, 去编辑slide.js文件

```javascript
    //时间的单位是毫秒
    Slider.DEFAULTS = {
        xMaxWidth: 200, //每个单元模块的宽度
        yMaxHeight: 200, //每个单元模块的高度.
        sliderSpeed: 4000, //等待播放下一张动画的时间
        animateSpeed: 150, //动画播放时间
        animateSpeedDelay: 10, //动画延迟时间
        space: 0, //每个单元之间的分割线宽度
        spaceColor: '#fff', //分割线颜色
        useUnSplash: true, //这个要是设为true,或者你压根没配置imageList，那么就会用到Unsplash的随机图片
        unSplashTag: "japan" //Unsplash随机图的标签，爱用啥用啥，比如japan，但是makelove这样的是没图的，你别想了
    };
```

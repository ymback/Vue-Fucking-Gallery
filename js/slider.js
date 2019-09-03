(function ($) {
    var NAMESPACE = "slider";
    var slideInstance;

    var Slider = function (el, options) {
        slideInstance = this;
        this.$el = $(el);
        this.opts = $.extend({}, Slider.DEFAULTS, $.isPlainObject(options) && options);
        this.init();
    };
    $(window).resize(function () {
        slideInstance.resize();
    });
    Slider.prototype = {
        init: function () {
            this.x = Math.floor(this.$el.width() / this.opts.xMaxWidth);
            this.y = Math.floor(this.$el.height() / this.opts.yMaxHeight);
            this.imageList =
                (imageList === null
                || !(imageList instanceof Array)
                || imageList.length < 1)
                    ? []
                    : imageList;
            this.unSplashUrl = "https://source.unsplash.com/random/"
                + this.$el.width() + "x" + this.$el.height()
                + "?"
                + ((this.opts.unSplashTag === null
                    || undefined === this.opts.unSplashTag
                    || !(typeof this.opts.unSplashTag === 'string')
                    || this.opts.unSplashTag.length < 1)
                        ? ""
                        : this.opts.unSplashTag
                );
            this.useUnSplash = this.opts.useUnSplash || this.imageList.length < 1;
            this.gridNum = this.x * this.y;
            this.space = Math.floor(this.opts.space);
            this.spaceColor = this.opts.spaceColor;
            this.sliderSpeed = this.opts.sliderSpeed;
            this.animateSpeed = this.opts.animateSpeed;
            this.animateSpeedDelay = this.opts.animateSpeedDelay;
            this.gridWidth = Math.round((this.$el.width() - (this.x - 1) * this.space) / this.x);
            this.gridHeight = Math.round((this.$el.height() - (this.y - 1) * this.space) / this.y);
            this.xGridLastWidth = this.$el.width() - (this.x - 1) * (this.gridWidth + this.space);
            this.yGridLastHeight = this.$el.height() - (this.y - 1) * (this.gridHeight + this.space);
            this.excludeSpaceWidth = this.$el.width() - this.space * (this.x - 1);
            this.excludeSpaceHeight = this.$el.height() - this.space * (this.y - 1);
            this.acitveIndex = 0; // 正在轮播第 0 个li
            this.nextStartTime = 0;
            this.konvaImageObject = null;
            this.konvaImageCanvas = null;
            this.render(false);
        },
        resize: function () {
            this.x = Math.floor(this.$el.width() / this.opts.xMaxWidth);
            this.y = Math.floor(this.$el.height() / this.opts.yMaxHeight);
            this.gridNum = this.x * this.y;
            this.gridWidth = Math.round((this.$el.width() - (this.x - 1) * this.space) / this.x);
            this.gridHeight = Math.round((this.$el.height() - (this.y - 1) * this.space) / this.y);
            this.xGridLastWidth = this.$el.width() - (this.x - 1) * (this.gridWidth + this.space);
            this.yGridLastHeight = this.$el.height() - (this.y - 1) * (this.gridHeight + this.space);
            this.excludeSpaceWidth = this.$el.width() - this.space * (this.x - 1);
            this.excludeSpaceHeight = this.$el.height() - this.space * (this.y - 1);
            this.render(true);
            if (this.konvaImageObject !== null) {
                var image = this.konvaImageObject;
                var sourceWidth = image.getWidth();
                var sourceHeight = image.getHeight();
                var newWidth, newHeight;
                //图片宽度为整体宽度，高度为反向计算值
                if (sourceWidth / sourceHeight <= this.excludeSpaceWidth / this.excludeSpaceHeight) {
                    newWidth = this.excludeSpaceWidth;
                    newHeight = sourceHeight * this.excludeSpaceWidth / sourceWidth;
                } else {
                    newHeight = this.excludeSpaceHeight;
                    newWidth = sourceWidth * this.excludeSpaceHeight / sourceHeight;
                }
                newWidth = Math.round(newWidth);
                newHeight = Math.round(newHeight);
                image.setWidth(newWidth);
                image.setHeight(newHeight);
                this.konvaImageCanvas = image.toCanvas();
                this.$gridB.css({
                    "background-image": "",
                    "animation-name": "",
                    "-moz-animation-name": "",
                    "-webkit-animation-name": "",
                    "-o-animation-name": "",
                    "animation-duration": "",
                    "-moz-animation-duration": "",
                    "-webkit-animation-duration": "",
                    "-o-animation-duration": "",
                    "animation-delay": "",
                    "-moz-animation-delay": "",
                    "-webkit-animation-delay": "",
                    "-o-animation-delay": "",
                    "animation-iteration-count:": "",
                    "-moz-animation-iteration-count:": "",
                    "-webkit-animation-iteration-count:": "",
                    "-o-animation-iteration-count:": "",
                    "animation-fill-mode": "",
                    "-moz-animation-fill-mode": "",
                    "-webkit-animation-fill-mode": "",
                    "-o-animation-fill-mode": "",
                    "animation-timing-function": "",
                    "-moz-animation-timing-function": "",
                    "-webkit-animation-timing-function": "",
                    "-o-animation-timing-function": "",
                    "top": 0,
                    "left": 0
                });
                this.calcPositionAB();
            }
        },
        render: function (resize) {
            var gridHtml = "";
            this.temp = {
                parentTemp: '<li class="slider-parent"></li>',
                gridTemp: '<div class="slider-grid">' +
                '<div class="slider-grid-a"></div>' +
                '<div class="slider-grid-b"></div>' +
                '</div>'
            };

            this.$el.addClass("slider").find("li").hide();
            this.$el.css({
                "background-color": this.spaceColor
            });

            // 在后面插入一个 li，用作主战场
            this.$parent = $(this.temp.parentTemp);
            this.$el.prepend(this.$parent);
            this.$parent.css({
                width: "100%",
                height: "100%"
            });

            // 创建 x * y 个div
            for (var i = 0; i < this.gridNum; i++) {
                gridHtml += this.temp.gridTemp;
            }
            this.$sliderGrid = $(gridHtml);
            this.$parent.html(this.$sliderGrid);
            this.gridInit(resize);
        },
        gridInit: function (resize) {
            var self = this;
            this.initPosition();
            this.$gridA = this.$sliderGrid.find(".slider-grid-a");
            this.$gridB = this.$sliderGrid.find(".slider-grid-b");
            if(resize){
                return;
            }
            this.initKonva(function () {
                $('body').addClass('loaded');
                $('#loader-wrapper').find('.load_title').remove();
                self.acitveIndex = self.acitveIndex === self.imageList.length - 1 ? 0 : self.acitveIndex + 1;
                self.calcPositionAB();
                self.bind();
            });
        },
        initKonva: function (finishCallback) {
            var self = this;
            var url = this.useUnSplash
                ? this.unSplashUrl + "&sig=" + new Date().getTime()
                : this.imageList[this.acitveIndex];
            var imageObj = new Image();
            imageObj.setAttribute("crossOrigin", 'Anonymous');
            imageObj.src = url;
            if (imageObj.complete) {
                this.initKonvaOnLoad(self, imageObj, finishCallback);
                return;
            }
            imageObj.onload = function () {
                self.initKonvaOnLoad(self, imageObj, finishCallback);
            };
            imageObj.onerror = function () {
                self.acitveIndex = self.acitveIndex === self.imageList.length - 1 ? 0 : self.acitveIndex + 1;
                self.initKonva(finishCallback);
            }
        },
        initKonvaOnLoad: function (self, imageObj, finishCallback) {
            var image = new Konva.Image({
                x: 0,
                y: 0,
                image: imageObj,
                width: imageObj.width,
                height: imageObj.height
            });
            var sourceWidth = image.getWidth();
            var sourceHeight = image.getHeight();
            var newWidth, newHeight;
            //图片宽度为整体宽度，高度为反向计算值
            if (sourceWidth / sourceHeight <= self.excludeSpaceWidth / self.excludeSpaceHeight) {
                newWidth = self.excludeSpaceWidth;
                newHeight = sourceHeight * self.excludeSpaceWidth / sourceWidth;
            } else {
                newHeight = self.excludeSpaceHeight;
                newWidth = sourceWidth * self.excludeSpaceHeight / sourceHeight;
            }
            newWidth = Math.round(newWidth);
            newHeight = Math.round(newHeight);
            image.setWidth(newWidth);
            image.setHeight(newHeight);
            self.konvaImageObject = image;
            self.konvaImageCanvas = image.toCanvas();
            finishCallback();
        },
        initPosition: function () {
            var self = this;
            this.$sliderGrid.each(function (index, grid) {
                //获取当前行数，计算top的offset偏移值
                var top = Math.floor(index / self.x) % self.y * ( self.gridHeight + self.space);
                //获取当前列数，计算left的offset偏移值
                var left = index % self.x * (self.gridWidth + self.space);
                //计算最后一个X方向的ITEM的宽度
                var gridItemWidth = (index % self.x < self.x - 1) ? self.gridWidth : self.xGridLastWidth;
                //计算最后一个Y方向的ITEM的宽度
                var gridItemHeight = Math.floor(index / self.x) < (self.y - 1) ? self.gridHeight : self.yGridLastHeight;
                $(this).css({
                    left: left,
                    top: top,
                    width: gridItemWidth,
                    height: gridItemHeight
                });
            });
        },
        calcPositionAB: function () {
            var self = this;
            var sourceWidth = this.konvaImageCanvas.width;
            var sourceHeight = this.konvaImageCanvas.height;
            var fromLeft;
            var fromTop;
            //图片宽度全占用，高度取中间
            if (sourceWidth / sourceHeight < self.excludeSpaceWidth / self.excludeSpaceHeight) {
                fromLeft = 0;
                //计算高度
                var canUseHeight = sourceWidth * self.excludeSpaceHeight / self.excludeSpaceWidth;
                fromTop = Math.round((sourceHeight - canUseHeight) / 2);
            } else {//图片高度全占用，宽度取中间
                fromTop = 0;
                //计算宽度
                var canUseWidth = sourceHeight * self.excludeSpaceWidth / self.excludeSpaceHeight;
                fromLeft = Math.round((sourceWidth - canUseWidth) / 2);
            }
            var urlList = [];
            this.$sliderGrid.each(function (index, grid) {
                // magic
                var imgLeft = fromLeft + (index % self.x) * self.gridWidth;
                var imgTop = fromTop + Math.floor(index / self.x) % self.y * self.gridHeight;
                var imageWidth = (index % self.x < self.x - 1) ? self.gridWidth : self.xGridLastWidth;
                var imageHeight = (Math.floor(index / self.x) < self.y - 1) ? self.gridHeight : self.yGridLastHeight;

                urlList[index] = self.getImagePortion(self.konvaImageCanvas, imgLeft, imgTop, imageWidth, imageHeight);
            });
            this.$sliderGrid.each(function (index, grid) {
                $(this).find("div").css({
                    "background-image": "url(" + urlList[index] + ")",
                    "background-repeat": "no-repeat",
                    "background-size": "100% 100%",
                    "-moz-background-size": "100% 100%"
                });
            });
        },
        calcPositionA: function () {
            var self = this;
            var sourceWidth = this.konvaImageCanvas.width;
            var sourceHeight = this.konvaImageCanvas.height;
            var fromLeft;
            var fromTop;
            //图片宽度全占用，高度取中间
            if (sourceWidth / sourceHeight < self.excludeSpaceWidth / self.excludeSpaceHeight) {
                fromLeft = 0;
                //计算高度
                var canUseHeight = sourceWidth * self.excludeSpaceHeight / self.excludeSpaceWidth;
                fromTop = Math.round((sourceHeight - canUseHeight) / 2);
            } else {//图片高度全占用，宽度取中间
                fromTop = 0;
                //计算宽度
                var canUseWidth = sourceHeight * self.excludeSpaceWidth / self.excludeSpaceHeight;
                fromLeft = Math.round((sourceWidth - canUseWidth) / 2);
            }
            var urlList = [];
            this.$gridA.each(function (index, grid) {
                var imgLeft = fromLeft + (index % self.x) * self.gridWidth;
                var imgTop = fromTop + Math.floor(index / self.x) % self.y * self.gridHeight;
                var imageWidth = (index % self.x < self.x - 1) ? self.gridWidth : self.xGridLastWidth;
                var imageHeight = (Math.floor(index / self.x) < self.y - 1) ? self.gridHeight : self.yGridLastHeight;
                urlList[index] = self.getImagePortion(self.konvaImageCanvas, imgLeft, imgTop, imageWidth, imageHeight);
            });
            this.$gridA.each(function (index, grid) {
                $(this).css({
                    "background-image": "url(" + urlList[index] + ")",
                    "background-repeat": "no-repeat",
                    "background-size": "100% 100%",
                    "-moz-background-size": "100% 100%"
                });
            });
        },
        calcPositionB: function () {
            var self = this;
            var sourceWidth = this.konvaImageCanvas.width;
            var sourceHeight = this.konvaImageCanvas.height;
            var fromLeft;
            var fromTop;
            //图片宽度全占用，高度取中间
            if (sourceWidth / sourceHeight < self.excludeSpaceWidth / self.excludeSpaceHeight) {
                fromLeft = 0;
                //计算高度
                var canUseHeight = sourceWidth * self.excludeSpaceHeight / self.excludeSpaceWidth;
                fromTop = Math.round((sourceHeight - canUseHeight) / 2);
            } else {//图片高度全占用，宽度取中间
                fromTop = 0;
                //计算宽度
                var canUseWidth = sourceHeight * self.excludeSpaceWidth / self.excludeSpaceHeight;
                fromLeft = Math.round((sourceWidth - canUseWidth) / 2);
            }
            var urlList = [];
            this.$gridB.each(function (index, grid) {
                var imgLeft = fromLeft + (index % self.x) * self.gridWidth;
                var imgTop = fromTop + Math.floor(index / self.x) % self.y * self.gridHeight;
                var imageWidth = (index % self.x < self.x - 1) ? self.gridWidth : self.xGridLastWidth;
                var imageHeight = (Math.floor(index / self.x) < self.y - 1) ? self.gridHeight : self.yGridLastHeight;
                urlList[index] = self.getImagePortion(self.konvaImageCanvas, imgLeft, imgTop, imageWidth, imageHeight);
            });
            this.$gridB.each(function (index, grid) {
                $(this).css({
                    "background-image": "url(" + urlList[index] + ")",
                    "background-repeat": "no-repeat",
                    "background-size": "100% 100%",
                    "-moz-background-size": "100% 100%"
                });
            });
        },
        bind: function () {
            this.next();
        },
        next: function () {
            this.nextStartTime = new Date().getTime();
            var self = this;
            var url = this.useUnSplash
                ? this.unSplashUrl + "&sig=" + new Date().getTime()
                : this.imageList[this.acitveIndex];
            var imageObj = new Image();
            imageObj.setAttribute("crossOrigin", 'Anonymous');
            imageObj.src = url;
            if (imageObj.complete) {
                this.imageOnLoad(self, imageObj);
                return;
            }
            imageObj.onload = function () {
                self.imageOnLoad(self, imageObj);
            };
            imageObj.onerror = function () {
                self.acitveIndex = self.acitveIndex === self.imageList.length - 1 ? 0 : self.acitveIndex + 1;
                self.next();
            };
        },
        imageOnLoad: function (self, imageObj) {
            var image = new Konva.Image({
                x: 0,
                y: 0,
                image: imageObj,
                width: imageObj.width,
                height: imageObj.height
            });
            var sourceWidth = image.getWidth();
            var sourceHeight = image.getHeight();
            var newWidth, newHeight;
            //图片宽度为整体宽度，高度为反向计算值
            if (sourceWidth / sourceHeight <= self.excludeSpaceWidth / self.excludeSpaceHeight) {
                newWidth = self.excludeSpaceWidth;
                newHeight = sourceHeight * self.excludeSpaceWidth / sourceWidth;
            } else {
                newHeight = self.excludeSpaceHeight;
                newWidth = sourceWidth * self.excludeSpaceHeight / sourceHeight;
            }
            newWidth = Math.round(newWidth);
            newHeight = Math.round(newHeight);
            image.setWidth(newWidth);
            image.setHeight(newHeight);
            var canvasTemp = image.toCanvas();
            if (canvasTemp.toDataURL() == self.konvaImageCanvas.toDataURL()) {
                self.acitveIndex = self.acitveIndex === self.imageList.length - 1 ? 0 : self.acitveIndex + 1;
                self.next();
                return;
            }
            self.konvaImageObject = image;
            self.konvaImageCanvas = image.toCanvas();
            var timeDiff = new Date().getTime() - this.nextStartTime;
            if (timeDiff >= self.sliderSpeed) {
                self.acitveIndex = self.acitveIndex === self.imageList.length - 1 ? 0 : self.acitveIndex + 1;
                self.animate();
                return;
            }
            setTimeout(function () {
                self.acitveIndex = self.acitveIndex === self.imageList.length - 1 ? 0 : self.acitveIndex + 1;
                self.animate();
            }, self.sliderSpeed - timeDiff);
        },
        animate: function () {
            var delayMode = parseInt(Math.random() * 2, 10);//0为每个单算，1为整行移动
            switch (parseInt(Math.random() * 3, 10)) {
                case 0:
                    this.animateType0(delayMode);//从左到右
                    break;
                case 1:
                    this.animateType1(delayMode);//从上到下
                    break;
                case 2:
                    this.animateType2(delayMode);//随机移动，delayMode的0为带透明，1为不带透明
                    break;
            }
        },
        animateType0: function (delayMode) {
            var self = this;
            this.$gridB.css({
                "left": "-100%",
                "opacity": 0,
                "display": "block"
            });
            this.calcPositionB();
            var maxRunTime = 0;
            this.$gridB.each(function (index, gridB) {
                var runTime = Math.floor(self.animateSpeed * self.animateSpeedDelay);
                var delayTime = delayMode === 0
                    ? Math.floor(self.animateSpeed * index / 3)
                    : Math.floor(self.animateSpeed * (index % self.x));
                if (runTime + delayTime > maxRunTime) {
                    maxRunTime = runTime + delayTime;
                }
                $(this).css({
                    "animation-name": "fromLeftToRightWithOpacityChange",
                    "-moz-animation-name": "fromLeftToRightWithOpacityChange",
                    "-webkit-animation-name": "fromLeftToRightWithOpacityChange",
                    "-o-animation-name": "fromLeftToRightWithOpacityChange",
                    "animation-duration": runTime + "ms",
                    "-moz-animation-duration": runTime + "ms",
                    "-webkit-animation-duration": runTime + "ms",
                    "-o-animation-duration": runTime + "ms",
                    "animation-delay": delayTime + "ms",
                    "-moz-animation-delay": delayTime + "ms",
                    "-webkit-animation-delay": delayTime + "ms",
                    "-o-animation-delay": delayTime + "ms",
                    "animation-iteration-count:": 1,
                    "-moz-animation-iteration-count:": 1,
                    "-webkit-animation-iteration-count:": 1,
                    "-o-animation-iteration-count:": 1,
                    "animation-fill-mode": "forwards",
                    "-moz-animation-fill-mode": "forwards",
                    "-webkit-animation-fill-mode": "forwards",
                    "-o-animation-fill-mode": "forwards",
                    "animation-timing-function": "ease",
                    "-moz-animation-timing-function": "ease",
                    "-webkit-animation-timing-function": "ease",
                    "-o-animation-timing-function": "ease"
                });
            });
            setTimeout(function () {
                self.animateReset();
            }, maxRunTime + 100);//故意增加100毫秒
        },
        animateType1: function (delayMode) {
            var self = this;
            this.$gridB.css({
                "top": "-100%",
                "opacity": 0,
                "display": "block"
            });
            this.calcPositionB();
            var maxRunTime = 0;
            this.$gridB.each(function (index, gridB) {
                var runTime = Math.floor(self.animateSpeed * self.animateSpeedDelay);
                var delayTime = delayMode === 0
                    ? Math.floor(self.animateSpeed * index / 3)
                    : Math.floor(self.animateSpeed * Math.floor(index / self.x) * 3);
                if (runTime + delayTime > maxRunTime) {
                    maxRunTime = runTime + delayTime;
                }
                $(this).css({
                    "animation-name": "fromTopToBottomWithOpacityChange",
                    "-moz-animation-name": "fromTopToBottomWithOpacityChange",
                    "-webkit-animation-name": "fromTopToBottomWithOpacityChange",
                    "-o-animation-name": "fromTopToBottomWithOpacityChange",
                    "animation-duration": runTime + "ms",
                    "-moz-animation-duration": runTime + "ms",
                    "-webkit-animation-duration": runTime + "ms",
                    "-o-animation-duration": runTime + "ms",
                    "animation-delay": delayTime + "ms",
                    "-moz-animation-delay": delayTime + "ms",
                    "-webkit-animation-delay": delayTime + "ms",
                    "-o-animation-delay": delayTime + "ms",
                    "animation-iteration-count:": 1,
                    "-moz-animation-iteration-count:": 1,
                    "-webkit-animation-iteration-count:": 1,
                    "-o-animation-iteration-count:": 1,
                    "animation-fill-mode": "forwards",
                    "-moz-animation-fill-mode": "forwards",
                    "-webkit-animation-fill-mode": "forwards",
                    "-o-animation-fill-mode": "forwards",
                    "animation-timing-function": "ease",
                    "-moz-animation-timing-function": "ease",
                    "-webkit-animation-timing-function": "ease",
                    "-o-animation-timing-function": "ease"
                });
            });
            setTimeout(function () {
                self.animateReset();
            }, maxRunTime + 100);//故意增加100毫秒
        },
        animateType2: function (delayMode) {
            var self = this;
            this.$gridB.css({
                "opacity": delayMode === 0 ? 0 : 1,
                "display": "block"
            });
            var directionArray = [];
            this.$gridB.each(function (index, gridB) {
                // 随机一下 b 的位置
                var direction;
                switch (parseInt(Math.random() * 4, 10)) {
                    case 0:
                        direction = "up";
                        $(this).css("top", "-100%");
                        break;
                    case 1:
                        direction = "down";
                        $(this).css("top", "100%");
                        break;
                    case 2:
                        direction = "left";
                        $(this).css("left", "-100%");
                        break;
                    case 3:
                        direction = "right";
                        $(this).css("left", "100%");
                        break;
                }
                directionArray[index] = direction;
            });
            this.calcPositionB();
            var maxRunTime = 0;
            this.$gridB.each(function (index, gridB) {
                var runTime = Math.floor(self.animateSpeed * self.animateSpeedDelay);
                var delayTime = Math.floor(self.animateSpeed * parseInt(Math.random() * 8, 10));

                if (runTime + delayTime > maxRunTime) {
                    maxRunTime = runTime + delayTime;
                }
                var animationName;
                switch (directionArray[index]) {
                    case "up":
                        animationName = delayMode === 0 ? "fromTopToBottomWithOpacityChange" : "fromTopToBottom";
                        break;
                    case "down":
                        animationName = delayMode === 0 ? "fromBottomToTopWithOpacityChange" : "fromBottomToTop";
                        break;
                    case "left":
                        animationName = delayMode === 0 ? "fromLeftToRightWithOpacityChange" : "fromLeftToRight";
                        break;
                    case "right":
                        animationName = delayMode === 0 ? "fromRightToLeftWithOpacityChange" : "fromRightToLeft";
                        break;
                }
                $(this).css({
                    "animation-name": animationName,
                    "-moz-animation-name": animationName,
                    "-webkit-animation-name": animationName,
                    "-o-animation-name": animationName,
                    "animation-duration": runTime + "ms",
                    "-moz-animation-duration": runTime + "ms",
                    "-webkit-animation-duration": runTime + "ms",
                    "-o-animation-duration": runTime + "ms",
                    "animation-delay": delayTime + "ms",
                    "-moz-animation-delay": delayTime + "ms",
                    "-webkit-animation-delay": delayTime + "ms",
                    "-o-animation-delay": delayTime + "ms",
                    "animation-iteration-count:": 1,
                    "-moz-animation-iteration-count:": 1,
                    "-webkit-animation-iteration-count:": 1,
                    "-o-animation-iteration-count:": 1,
                    "animation-fill-mode": "forwards",
                    "-moz-animation-fill-mode": "forwards",
                    "-webkit-animation-fill-mode": "forwards",
                    "-o-animation-fill-mode": "forwards",
                    "animation-timing-function": "ease",
                    "-moz-animation-timing-function": "ease",
                    "-webkit-animation-timing-function": "ease",
                    "-o-animation-timing-function": "ease"
                });
            });
            setTimeout(function () {
                self.animateReset();
            }, maxRunTime + 100);//故意增加100毫秒
        },
        animateReset: function () {
            var self = this;
            this.calcPositionA();
            setTimeout(function () {
                self.$gridB.css({
                    "background-image": "",
                    "animation-name": "",
                    "-moz-animation-name": "",
                    "-webkit-animation-name": "",
                    "-o-animation-name": "",
                    "animation-duration": "",
                    "-moz-animation-duration": "",
                    "-webkit-animation-duration": "",
                    "-o-animation-duration": "",
                    "animation-delay": "",
                    "-moz-animation-delay": "",
                    "-webkit-animation-delay": "",
                    "-o-animation-delay": "",
                    "animation-iteration-count:": "",
                    "-moz-animation-iteration-count:": "",
                    "-webkit-animation-iteration-count:": "",
                    "-o-animation-iteration-count:": "",
                    "animation-fill-mode": "",
                    "-moz-animation-fill-mode": "",
                    "-webkit-animation-fill-mode": "",
                    "-o-animation-fill-mode": "",
                    "animation-timing-function": "",
                    "-moz-animation-timing-function": "",
                    "-webkit-animation-timing-function": "",
                    "-o-animation-timing-function": "",
                    "top": 0,
                    "left": 0
                });
            }, self.sliderSpeed / 10);
            self.next();
        },
        getImagePortion: function (konvaImageCanvas, imgLeft, imgTop, imageWidth, imageHeight) {
            var tnCanvas = document.createElement('canvas');
            var tnCanvasContext = tnCanvas.getContext('2d');
            tnCanvas.width = imageWidth;
            tnCanvas.height = imageHeight;
            tnCanvasContext.drawImage(konvaImageCanvas, imgLeft, imgTop, imageWidth, imageHeight, 0, 0, imageWidth, imageHeight);
            return tnCanvas.toDataURL();
        }
    };
    Slider.DEFAULTS = {
        xMaxWidth: 200,
        yMaxHeight: 200,
        sliderSpeed: 4000,
        animateSpeed: 150,
        animateSpeedDelay: 10,
        space: 0,
        spaceColor: '#fff',
        useUnSplash: true,
        unSplashTag: "japan"
    };

    // 变为 jquery 插件
    $.fn.slider = function (option) {
        var args = [].slice.call(arguments, 1);

        return this.each(function () {
            var $this = $(this);
            var data = $this.data(NAMESPACE);
            var options;
            var fn;

            options = $.extend({}, $this.data(), $.isPlainObject(option) && option);
            $this.data(NAMESPACE, (data = new Slider(this, options)));

            if (typeof option === 'string' && $.isFunction(fn = data[option])) {
                fn.apply(data, args);
            }
        });
    };
})(jQuery, window);
var imageList = [];
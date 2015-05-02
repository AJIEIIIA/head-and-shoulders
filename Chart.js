/*
todo несколько графиков пользуются одним layout - merge layout. grid - отдельный объект?
todo несколько панелей с графиками - возможность добавления индикаторов под освновной график
todo Разобраться с .5 для линий. Как рисовать так чтобы было красиво?
todo Почему то при scale = 2 получается, что свечки друг на друга залезают и последняя свечка уходит половинкой за ось У
todo Доделать нормально разметку горизонтальной оси, чтобы выводить через равные промежутки
todo Перерисовка графика - добавить возможность добавлять и обновлять свечки.
todo Учесть возможность добавления истории в начало графика
todo Курсор выделения свечей (Переходим на систему вычисление координаты Х из вермени?)
todo Все равно не быстро скроллится на планшете. Поизучать еще оптимизацию отрисовки. Бысто скроллится на маленьком канвасе - уверен отрисовка зависит от размера канваса
*/

//(function(){
"use strict";
//1 px is minimal spacce between two x points
var MIN_X_WIDTH = 1;
//10 px is initial space between two adjacent x points
var INITIAL_SCALE = 10;
//default options for chart
var OPTIONS_DEFAULT = {
    //makes chart control resize when window resized
    autoSize                    : true,
    //minimal width of control (in px)
    minWidth                    : 240,
    //minimal height of control (in px)
    minHeight                   : 180,
    //makes control keep constant ratio between height and width
    //ratio's set by dimensionsRatio
    keepDimensionsRatio         : false,
    //height/width ratio
    dimensionsRation            : .75,
    //font size of x and y axis (in px)
    axisFontSize                : 10,
    //axis font
    axisFont                    : "arial",
    //sets grid lines color
    gridColor                   : "LightGray",
    //sets axis lines and font color
    axisColor                   : "Black",
    //sets fill color for negative candle
    NegativeCandleColor         : "Red",
    //sets border color for negative candle
    NegativeCandleBorderColor   : "DarkRed",
    //sets fill color for positive candle
    PositiveCandleColor         : "LightGreen",
    //sets border color for positive candle
    PositiveCandleBorderColor   : "Green",
    //sets color for candles shadow
    ShadowColor                 : "Black",
    //sets chart time step in minutes
    //(if zero - value would be determined automatically using minimal difference between two adjacent candles in data array)
    TimeStep                    : 0,
    //minimal price difference in points i.e. if minimal price change is .25 then MinStep have to be set to 25 and decimals to .01
    //if zero - would be determined automatically by analyzing data array
    MinStep                     : 0,
    //quantity of decimal places after dot
    //if zero - would be determined automatically by analyzing data array
    Decimals                    : 0


};

var AXIS_MARK_SIZE = 3; //3 px for axis mark

//helper methods
var helpers = {};
 //Binary searches index of key, using comparator function in array passed as collection
//If key not present in array returns ~of nearest greater element.
//If there's on greater element, returns ~ of array length  
helpers.findFirstIndex = function(collection, key, comparator){
     if (comparator == undefined)
        comparator = function(element, target){
            return element - target;
        }

    if (collection.length == 0)
        return -1;
    var i0 = 0;
    var i1 = collection.length - 1;

    if (comparator(collection[i0], key) == 0)
        return i0;
    if (comparator(collection[i1], key) == 0)
        return i1;
    var currentIndex = 0;
    var currentElement;

    while (i0 <= i1){
        currentIndex = (i0 + i1) / 2 | 0;
        currentElement = collection[currentIndex];

        if (comparator(currentElement, key) < 0){
            i0 = currentIndex + 1;
        }
        else if (comparator(currentElement, key) > 0){
            i1 = currentIndex - 1;
        }
        else return currentIndex;
    }
    return ~i0;
};
//merges primary and secondary objects to new one.
//gets attributes from primary with higher priority than from secondary
//i.e. if primary and secondary have attribute a, than result object will get a = primary.a 
helpers.merge = function(primary, secondary){
     var obj3 = {};
     for (var f in primary)
          if (primary.hasOwnProperty(f)) obj3[f] = primary[f];
     for (var f in secondary)
          if (secondary.hasOwnProperty(f))
               if (!obj3.hasOwnProperty(f))
                    obj3[f] = secondary[f];
     return obj3;          
}

helpers.isNumber = function(n){
    return !isNaN(parseFloat(n)) && isFinite(n);
};

helpers.getDecimalPlaces = function(num){
    if (num % 1!==0){
        return num.toString().split(".")[1].length;
    }
    else {
        return 0;
    }
};

helpers.longestText = function(ctx,  arrayOfStrings){
     var longest = 0;
     arrayOfStrings.forEach(function(string){
          var textWidth = ctx.measureText(string).width;
          longest = (textWidth > longest) ? textWidth : longest;
     });
     return longest;
};

helpers.monthNames = {
    en : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

helpers.shortMonthNames = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};
//get full month name for specified locale
//if locale not found, or not cpecified, returns english month name 
helpers.getMonthName = function(month, locale){
    if (locale && helpers.monthNames.hasOwnProperty(locale)){
        return helpers.monthNames[locale][month];	    
    }
    else return helpers.monthNames.en[month];
};
//get short month name for specified locale
//if locale not found, or not cpecified, returns english short month name 
helpers.getShortMonthName = function(month, locale){
 if (locale && helpers.shortMonthNames.hasOwnProperty(locale)){
      return helpers.shortMonthNames[locale][month];
 }
 else return helpers.shortMonthNames.en[month];
}

helpers.orderOfMagnitude = function(value){
    return Math.floor(Math.log(value)/Math.log(10));
}
//makes font string for canvas
helpers.makeFont = function(size, family){
     return size+"px " + family;
};

helpers.stylePx = function(pxValue){
     return pxValue+"px";
}

helpers.fillCanvas = function(context, color){
    context.fillStyle = color;
    context.fillRect(0,0, context.canvas.width, context.canvas.height);
}

helpers.setCanvasHeight = function(ctx, height){
     if (window.devicePixelRatio) {	    
          ctx.canvas.style.height = height + "px";
          ctx.canvas.height = height * window.devicePixelRatio*2;
          ctx.scale(window.devicePixelRatio*2, window.devicePixelRatio*2);
     }
}

helpers.setCanvasWidth = function(ctx, width){
     if (window.devicePixelRatio) {
          ctx.canvas.style.width = width + "px";
          ctx.canvas.width = width * window.devicePixelRatio*2;
          ctx.scale(window.devicePixelRatio*2, window.devicePixelRatio*2);
     }
}

helpers.clearCanvas = function(ctx){
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
//Adds .5 to floor of x;
helpers.normalizeX = function(x){
     return ~~x + .5;
}

helpers.registerEvent = function(element, event, handler){
     if (element.addEventListener){
          element.addEventListener(event, handler);
     }
     else if (element.attachEvent){
          element.attachEvent("on"+event, handler);
     }
};
//extend for inheritance
helpers.extend = function(baseType, type){
    var f = function() { };
    f.prototype = baseType.prototype;
    type.prototype = new f();
    type.prototype.constructor = type;
    type.superclass = baseType.prototype;
}

helpers.getMaximumWidth = function(domNode) {
  var container = domNode.parentNode;
  return container.clientWidth;
};

helpers.getMaximumHeight = function(domNode) {
  var container = domNode.parentNode;
  return container.clientHeight;
};



//////////////////////////////////////////////////CandleStick////////////////////////////////////////////
function CandleStick(key, open, high, low, close, volume){
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.key = key;
};

CandleStick.prototype.update = function(open, high, low, close, volume){
    if (open != undefined) this.open = open;
    if (high != undefined) this.high = high;
    if (low != undefined) this.low = low;
    if (close != undefined) this.close = close;
    if (volume != undefined) this.volume = volume;
};

CandleStick.prototype.update = function (candle){
    this.close = candle.close;
    if (this.high < candle.high)
        this.high = candle.high;
    if (this.low > candle.low)
        this.low =candle.low;
}

CandleStick.prototype.isNeutral = function(){
    return this.open == this.close;
}

CandleStick.prototype.isNegative = function(){
    return this.open > this.close;
}

CandleStick.prototype.isPositive = function(){
    return this.open < this.close;
}
//////////////////////////////////////////////////CandleStick////////////////////////////////////////////

/*
CandleStickChart
props:
ctx - 2d context of html5 canvas
position - position of scrollbar
scaleFactor: 1 - display whole dataset,  < 1 same as 1, > 1
*/

var Chart = {};

Chart.create = function(width, height, opts){
    var options = helpers.merge(opts, OPTIONS_DEFAULT);
    var view = new ChartView(width, height, options);
    this.presenter = view;
    return this;
}

Chart.CandleStick = function(data, candleStockChartOptions){
     var csc = new CandleStickChart(data, candleStockChartOptions);
     csc.initialize();
     this.presenter.setChart(csc);
}

Chart.Line = function(data, lineChartOptions){
    var lc = new LineChart(data, lineChartOptions);
    lc.initialize();
    this.presenter.setChart(lc);
}

function ChartView(width, height, options){
    this.view = {
        width       : width,
        height      : height,
        container   : document.createElement("div"),
        main        : document.createElement("canvas"),
        grid        : document.createElement("canvas"),
        xAxis       : document.createElement("canvas"),
        yAxis       : document.createElement("canvas")
    };

    this.options = options;
    this.charts = [];

    this.view.container.id = "stock-chart-container";
    this.view.container.appendChild(this.view.main);
    this.view.container.appendChild(this.view.grid);
    this.view.container.appendChild(this.view.xAxis);
    this.view.container.appendChild(this.view.yAxis);

    this.view.main_ctx = this.view.main.getContext('2d');
    this.view.grid_ctx = this.view.grid.getContext('2d');
    this.view.xAxis_ctx = this.view.xAxis.getContext('2d');
    this.view.yAxis_ctx = this.view.yAxis.getContext('2d');

    this.bottomHeight = this.options.axisFontSize + AXIS_MARK_SIZE + 2;

    //setup x axis
    this.view.xAxis.style.position = "absolute";
    this.view.xAxis_ctx.font = helpers.makeFont(this.options.axisFontSize, this.options.axisFont);
    this.view.xAxis_ctx.fillStyle = this.options.axisColor;
    this.view.xAxis_ctx.textAlign = "center";
    this.view.xAxis_ctx.textBaseline = "top";
    helpers.setCanvasHeight(this.view.xAxis_ctx, this.bottomHeight);
    this.view.xAxis.style.left = helpers.stylePx(0);
    this.view.xAxis.style.zIndex = 2;

    //setup y axis
    this.view.yAxis.style.position = "absolute";
    this.view.yAxis_ctx.font = helpers.makeFont(this.options.axisFontSize, this.options.axisFont);
    this.view.yAxis_ctx.fillStyle = this.options.axisColor;
    this.view.yAxis_ctx.textAlign = "left";
    this.view.yAxis_ctx.textBaseline = "middle";
    this.view.yAxis.style.zIndex = 2;

    //setup main
    this.view.main.style.position = "absolute";
    this.view.main.style.left = helpers.stylePx(0);
    this.view.main.style.top = helpers.stylePx(0);
    this.view.main.style.zIndex = 2;

    //setup grid
    this.view.grid.style.position = "absolute";
    this.view.grid.style.left = helpers.stylePx(0);
    this.view.grid.style.top = helpers.stylePx(0);
    this.view.grid.style.zIndex = 1;

    var root = this;
    var mouseDown = false;
    var timeout = null;
    var startX = 0;
    var frame = null;

    var cont = document.getElementById("chart-container");
    var currH = window.innerHeight;//document.body.offsetHeight;//document.body.clientHeight;
    var currW = window.innerWidth;//document.body.offsetWidth;

    helpers.registerEvent(this.view.main, "mousedown", function (event) {
        if (event.which == 1)
            mouseDown = true;
        if (mouseDown) {
            startX = event.clientX;
        }
    });

    helpers.registerEvent(this.view.main, "mouseup", function (event) {
        if (event.which == 1)
            mouseDown = false;
    });

    helpers.registerEvent(this.view.main, "touchend", function(event){ mouseDown = false;});

    helpers.registerEvent(this.view.main, "mouseout", function (event) {
        if (mouseDown) mouseDown = false;
    });

    helpers.registerEvent(this.view.main, "touchstart", function(event){
        if (event.touches.length == 1){
            mouseDown = true;
            startX = event.touches[0].clientX;
        }
    });

    var scrollHandler = function (event) {
        if (mouseDown) {
            event.preventDefault();
            var x = event.clientX;
            //scrolling
            if (frame)
                cancelAnimationFrame(frame);

            frame = requestAnimationFrame(function () {
                root.scroll(x - startX);
                startX = x;
            });
        }
    };

    helpers.registerEvent(this.view.main, "touchmove", function(event){
        if (event.touches.length == 1){
            if (mouseDown){
                event.preventDefault();
                var x = event.touches[0].clientX;
                //scrolling
                if (frame)
                    cancelAnimationFrame(frame);

                frame = requestAnimationFrame(function () {
                    root.scroll(x - startX);
                    startX = x;
                });
            }
        }
    });

    helpers.registerEvent(this.view.main, "mousemove", scrollHandler);
}

ChartView.prototype.setChart = function(chart){
    this.charts.push(chart);
    chart.prepareLayout(this.view.width, this.view.height, this.options);
    this.fitView();
}

ChartView.prototype.fitView = function(){
    //layout container
    var layout = this.charts[0].layout;
    var yWidth =  Math.round(helpers.longestText(this.view.yAxis_ctx, layout.yLabels) * 1.1 + AXIS_MARK_SIZE + 2);
    var mainHeight = this.view.height - this.bottomHeight;
    var mainWidth = Math.floor(this.view.width - yWidth);

    this.view.mainHeight = mainHeight;
    this.view.mainWidth = mainWidth;

    this.view.container.style.width = helpers.stylePx(this.view.width);
    this.view.container.style.height = helpers.stylePx(this.view.height);

     //correct dimensions and setup canvas
     helpers.setCanvasWidth(this.view.yAxis_ctx, yWidth);
     helpers.setCanvasHeight(this.view.yAxis_ctx, mainHeight);
     this.view.yAxis.style.left = helpers.stylePx(mainWidth);

     this.view.xAxis.style.top = helpers.stylePx(mainHeight);
     helpers.setCanvasWidth(this.view.xAxis_ctx,mainWidth);

     helpers.setCanvasWidth(this.view.grid_ctx, mainWidth);
     helpers.setCanvasHeight(this.view.grid_ctx, mainHeight);

     helpers.setCanvasWidth(this.view.main_ctx, mainWidth);
     helpers.setCanvasHeight(this.view.main_ctx, mainHeight);

     //draw frame
     this.view.grid_ctx.beginPath();
     this.view.grid_ctx.moveTo(0, mainHeight);
     this.view.grid_ctx.strokeStyle = "black";
     this.view.grid_ctx.lineTo(mainWidth, mainHeight);
     this.view.grid_ctx.lineTo(mainWidth, 0);
     this.view.grid_ctx.stroke();
}

ChartView.prototype.draw = function(){
    helpers.clearCanvas(this.view.main_ctx);
    helpers.clearCanvas(this.view.grid_ctx);
    helpers.clearCanvas(this.view.xAxis_ctx);
    helpers.clearCanvas(this.view.yAxis_ctx);

    this.charts.forEach(function(el){
        el.draw(this.view, this.options);
    }, this);
}
var drawRequest;
ChartView.prototype.scroll = function(diff){
    this.charts.forEach(function(el){
        el.scroll(diff);
        el.prepareLayout(this.view.width, this.view.height, this.options);
    }, this);
    this.draw();
}

//////////////////////////////////BaseChart////////////////////////////////////////////////
//base constructor for various chart types
//data is array of points could vary for specefic types of charts
//chartOptions have to contain MinStep property with minimal value change for chart and Decimals property standing for decimal multiplier of min step
//ex: value could change for .25 minimally, than MinStep = 25, and decimals = .01
function BaseChart(data, chartOptions){
    this.data = data;
    this.chartOptions = chartOptions;
}
//initializes common parameters of the chart. Sets scale to default.
//Should be called just after chart object creation
BaseChart.prototype.initialize = function(){
    this.scale = 2;

}
//override for calculating min and max values for specific chart types
 //should return object {max, min}
BaseChart.prototype.calculateBounds = function(data, index, count){
    //no op basically

}
//calculates layout parameters for chart
//real min and max, y axis step size, y axis labels array
BaseChart.prototype.calculateLayout = function(data, firstIndex, count, height, width, options){
    var bounds = this.calculateBounds(data, firstIndex, count)
    var max = bounds.max;
    var min = bounds.min;
    if (max == min){
        if (max == 0){
            max = 1;
            min = 0;
        }
        else{
            max = max + Math.sign(max) * .1;
            min = min - Math.sign(min) * .1;
        }
    }


    var maxYSteps = Math.floor(height / options.axisFontSize / 3);

    var diff = max - min;

    var decimals = helpers.getDecimalPlaces(this.chartOptions.Decimals);
    var k = this.chartOptions.MinStep*this.chartOptions.Decimals;
    var evalStep = diff / maxYSteps;

    var logStep = Math.pow(10, helpers.orderOfMagnitude(evalStep));
    var step = Math.floor(Math.ceil(evalStep / logStep) / k) * k;

    var origMin = min,
        origMax = max;
    //correct min and max to have some blank space at the top and the bottom of chart
    var min = min - step - min % step;
    var max = max + step - max % step;

    var yLabels = [];
    var current = min;
    while (current <= max){
        yLabels.push(current.toFixed(decimals));
        current += step;
    }

    return {
        max             : max,
        min             : min,
        origMax         : origMax,
        origMin         : origMin,
        decimals        : decimals,
        yStepSize       : step,
        yLabels         : yLabels
    };
}
//prepares chart to draw. finnaly sets this.layout property with key drawing parameters.
//this.layout should be used to calculate y axis width and canvas dimensions
//height is a height of canvas where chart would be placed (not count x axis heigth or other space)
//width is the width of canvas where chart would be placed (not count x axis heigth or other space)
BaseChart.prototype.prepareLayout = function(width, height, options){
    if (!this.data || !this.data instanceof Array)
        throw new "Invalid data or data isn't array!";

    if (this.data.length <= 1)
        return;

    //oofset by x axis where last candle will be
    if (this.xOffset == undefined)
        this.xOffset = 0;

    //lastIndex - index of last visible candle
    if (this.lastIndex == undefined){
        this.lastIndex = this.data.length - 1;
    }
    //in case, that we display blank space on the right after chart we will get lastIndex out of bound of data
    //so we have to correct lastIndex to be inside data array
    var correction = 0;
    if (this.lastIndex > this.data.length - 1){
        correction = this.lastIndex - this.data.length + 1;
    }

    var visibleLength = Math.min(this.data.length, this.lastIndex + 1);

    var maxElement2Display = Math.max(0, Math.floor(width / this.scale) - correction);
    var firstIndex = 0;
    if (maxElement2Display > 0){
        maxElement2Display = Math.min(visibleLength, maxElement2Display);
        firstIndex = Math.max(0, this.lastIndex - correction - maxElement2Display);
    }

    var count = Math.max(0, maxElement2Display);

    var layout = this.calculateLayout(this.data, firstIndex, count, height, width, options);

    this.layout = layout;
}
//moves chart's last index accordingly to pixelDiff
//should be callued when scrolling chart
BaseChart.prototype.scroll = function(pixelsDiff){
    var xOffset = this.xOffset + pixelsDiff;
    var lastIndex = this.lastIndex;
    if (lastIndex == 0 && xOffset > 0) {
        //no need to scroll further because we see the only point
        this.xOffset = 0;
        return;
    }

    var fullSteps = Math.floor(xOffset / this.scale);
    if (fullSteps != 0){
        xOffset -= fullSteps * this.scale;
        lastIndex -= fullSteps;
    }
    this.xOffset = xOffset;
    this.lastIndex = lastIndex;
    if (this.lastIndex < 0) this.lastIndex = 0;
}
//draws chart on the view object
//options contaqins drawing options for various types
//should be overriden for every specific chart type
BaseChart.prototype.draw = function(view, options){
    //no op basically

}
////////////////////////////////////////BaseChart/////////////////////////////////////////////

///////////////////////////////////////CandleStickChart///////////////////////////////////////
helpers.extend(BaseChart, CandleStickChart);

/**
data is array of CandleStick
options must define properties MinStep, Decimals, TimeStep
*/
function CandleStickChart(data, options){
    CandleStickChart.superclass.constructor.apply(this, arguments);
}

CandleStickChart.prototype.initialize = function(){
    CandleStickChart.superclass.initialize.call(this);

    if (!this.chartOptions.MinStep
        || !this.chartOptions.Decimals
        || !this.chartOptions.TimeStep){
        var minStep = 0;
        var timeStep = null;
        for (var i = 1; i < this.data.length; i++){
            var cur = this.data[i];
            var prev = this.data[i-1];
            var tt = cur.key - prev.key;
            if (!timeStep)
                timeStep = tt;
            if (timeStep > tt) timeStep = tt;
            var a = [];
            var m1 = Math.abs(cur.open - cur.close);
            if (m1 > 0)
                a.push(m1);
            var m2 = Math.abs(cur.high - cur.open);
            if (m2 > 0)
                a.push(m2);
            var m3 = Math.abs(cur.high - cur.close);
            if (m3 > 0)
                a.push(m3);
            var m4 = Math.abs(cur.low - cur.open);
            if (m4 > 0)
                a.push(m4);
            var m5 = Math.abs(cur.low - cur.close);
            if (m5 > 0)
                a.push(m5);
            var m = Math.min.apply(null, a);
            if (!minStep)
                minStep = m;
            if (minStep > m) minStep = m;
        }
        var decimals = Math.pow(10, -helpers.getDecimalPlaces(minStep));
        if (!this.chartOptions.MinStep)
            this.chartOptions.MinStep = Math.round(minStep / decimals);
        if (!this.chartOptions.Decimals)
            this.chartOptions.Decimals = decimals;
        if (!this.chartOptions.TimeStep)
            this.chartOptions.TimeStep = timeStep;
    }
}

CandleStickChart.prototype.calculateBounds = function(data, index, count){
    var max = data[index].high;
    var min = data[index].low;

    for (var i = 1; i < count; i++){
        var item = data[index + i]; //acquire min and max values
        if (item.high > max) max = item.high;
        if (item.low < min) min = item.low;
    }
    return {
        max : max,
        min : min
    };
}

CandleStickChart.prototype.draw  = function(view, options){
    var h = view.mainHeight;
    var w = view.mainWidth;

    if (this.data.length == 0) {
        return; //won't draw if empty array
    }

    var xStep = this.scale;
    xStep = (xStep - xStep%2) || 2; //to have middle

    var x = w - xStep / 2 + this.xOffset; //last candle left border

    var y = 0;
    var ky = h / (this.layout.max - this.layout.min);
    var layout = this.layout;
    var calculateY = function(value){
        return Math.round((layout.max - value)*ky);
    };
    function drawCandle(candle, mid, width, padding, yfunc, context){
        var left = mid - width / 2;
        var maj = candle.open;
        var min = candle.close;
        if (candle.open < candle.close){
            maj = candle.close;
            min = candle.open;
        }
        //Draw shadow
        context.moveTo(helpers.normalizeX(mid), yfunc(candle.high));
        context.lineTo(helpers.normalizeX(mid), yfunc(candle.low));
        if (candle.isNeutral()){
            context.moveTo(helpers.normalizeX(left), yfunc(maj));
            context.lineTo(helpers.normalizeX(left + width), yfunc(maj));
        }
        else{
            context.rect(helpers.normalizeX(left), yfunc(maj), width, yfunc(min)-yfunc(maj));
        }
    };

    //prepare
    var padding = Math.round(0.2 * xStep);
    var width = xStep - 2 * padding;

    //draw dojies, shadows, candle borders, negative candles and x axis marks
    view.main_ctx.beginPath();
    view.main_ctx.strokeStyle = options.ShadowColor;
    view.main_ctx.fillStyle = options.NegativeCandleColor;

    view.xAxis_ctx.beginPath();
    view.xAxis_ctx.textAlign = "center";
    view.xAxis_ctx.textBaseline = "top";
    for (var i = this.lastIndex; i >= 0; i--){
        if (i < this.data.length){
            var item = this.data[i];
            var left = x - xStep / 2 + padding;
            if (item.isNeutral() || item.isNegative()){ //draw full candle
                drawCandle.call(this, item, x, width, padding, calculateY, view.main_ctx);
            }
            //display x axis mark if necessary
            var displayXMark = false;
            var xMark = "";
            var boldMark = false;
            if (i > 0){
                var prev = this.data[i-1];
                var key1 = prev.key;
                var key2 = item.key;
                if (key1.getFullYear() - key2.getFullYear() != 0){
                     displayXMark = true;
                     xMark = key2.getFullYear().toString();
                     boldMark = true;
                }
                else if (key1.getMonth() - key2.getMonth() != 0){
                     displayXMark = true;
                     xMark = helpers.getShortMonthName(key2.getMonth());
                     boldMark = true;
                }
                else if (key1.getDate() - key2.getDate() != 0){
                     //displayXMark = true;
                     xMark = key2.getDate().toString();
                }
            }
            if (displayXMark){
                var markX = x + xStep/2;
                if (boldMark){
                     var font = view.xAxis_ctx.font;
                     //make font bold
                     view.xAxis_ctx.font = "bold "+font;
                     view.xAxis_ctx.fillText(xMark, markX, AXIS_MARK_SIZE);
                     //restore font
                     view.xAxis_ctx.font = font;
                }
                else view.xAxis_ctx.fillText(xMark, markX, AXIS_MARK_SIZE);


                view.xAxis_ctx.moveTo(markX, 0);
                view.xAxis_ctx.lineTo(markX, AXIS_MARK_SIZE);
            }
        }

        if (x < 0) break;
        x -= xStep;
    }
    view.main_ctx.stroke();
    view.main_ctx.fill();
    view.xAxis_ctx.stroke();

    var x = w - xStep / 2 + this.xOffset; //last candle left border
    //draw left positive candles
    view.main_ctx.beginPath();
    view.main_ctx.fillStyle = options.PositiveCandleColor;
    for(var i = this.lastIndex; i >= 0; i--){
        if (i < this.data.length){
            var item = this.data[i];
            if (item.isPositive())
                drawCandle.call(this, item, x, width, padding, calculateY, view.main_ctx);

    }
    if (x < 0) break;
        x -= xStep;
    }
    view.main_ctx.stroke();
    view.main_ctx.fill();

    var priceDot = this.layout.min;

    view.grid_ctx.beginPath();
    view.yAxis_ctx.beginPath();
    view.grid_ctx.strokeStyle = options.gridColor;
    while (priceDot <= this.layout.max){
        y = calculateY(priceDot);
        view.yAxis_ctx.moveTo(0, y);
        view.yAxis_ctx.lineTo(AXIS_MARK_SIZE, y);
        if (priceDot != this.layout.min && priceDot !=this.layout.max)
            view.yAxis_ctx.fillText(priceDot.toFixed(this.layout.decimals), AXIS_MARK_SIZE, y);

        view.grid_ctx.moveTo(0, y);
        view.grid_ctx.lineTo(view.grid_ctx.canvas.width - 3, y);
        priceDot = priceDot + this.layout.yStepSize;
    }
    view.grid_ctx.stroke();
    view.yAxis_ctx.stroke();
}


///////////////////////////////////////CandleStickChart///////////////////////////////////////


///////////////////////////////////////LineChart//////////////////////////////////////////////
helpers.extend(BaseChart, LineChart);

function LineChart(data, options){
    CandleStickChart.superclass.constructor.apply(this, arguments);
}

LineChart.prototype.initialize = function(){
    LineChart.superclass.initialize.call(this);

}

LineChart.prototype.calculateBounds = function(data, index, count){
    var max = data[index];
    var min = data[index];

    for (var i = 1; i < count; i++){
        var item = data[index + i]; //acquire min and max values
        if (item > max) max = item;
        if (item < min) min = item;
    }
    return {
        max : max,
        min : min
    };
}

LineChart.prototype.draw  = function(view, options){

    var h = view.mainHeight;
    var w = view.mainWidth;

    if (this.data.length == 0) {
        return; //won't draw if empty array
    }

    var xStep = this.scale;
    xStep = (xStep - xStep%2) || 2; //to have middle

    var x = w - xStep / 2 + this.xOffset; //last candle left border

    var y = 0;
    var ky = h / (this.layout.max - this.layout.min);
    var layout = this.layout;
    var calculateY = function(value){
        return Math.round((layout.max - value)*ky);
    };

    //draw dojies, shadows, candle borders, negative candles and x axis marks
    view.main_ctx.beginPath();
    view.main_ctx.strokeStyle = options.ShadowColor;

    var first = this.data[this.lastIndex];
    view.main_ctx.moveTo(x, calculateY(first));
    x -= xStep;
    for (var i = this.lastIndex - 1; i >= 0; i--){
        if (i < this.data.length){
            var item = this.data[i];
            view.main_ctx.lineTo(x, calculateY(item))
        }

        if (x < 0) break;
        x -= xStep;
    }
    view.main_ctx.stroke();


    var priceDot = this.layout.min;

    view.grid_ctx.beginPath();
    view.yAxis_ctx.beginPath();
    view.grid_ctx.strokeStyle = options.gridColor;
    while (priceDot <= this.layout.max){
        y = calculateY(priceDot);
        view.yAxis_ctx.moveTo(0, y);
        view.yAxis_ctx.lineTo(AXIS_MARK_SIZE, y);
        if (priceDot != this.layout.min && priceDot !=this.layout.max)
            view.yAxis_ctx.fillText(priceDot.toFixed(this.layout.decimals), AXIS_MARK_SIZE, y);

        view.grid_ctx.moveTo(0, y);
        view.grid_ctx.lineTo(view.grid_ctx.canvas.width - 3, y);
        priceDot = priceDot + this.layout.yStepSize;
    }
    view.grid_ctx.stroke();
    view.yAxis_ctx.stroke();
}

///////////////////////////////////////LineChart//////////////////////////////////////////////
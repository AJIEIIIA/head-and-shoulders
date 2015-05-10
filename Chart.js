/*
todo при максимальном скролле влево почему то последняя метка по оси Х перескакивает вперед на 2 свечки
todo 3й канвас для вывода свечей
todo несколько графиков пользуются одним layout - merge layout. grid - отдельный объект?
todo несколько панелей с графиками - возможность добавления индикаторов под освновной график. Объект PriceChart. Возможно канвасы стоит засунуть в  метод draw каждого графика? Получается сильная связность представления и логики
todo неправильно учитываются опции на графике. Опции берутся те, что заданы в начале при создании ChartView, а надо использовать для каждого графика свои
todo Почему то при scale = 2 получается, что свечки друг на друга залезают и последняя свечка уходит половинкой за ось У
todo Разобраться с .5 для линий. Как рисовать так чтобы было красиво?
todo Перерисовка графика - добавить возможность добавлять и обновлять свечки.
todo Учесть возможность добавления истории в начало графика
todo Курсор выделения свечей (Переходим на систему вычисление координаты Х из вермени?)
todo 30 fps на планшете - следующая цель - 60
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
    //sets strictness of min and max values on chart.
    //if true chart bounds base on min and max values in data array
    //if false adds step to min and max
    StrictMin                   : false,
    StrictMax                   : false,
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
//represents basic chart period types
var CHART_PERIOD_TYPES = {
    Minute  : "m",
    Hour    : "h",
    Day     : "d",
    Week    : "w",
    Month   : "M",
    Year    : "y"
};


var AXIS_MARK_SIZE = 3; //3 px for axis mark

//helper methods
var helpers = {};

helpers.isRoundDate = function(date, periodType, period){
    switch(periodType){
        case CHART_PERIOD_TYPES.Minute:
        break;
        case CHART_PERIOD_TYPES.Hour:
        break;
        case CHART_PERIOD_TYPES.Day:
        case CHART_PERIOD_TYPES.Week:
        break;
        case CHART_PERIOD_TYPES.Month:
        break;
        case CHART_PERIOD_TYPES.Year:
        break;
        default:
        return false;
    }
}

helpers.xLabelUtility = function(freq, periodType, period){
    var step;
    var testPeriod = period;
    switch(periodType){
        case CHART_PERIOD_TYPES.Minute:
            step = 60/testPeriod; //60 minutes = hour. hour is target bigger mark fro minute
            if (step >= freq){
                return {
                    selector    : function(d1, d2){return d1.getHour() != d2.getHour();},
                    frequency   : Math.round(step / freq)
                };
            }
            else testPeriod = testPeriod / 60;  //how much in hours
        case CHART_PERIOD_TYPES.Hour:
            var step = 24 / testPeriod; //24 hour per day. day is terget bigger mark for hour
            if (step >= freq){
                return {
                    selector    : function(d1, d2){return d1.getDay() != d2.getDay();},
                    frequency   : Math.round(step / freq)
                }
            }
            else testPeriod = testPeriod / 24; //how much in days
        case CHART_PERIOD_TYPES.Week:
            testPeriod = testPeriod * 7;
        case CHART_PERIOD_TYPES.Day:
            var step = 21 / testPeriod; //21 working day in month. month is terget bigger mark for day
            if (step >= freq){
                return {
                    selector    : function(d1, d2){return d1.getMonth() != d2.getMonth();},
                    frequency   : Math.round(step / freq)
                }
            }
            else testPeriod = testPeriod / 21; //how much in months
        case CHART_PERIOD_TYPES.Month:
            var step = 12 / testPeriod; //12 months in year. year is terget bigger mark for month
            if (step >= freq){
                return {
                    selector    : function(d1, d2){return d1.getYear() != d2.getYear();},
                    frequency   : Math.round(step / freq)
                }
            }
            else testPeriod = testPeriod / 12; //how much in years
        case CHART_PERIOD_TYPES.Year:
            var decades = 10;
            while (true){
                step = decades / testPeriod;
                if (step >= freq){
                    return {
                        selector    : function(d1, d2){return d1.getFullYear()/decades != d2.getFullYear()/decades;},
                        frequency   : Math.round(step / freq)
                    }
                }
                else decades += 10;
            }
        default:
            return {
                selector    : function(d1, d2){return false;},
                frequency   : 1
            };
    }
}

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
          ctx.canvas.height = height * window.devicePixelRatio;
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
     }
}

helpers.setCanvasWidth = function(ctx, width){
     if (window.devicePixelRatio) {
          ctx.canvas.style.width = width + "px";
          ctx.canvas.width = width * window.devicePixelRatio;
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
     }
}

helpers.clearCanvas = function(ctx, width, height){
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//    return;
//    var canvas = ctx.canvas;
//    canvas.width = canvas.width;
//    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    return;
    if (width)
        helpers.setCanvasWidth(ctx, width);
    else helpers.setCanvasWidth(ctx, ctx.canvas.width);
    return;

    if (width && height)
        ctx.clearRect(0, 0, width, height);
    else ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
//Adds .5 to floor of x;
helpers.normalizeX = function(x){
     return ~~(x) + .5;
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

helpers.requestAnimationFrame = function(){
    return window.webkitRequestAnimationFrame ||
    		window.mozRequestAnimationFrame ||
    		window.oRequestAnimationFrame ||
    		window.msRequestAnimationFrame ||
    		window.requestAnimationFrame ||
    		function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {

    			window.setTimeout( callback, 1000 / 60 );

    		};
}


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

Chart.Bar = function(data, barChartOptions){
    var bc = new BarChart(data, barChartOptions);
     bc.initialize();
     this.presenter.setChart(bc);
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
    var time;
    var scrollHandler = function (event) {
        if (mouseDown) {
            event.preventDefault();
            var x = event.clientX;
            //scrolling
            if (frame)
                cancelAnimationFrame(frame);

            frame = helpers.requestAnimationFrame()(function () {
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

                frame = helpers.requestAnimationFrame()(function () {
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

ChartView.prototype.fitView = function(reset){
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
    helpers.clearCanvas(this.view.main_ctx, this.view.mainWidth, this.view.mainHeight);
    helpers.clearCanvas(this.view.grid_ctx, this.view.mainWidth, this.view.mainHeight);
    helpers.clearCanvas(this.view.xAxis_ctx, this.view.mainWidth, this.bottomHeight);
    helpers.clearCanvas(this.view.yAxis_ctx, this.view.width - this.view.mainWidth, this.view.mainHeight);

    for (var i = 0; i < this.charts.length; i++)
        this.charts[i].draw(this.view, this.options);

}
var drawRequest;
ChartView.prototype.scroll = function(diff){
    for (var i = 0; i < this.charts.length; i++){
        var el = this.charts[i];
        el.scroll(diff);
        el.prepareLayout(this.view.width, this.view.height, this.options);
    }
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
    this.scale = 4;

}
//override for calculating min and max values for specific chart types
 //should return object {max, min}
BaseChart.prototype.calculateBounds = function(index, count){
    //no op basically

}
//calculates layout parameters for chart
//real min and max, y axis step size, y axis labels array
BaseChart.prototype.calculateLayout = function(data, firstIndex, count, height, width, options){
    var bounds = this.calculateBounds(firstIndex, count)
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


    var maxYSteps = Math.floor(height / options.axisFontSize / 2);

    var diff = max - min;

    var decimals = helpers.getDecimalPlaces(this.chartOptions.Decimals);
    var k = this.chartOptions.MinStep*this.chartOptions.Decimals;
    var evalStep = diff / maxYSteps;

    var logStep = Math.pow(10, helpers.orderOfMagnitude(evalStep));

    var steps = diff / logStep;
    while(2 * steps > maxYSteps){
        logStep *= 2;
        var steps = diff / logStep;
    }
    var step = Math.floor(logStep / k) * k;

    var origMin = min,
        origMax = max;
    //correct min and max to have some blank space at the top and the bottom of chart
    if (!options.StrictMin){
        var tail = min % step;
        if (tail < step / 2) tail += step;
        min = min - tail;
    }
    if (!options.StrictMax){
        var tail = step - max % step;
        if (tail < step / 2) tail += step;
        max = max + tail;
    }

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

CandleStickChart.prototype.calculateBounds = function(index, count){
    var max = this.data[index].high;
    var min = this.data[index].low;

    for (var i = 1; i < count; i++){
        var item = this.data[index + i]; //acquire min and max values
        if (item.high > max) max = item.high;
        if (item.low < min) min = item.low;
    }
    return {
        max : max,
        min : min
    };
}

CandleStickChart.prototype.calculateLayout = function(data, firstIndex, count, height, width, options){
    var layout = CandleStickChart.superclass.calculateLayout.apply(this, arguments);

    var freq = 40 / this.scale;

    var utility = helpers.xLabelUtility(freq, this.chartOptions.ChartPeriodType, this.chartOptions.ChartPeriod);
    var prev = data[firstIndex];
    var curr;
    var labels = [];
    var lastLabelIndex = firstIndex - 1;
    for (var i = firstIndex + 1; i < count + firstIndex; i++){
        curr = data[i];
        if (utility.selector(prev.key, curr.key)){
            for (var j = utility.frequency - 1; j > 0; j--){
                var index = Math.floor(i - j * freq);
                if (index > lastLabelIndex) labels.push({
                                                label   : data[index].key,
                                                index   : index
                                            });

            }
            labels.push({
                label   : curr.key,
                index   : i
            });
            lastLabelIndex = i;
        }
        prev = curr;
    }

    for (var j = 1; j < utility.frequency; j++) {
        var index = Math.floor(lastLabelIndex + j * freq);
        if (index < count + firstIndex) labels.push({
                                label   : data[index].key,
                                index   : index
                            });
    }
    layout.xLabels = labels;
    return layout;

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

    //prepare
    var padding = Math.round(0.2 * xStep);
    var width = xStep - 2 * padding;

    //draw dojies, shadows, candle borders, negative candles and x axis marks
    var context = view.main_ctx;
    context.beginPath();
    context.strokeStyle = options.ShadowColor;
    context.fillStyle = options.NegativeCandleColor;
    var context2 = view.grid_ctx;
    context2.beginPath();
        context2.strokeStyle = options.ShadowColor;
        context2.fillStyle = options.PositiveCandleColor;


    var font = helpers.makeFont(options.axisFontSize, options.axisFont);
    view.xAxis_ctx.font = font;
    var maj, min;
    var bolded = false;

    for (var i = this.lastIndex; i >= 0; i--){
        if (i < this.data.length){
            var item = this.data[i];
            var left = x - width / 2;

            context.moveTo(helpers.normalizeX(x), calculateY(item.high));
            context.lineTo(helpers.normalizeX(x), calculateY(item.low));
            if (item.isNegative()){
                maj = item.close;
                            min = item.open;
                context.rect(helpers.normalizeX(left), calculateY(maj), width, Math.round(ky*(maj - min)));
            }
            else if (item.isNeutral()){
            maj = item.close;
                        min = item.open;
                context.moveTo(helpers.normalizeX(left), calculateY(maj));
                context.lineTo(helpers.normalizeX(left + width), calculateY(maj));
            }
            else if (item.isPositive()){
            maj = item.open;
                        min = item.close;
                       context2.rect(helpers.normalizeX(left), calculateY(maj), width, Math.round(ky*(maj - min)));

            }
        }

        if (x < 0) break;
        x -= xStep;
    }
    view.main_ctx.stroke();
    view.main_ctx.fill();
    context2.stroke();
    context2.fill();

    view.xAxis_ctx.beginPath();
    view.xAxis_ctx.textAlign = "center";
    view.xAxis_ctx.textBaseline = "top";
    view.grid_ctx.beginPath();
    view.grid_ctx.strokeStyle = options.gridColor;
    x = w - xStep / 2 + this.xOffset; //last candle left border
    for (var i = layout.xLabels.length - 1; i >= 0; i--){
        var lab = layout.xLabels[i];
        var markX = x - (this.lastIndex - lab.index) * xStep;
        view.xAxis_ctx.moveTo(markX, 0);
        view.xAxis_ctx.lineTo(markX, AXIS_MARK_SIZE);
        var text = lab.label.getDate() + " " + helpers.getShortMonthName(lab.label.getMonth());
        view.xAxis_ctx.fillText(text, markX, AXIS_MARK_SIZE);
        view.grid_ctx.moveTo(markX, 0);
        view.grid_ctx.lineTo(markX, view.grid_ctx.canvas.height);
    }

    var priceDot = this.layout.min;

    view.yAxis_ctx.beginPath();
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
    view.xAxis_ctx.stroke();
    view.yAxis_ctx.stroke();
}


///////////////////////////////////////CandleStickChart///////////////////////////////////////


///////////////////////////////////////LineChart//////////////////////////////////////////////
helpers.extend(BaseChart, LineChart);

function LineChart(data, options){
    LineChart.superclass.constructor.apply(this, arguments);
}

LineChart.prototype.initialize = function(){
    LineChart.superclass.initialize.call(this);

}

LineChart.prototype.calculateBounds = function(index, count){
    var max = this.data[index];
    var min = this.data[index];

    for (var i = 1; i < count; i++){
        var item = this.data[index + i]; //acquire min and max values
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

////////////////////////////////////////BarChart//////////////////////////////////////////////
helpers.extend(BaseChart, BarChart);

function BarChart(data, options){
    BarChart.superclass.constructor.apply(this, arguments);
}

BarChart.prototype.initialize = function(){
    BarChart.superclass.initialize.call(this);

}

BarChart.prototype.calculateBounds = function(index, count){
    var max = this.data[index];
    var min = 0;

    for (var i = 1; i < count; i++){
        var item = this.data[index + i]; //acquire min and max values
        if (item > max) max = item;
        if (item < min) min = item;
    }
    return {
        max : max,
        min : min
    };
}

BarChart.prototype.draw = function(view, options){
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
     //prepare
    var padding = Math.round(0.2 * xStep);
    var width = xStep - 2 * padding;

    //draw dojies, shadows, candle borders, negative candles and x axis marks
    view.main_ctx.beginPath();
    view.main_ctx.strokeStyle = options.ShadowColor;
    view.main_ctx.fillStyle = options.PositiveCandleColor;

    view.xAxis_ctx.beginPath();
    view.xAxis_ctx.textAlign = "center";
    view.xAxis_ctx.textBaseline = "top";
    for (var i = this.lastIndex; i >= 0; i--){
        if (i < this.data.length){
            var item = this.data[i];
            var rectH = calculateY(item);
            view.main_ctx.rect(helpers.normalizeX(x), calculateY(item), xStep, calculateY(0) - calculateY(item));
        }

        if (x < 0) break;
        x -= xStep;
    }
    view.main_ctx.fill();
    view.main_ctx.stroke();
    view.xAxis_ctx.stroke();

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

////////////////////////////////////////BarChart//////////////////////////////////////////////

////////////////////////////////////////PriceChart//////////////////////////////////////////////
helpers.extend(BaseChart, PriceChart);

function PriceChart(data, options){
    BaseChart.superclass.constructor.apply(this, arguments);
    var candles = data.map(function(c){return new CandleStick(c.key, c.open, c.high, c.low, c.close);});
    var volumes = data.map(function(c){return c.volume;});
    this.priceChart = new CandleStickChart(data, options);
    this.volumeChart = new BarChart(volumes, options);
}

PriceChart.prototype.initialize = function(){
    this.priceChart.initialize();
    this.volumeChart.initialize();
}

PriceChart.prototype.calculateBounds = function(index, count){
    return this.priceChart.calculateBounds(index, count);
}

PriceChart.prototype.draw = function(view, options){

}
////////////////////////////////////////PriceChart//////////////////////////////////////////////

function SimpleMovingAverage(data, parameter){
    var ma = [];
    var sum = 0;
    var n = parameter - 1;
    for (var i=0; i < data.length; i++){
        sum += data[i];
        if (i < n)
            ma.push(null);
        else{
            ma.push(sum/parameter);
            sum -= data[i-n];
        }
    }
    return ma;
}

function ExponentialMovingAverage(data, parameter){
    var ema = [];
    var sum = 0;
    var n = parameter - 1;
    for (var i = 0; i < data.length; i++){
        sum += data[i];
        if (i < n)
            ema.push(null);
        else{
            if (i == n)
                ema.push(sum/parameter);
            else{

            }
            sum -= data[i-n];
        }
    }
}


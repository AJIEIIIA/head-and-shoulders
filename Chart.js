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

helpers.getMaximumWidth = function(domNode) {
  var container = domNode.parentNode;
  // TODO = check cross browser stuff with this.
  return container.clientWidth;
};

helpers.getMaximumHeight = function(domNode) {
  var container = domNode.parentNode;
  // TODO = check cross browser stuff with this.
  return container.clientHeight;
};

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


/*
CandleStickChart
props:
ctx - 2d context of html5 canvas
position - position of scrollbar
scaleFactor: 1 - display whole dataset,  < 1 same as 1, > 1
*/

var Chart = {};

Chart.create = function(width, height, data, options){
    if (data.length < 2)
        return null;

     var csc = new CandleStickChart(width, height, data, options);
     csc.initialize();
     Chart.current = csc;
     
     return csc;
}

function CandleStickChart(width, height, data, options, chartOptions){
     this.options = helpers.merge(options, OPTIONS_DEFAULT);
     this.data = data;
     this.width = width;
     this.height = height;
     this.scale = INITIAL_SCALE;

}

CandleStickChart.prototype.initialize = function(){
    //this.scale = 2;
    if (!this.options.MinStep
        || !this.options.Decimals
        || !this.options.TimeStep){
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
        if (!this.options.MinStep)
            this.options.MinStep = Math.round(minStep / decimals);
        if (!this.options.Decimals)
            this.options.Decimals = decimals;
        if (!this.options.TimeStep)
            this.options.TimeStep = timeStep;
    }
    this.initializeView();
    this.prepareLayout();
    this.fitView();
    //helpers.fillCanvas(this.view.grid_ctx, "yellow");
    //helpers.fillCanvas(this.view.main_ctx, "blue");
    //helpers.fillCanvas(this.view.xAxis_ctx, "Red");
    //helpers.fillCanvas(this.view.yAxis_ctx, "Green");
}

CandleStickChart.prototype.initializeView = function(){     
     this.view = {
          container : document.createElement("div"),
          main : document.createElement("canvas"),
          grid : document.createElement("canvas"),
          xAxis : document.createElement("canvas"),
          yAxis : document.createElement("canvas")
     };
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

           Chart.current.scroll(x - startX);
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

           Chart.current.scroll(x - startX);
           startX = x;
         });
	    }
	}
	
     });

     helpers.registerEvent(this.view.main, "mousemove", scrollHandler);

  var cw = cont.offsetWidth;
    
     helpers.registerEvent(window, "resize", function (event) {

     return;
       if (frame)
         cancelAnimationFrame(frame);
       //var h = document.body.offsetHeight;
       //var w = document.body.offsetWidth;
       var h = window.innerHeight;
       var w = window.innerWidth;


       if (currH == h && currW == w) return;

       frame = requestAnimationFrame(function () {
         Chart.current.resize(currW, currH, w, h);
         currH = h;
         currW = w;
         cw = cont.offsetWidth;
       });
     });
}


CandleStickChart.prototype.fitView = function(){
    
    //layout container
     this.view.container.style.width = helpers.stylePx(this.width);
     this.view.container.style.height = helpers.stylePx(this.height);

     //correct dimensions and setup canvas
     helpers.setCanvasWidth(this.view.yAxis_ctx, this.layout.yWidth);
     helpers.setCanvasHeight(this.view.yAxis_ctx, this.layout.mainHeight);
     this.view.yAxis.style.left = helpers.stylePx(this.width - this.layout.yWidth);
     
     this.view.xAxis.style.top = helpers.stylePx(this.layout.mainHeight);
     helpers.setCanvasWidth(this.view.xAxis_ctx, this.layout.mainWidth);
     
     helpers.setCanvasWidth(this.view.grid_ctx, this.layout.mainWidth);
     helpers.setCanvasHeight(this.view.grid_ctx, this.layout.mainHeight);
     
     helpers.setCanvasWidth(this.view.main_ctx, this.layout.mainWidth);
     helpers.setCanvasHeight(this.view.main_ctx, this.layout.mainHeight);
     
     //draw frame
     this.view.grid_ctx.beginPath();
     this.view.grid_ctx.moveTo(0, this.layout.mainHeight);
     this.view.grid_ctx.strokeStyle = "black";
     this.view.grid_ctx.lineTo(this.layout.mainWidth, this.layout.mainHeight);
     this.view.grid_ctx.lineTo(this.layout.mainWidth, 0);
     this.view.grid_ctx.stroke();
}

CandleStickChart.prototype.scrollLayout = function(indexMove){
    var recalc = false;
    if (indexMove > 0){ //scroll left
        var prevLastIndex = this.lastIndex - indexMove;
        for (var i = prevLastIndex; i < this.lastIndex && this.lastIndex < this.data.length; i++){
            var item = this.data[i];
            if (item.high > this.layout.origMax)
                recalc = true;
            if (item.low < this.layout.origMin)
                recalc = true;
        }
        if (recalc){
            var lastIndex = Math.min(this.data.length - 1, this.lastIndex);
            var count = layout.mainWidth
            this.layout = calculateLayout(this.data, t)
        }
    }
}

CandleStickChart.prototype.calculateLayout = function(data, startIndex, count){
    var max = data[startIndex].high;
    var min = data[startIndex].low;

    for (var i = 1; i < count; i++){
        var item = data[startIndex + i]; //acquire min and max values
        if (item.high > max) max = item.high;
        if (item.low < min) min = item.low;
    }

    var mainHeight = this.height - this.bottomHeight;
    var maxYSteps = Math.floor(mainHeight / this.options.axisFontSize / 3);

    var diff = max - min;

    var decimals = helpers.getDecimalPlaces(this.options.Decimals);
    var k = this.options.MinStep*this.options.Decimals;
    var evalStep = diff / maxYSteps;

    var logStep = Math.pow(10, helpers.orderOfMagnitude(evalStep));
    var step = Math.floor(Math.ceil(evalStep / logStep) / k) * k;

    var origMin = min,
        origMax = max;
    //correct min and max to have some blank space at the top and the bottom of chart
    var min = min - min % step;
    var max = max + step - max % step;

    var yLables = [];
    var current = min;
    while (current <= max){
        yLables.push(current.toFixed(decimals));
        current += step;
    }
    //calculate width item.keyof y width, multiply it by 1.1 to make it 10 percent wider for
    var yWidth = Math.round(helpers.longestText(this.view.yAxis_ctx, yLables) * 1.1 + AXIS_MARK_SIZE + 2);

    var mainWidth = Math.floor(this.width - yWidth);
    //align to integer
    yWidth = this.width - mainWidth;


    return {
        max             : max,
        min             : min,
        origMax         : origMax,
        origMin         : origMin,
        decimals        : decimals,
        yStepSize       : step,
        mainWidth       : mainWidth,
        mainHeight      : mainHeight,
        yWidth 	        : yWidth,
        yLabels         : yLables
    };

}

CandleStickChart.prototype.prepareLayout = function(){
    if (this.data.length <= 1)
        return;

    //oofset by x axis where last candle will be
    if (this.xOffset == undefined)
        this.xOffset = 0;

    //lastIndex - index of last visible candle
    if (this.lastIndex == undefined){
        this.lastIndex = this.data.length - 1;
    }
    var maxElement2Display = Math.floor(this.width / this.scale);

    var correction = 0;
    //in case, that we display blank space on the right after chart we will get lastIndex out of bound of data
    //so we have to correct lastIndex to be inside data array
    if (this.lastIndex > this.data.length - 1){
        correction = this.lastIndex - this.data.length + 1;
    }

    var firstIndex = Math.max(0, this.lastIndex- maxElement2Display);
    var count = Math.max(0, maxElement2Display - correction);

    var layout = this.calculateLayout(this.data, firstIndex, count);

    this.layout = layout;
}


CandleStickChart.prototype.draw = function(){
    helpers.clearCanvas(this.view.main_ctx);
    helpers.clearCanvas(this.view.grid_ctx);
    helpers.clearCanvas(this.view.xAxis_ctx);
    helpers.clearCanvas(this.view.yAxis_ctx);
    
     var h = this.layout.mainHeight;    
     var w = this.layout.mainWidth;
 
     if (this.data.length == 0) {
         drawTextInTheMiddle(this.ctx, "No data", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
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
               //context.fill();
          }
     };
     
     //prepare
     var padding = Math.round(0.2 * xStep);
          var width = xStep - 2 * padding;
     
     //draw dojies, shadows, candle borders, negative candles and x axis marks
     this.view.main_ctx.beginPath();
     this.view.main_ctx.strokeStyle = this.options.ShadowColor;
     this.view.main_ctx.fillStyle = this.options.NegativeCandleColor;
     
     this.view.xAxis_ctx.beginPath();
     this.view.xAxis_ctx.textAlign = "center";
    this.view.xAxis_ctx.textBaseline = "top";
     for (var i = this.lastIndex; i >= 0; i--){
	if (i < this.data.length){
	    var item = this.data[i];
	    var left = x - xStep / 2 + padding;
	    if (item.isNeutral() || item.isNegative()){ //draw full candle		
		drawCandle.call(this, item, x, width, padding, calculateY, this.view.main_ctx);
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
                         var font = this.view.xAxis_ctx.font;
                         //make font bold
                         this.view.xAxis_ctx.font = "bold "+font;
                         this.view.xAxis_ctx.fillText(xMark, markX, AXIS_MARK_SIZE);
                         //restore font
                         this.view.xAxis_ctx.font = font;                         
                    }
                    else this.view.xAxis_ctx.fillText(xMark, markX, AXIS_MARK_SIZE);
                    
                    
                    this.view.xAxis_ctx.moveTo(markX, 0);
                    this.view.xAxis_ctx.lineTo(markX, AXIS_MARK_SIZE);
               }
	}
	
	  if (x < 0) break;
          x -= xStep;
     }
     this.view.main_ctx.stroke();
     this.view.main_ctx.fill();
    this.view.xAxis_ctx.stroke();
     
     var x = w - xStep / 2 + this.xOffset; //last candle left border
     //draw left positive candles
     this.view.main_ctx.beginPath();
     this.view.main_ctx.fillStyle = this.options.PositiveCandleColor;
     for(var i = this.lastIndex; i >= 0; i--){
          if (i < this.data.length){
               var item = this.data[i];
	       if (item.isPositive())
		drawCandle.call(this, item, x, width, padding, calculateY, this.view.main_ctx);
               
          }
	  if (x < 0) break;
          x -= xStep;
     }
     this.view.main_ctx.stroke();
     this.view.main_ctx.fill();
     
     var priceDot = this.layout.min;

     this.view.grid_ctx.beginPath();
     this.view.yAxis_ctx.beginPath();
     this.view.grid_ctx.strokeStyle = this.options.gridColor;
     while (priceDot <= this.layout.max){
          y = calculateY(priceDot);
          this.view.yAxis_ctx.moveTo(0, y);
          this.view.yAxis_ctx.lineTo(AXIS_MARK_SIZE, y);
          if (priceDot != this.layout.min && priceDot !=this.layout.max)
               this.view.yAxis_ctx.fillText(priceDot.toFixed(this.layout.decimals), AXIS_MARK_SIZE, y);
          
          this.view.grid_ctx.moveTo(0, y);
          this.view.grid_ctx.lineTo(this.view.grid_ctx.canvas.width - 3, y);
          priceDot = priceDot + this.layout.yStepSize; 
     }
     this.view.grid_ctx.stroke();
     this.view.yAxis_ctx.stroke();
}

CandleStickChart.prototype.scroll = function(diff){
     this.xOffset += diff;
     var fullSteps = Math.floor(this.xOffset / this.scale);
     if (fullSteps != 0){
          this.xOffset -= fullSteps * this.scale;
          this.lastIndex -= fullSteps;
     }
     
     if (this.lastIndex < 0) this.lastIndex = 0;

     this.prepareLayout();
     this.draw();     
}

CandleStickChart.prototype.resize = function(width, height) {
    
     this.width = width;
     this.height = height;
     this.prepareLayout();
     this.fitView();
     this.draw();
}

//}).call(this);


CandleStickChart.prototype.setScale = function(scale){
    if (scale == undefined)
        scale = 1;
    if (scale <= 0)
        throw new RangeError("unexpected scale value. scale must be greater than zero");
}

CandleStickChart.prototype.clear = function(){
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx_grid.clearRect(0, 0, this.ctx_grid.canvas.width, this.ctx_grid.canvas.height);
    this.ctx_prices.clearRect(0, 0, this.ctx_prices.canvas.width, this.ctx_prices.canvas.height);
    this.ctx_dates.clearRect(0, 0, this.ctx_dates.canvas.width, this.ctx_dates.canvas.height);
}

function addCandle(candle){
    var redraw = false;
    if (this.lastIndex >=  this.data.length - 1){
        redraw = true; //need to redraw, we're snapped to last candle
        this.lastIndex++;
    }
    this.data.push(candle);
    return redraw;
}

function updateCandle(index, candle){
    var redraw = isVisibleCandle.call(this, index);
    var candle2update = this.data[index];
    candle2update.update(candle);
    return redraw;
}
//inserts candle before index
function insertCandle(index, candle){
    this.lastIndex++; //increment lastIndex cuz we will insert new candle
    this.data.splice(index, 0, candle);
    var redraw = isVisibleCandle.call(this, index);
    return redraw;
}

CandleStickChart.prototype.update = function(candle){
    var redraw = false;
    if (this.data.length == 0 || this.data.last().key < candle.key){
        redraw = addCandle.call(this, candle);
    }
    else{
        var targetIndex = findKeyIndex.call(this.data, candle, function(candle, targetKey){
            if (candle.key > targetKey) return 1;
            if (candle.key < targetKey) return -1;
            return 0;
        });
        if (targetIndex < 0){
            //Стрранные дела, не нашли кандела
            var targetIndex = ~targetIndex;
            if (targetIndex == this.data.length)
                redraw = addCandle.call(this, candle);
            else redraw = insertCandle.call(this, targetIndex, candle);
        }
        else{
            redraw = updateCandle.call(this, targetIndex, candle);
        }
    }
    function doRedraw(){
        this.clear();
        this.draw();
    }

    if (redraw) requestAnimationFrame(doRedraw.bind(this));
}
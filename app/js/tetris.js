angular.module('myApp', [])
  .run(['$translate', '$log', 'realTimeService', 'randomService',
      function ($translate, $log, realTimeService, randomService) {
'use strict';

// Constants
var canvasWidth = 200;
var canvasHeight = 400;
//var boardHeight;
//Lets save the cell width in a variable for easy control
var cellWidth = 20;
var cellHeight = 20;
var colsNum = canvasWidth / cellWidth;
var rowsNum = canvasHeight / cellHeight;
var drawEveryMilliseconds = 400;

// There are 1-8 players.
// Colors:
// black: canvas borders
// white: canvas background
var playerColor = [
  'blue', 'red', 'brown', 'purple',
  'pink', 'yellow', 'orange', 'silver',
];

function createCanvasController(canvas) {
  $log.info("createCanvasController for canvas.id=" + canvas.id);
  var isGameOngoing = false;
  var isSinglePlayer = false;
  var playersInfo = null;
  var yourPlayerIndex = null;
  var matchController = null;

  // Game state
  //var allTetris; 
  var allScores;
  var pieceCreatedNum;
  var board = []; // store the whole board, indicates cell that is not elimated

  var piece  = {};  // current piece {shape : shape, x : x, y : y, index : index }
              // shape is 4x4 array, x and y is the cordinate, index indicates what kind of shape in shapes

  //all the shapes
  var shapes =  [[ 1, 1, 1, 1 ],
                 [ 1, 1, 1, 0,
                   1 ],
                 [ 1, 1, 1, 0,
                   0, 0, 1 ],
                 [ 1, 1, 0, 0,
                   1, 1 ],
                 [ 1, 1, 0, 0,
                   0, 1, 1 ],
                 [ 0, 1, 1, 0,
                   1, 1 ],
                 [ 0, 1, 0, 0,
                   1, 1, 1 ]];
  //shap colors
  var shapeColor = [
    'cyan', 'orange', 'blue', 'yellow', 'red', 'green', 'purple'
  ];
  var startMatchTime; // For displaying a countdown.
  

  function init() {
    for (var y = 0; y < rowsNum; ++y) {
      board[y] = [];
      for (var x = 0; x < colsNum; ++x) {
        board[y][x] = 0;
      }
    }
  }

  function gotStartMatch(params) {
    yourPlayerIndex = params.yourPlayerIndex;
    playersInfo = params.playersInfo;
    matchController = params.matchController;
    isGameOngoing = true;
    isSinglePlayer = playersInfo.length === 1;

    pieceCreatedNum = 0;
    allScores = [];
    for (var index = 0; index < playersInfo.length; index++) {
      allScores[index] = 0;
    }
    init();
    createPiece();
    startMatchTime = new Date().getTime();
    setDrawInterval();
  }

  function gotMessage(params) {
    var fromPlayerIndex = params.fromPlayerIndex;
    var messageString = params.message;
    // {p: pieceCreatedNum, s: score}
    // The array representing the cells of a player's snake.
    var messageObject = angular.fromJson(messageString);
    allScores[fromPlayerIndex] = messageObject.s;
    //while (pieceCreatedNum < messageObject.p) {
      //createPiece();
    //}
  }

  function gotEndMatch(endMatchScores) {
    // Note that endMatchScores can be null if the game was cancelled (e.g., someone disconnected).
    allScores = endMatchScores;
    isGameOngoing = false;
    stopDrawInterval();
  }

  function sendMessage(isReliable) {
    if (isSinglePlayer || !isGameOngoing) {
      return; // No need to send messages if you're the only player or game is over.
    }
    var messageString = angular.toJson(
        {p: pieceCreatedNum, s: allScores[yourPlayerIndex]});
    if (isReliable) {
      matchController.sendReliableMessage(messageString);
    } else {
      matchController.sendUnreliableMessage(messageString);
    }
  }

  function lostMatch() {
    if (!isGameOngoing) {
      return;
    }
    isGameOngoing = false;
    matchController.endMatch(allScores);
  }

  //Lets create the Shape now
  function createPiece() {
    var index = randomService.randomFromTo(pieceCreatedNum * 2, 0, shapes.length);
    var temp = shapes[index];
    var shape = [];

    for (var y = 0; y < 4; ++y) {
      shape[y] = [];
      for (var x = 0; x < 4; ++x) {
        var i = 4 * y + x;
        if (typeof temp[i] !== 'undefined' && temp[i]) {
          shape[y][x] = 1;
        } else {
          shape[y][x] = 0;
        }
      }
    }

    piece.shape = shape;
    piece.x = 4;
    piece.y = 0;
    piece.index = index;

    pieceCreatedNum++;
  }
  
  // checks if the resulting position of current piece will be feasible
  // if piece hit the bottom or other pieces it will be fixed
  function valid(offsetX, offsetY, newShape) {
    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    offsetX = piece.x + offsetX;
    offsetY = piece.y + offsetY;
    newShape = newShape || piece.shape;
 
    for (var y = 0; y < 4; ++y) {
      for (var x = 0; x < 4; ++x) {
        if (newShape[y][x]) {
          if (typeof board[y + offsetY] === 'undefined' ||
              typeof board[y + offsetY][x + offsetX] === 'undefined' ||
              board[y + offsetY][x + offsetX] ||
              x + offsetX < 0 ||
              y + offsetY >= rowsNum ||
              x + offsetX >= colsNum ) {
            // lose if the current shape at the top row when checked
            if (offsetY === 1){
              lostMatch();
            } 
            return false;
          }
        }
      }
    }
    return true;
  }
  // keep the element moving down, creating new piece and clearing lines
  function tick() {
    if (valid(0, 1)) {
      ++piece.y;
    } else {
      freeze();
      clearLines();
      createPiece();
    }
  }

  // fix piece at its position and update the board
  function freeze() {
    for (var y = 0; y < 4; ++y) {
      for (var x = 0; x < 4; ++x) {
        if (piece.shape[y][x]) {
          board[y + piece.y][x + piece.x] = piece.shape[y][x];
        }
      }
    }
  }

  // check if any lines are filled, clear them and increase score
  function clearLines() {
    for (var y = rowsNum - 1; y >= 0; --y) {
      var rowFilled = true;
      for ( var x = 0; x < colsNum; ++x ) {
        if (board[y][x] === 0) {
          rowFilled = false;
          break;
        }
      }
      if (rowFilled) {
        allScores[yourPlayerIndex]++;
        document.getElementById('clearsound').play();
        for (var yy = y; yy > 0; --yy) {
          for (var xx = 0; xx < colsNum; ++xx) {
            board[yy][xx] = board[yy - 1][xx];
          }
        }
        ++y;
      }
    }
  }

  // returns rotates the rotated shape 'current' perpendicularly anticlockwise
  function rotate(shape) {
    var newShape = [];
    for (var y = 0; y < 4; ++y) {
      newShape[y] = [];
      for (var x = 0; x < 4; ++x) {
        newShape[y][x] = shape[3 - x][y];
      }
    }
    return newShape;
  }

  //Canvas stuffv
  var ctx = canvas.getContext("2d");

  var drawInterval;

  function setDrawInterval() {
    stopDrawInterval();
    // Every 10 shapes we increase the snake speed (to a max of 100ms interval).
    var intervalMillis = Math.max(100, drawEveryMilliseconds - 20 * Math.floor(pieceCreatedNum / 10));
    drawInterval = setInterval(updateAndDraw, intervalMillis);
  }

  function stopDrawInterval() {
    clearInterval(drawInterval);
  }
  
  // draw a single square at (x, y) with color 
  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*cellWidth, y*cellHeight, cellWidth, cellHeight);
    ctx.strokeStyle = "white";
    ctx.strokeRect(x*cellWidth, y*cellHeight, cellWidth, cellHeight);
  }

  function draw() {

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    
    var x, y;
    
    //draw board
    for (x = 0; x < colsNum; ++x) {
      for (y = 0; y < rowsNum; ++y) {
        if (board[y][x]) {
          drawCell(x, y, playerColor[yourPlayerIndex]);
        }
      }
    }
    
    //draw piece
    for (y = 0; y < 4; ++y) {
      for (x = 0; x < 4; ++x) {
        if (piece.shape[y][x]) {
          drawCell(piece.x + x, piece.y + y, shapeColor[piece.index]);
        }
      }
    }

    //Lets paint the score
    for (var i = 0; i < allScores.length; i++) {
      ctx.font = '12px sans-serif';
      var color = playerColor[i];
      ctx.fillStyle = color;
      ctx.textBaseline = "top";
      var msg = $translate.instant("COLOR_SCORE_IS",
          {color: $translate.instant(color.toUpperCase()), score: "" + allScores[i]});
      var cordX = 5 + i % 4 * canvasWidth / (playersInfo.length > 4 ? 4 : playersInfo.length);
      var cordY = 5 + Math.floor(i / 4) * 15;
      ctx.fillText(msg, cordX, cordY);
    }
  }

  function updateAndDraw()
  {
    if (!isGameOngoing) {
      return;
    }
    var secondsFromStart =
      Math.floor((new Date().getTime() - startMatchTime) / 1000);
    if (secondsFromStart < 3) {
      // Countdown to really start
      draw();
      // Draw countdown
      var secondsToReallyStart = 3 - secondsFromStart;

      // Gives you a hint what is your color
      var yourColor = playerColor[yourPlayerIndex];
      ctx.fillStyle = yourColor;
      ctx.font = '70px sans-serif';
      ctx.fillText("" + secondsToReallyStart, canvasWidth / 2, canvasHeight / 2);

      ctx.font = '20px sans-serif';
      var msg = $translate.instant("YOUR_SNAKE_COLOR_IS");
      ctx.fillText(msg, canvasWidth / 4 - 35, canvasHeight / 4 - 30);
      msg = $translate.instant("YOUR_COLOR",
          {color: $translate.instant(yourColor.toUpperCase())});
      ctx.fillText(msg, canvasWidth / 2 - 20 , canvasHeight / 4 - 5);
      return;
    }
    tick();
    var isReliable = true; // If creating food (and increasing score), I want to pass the message reliably.
    sendMessage(isReliable);
    draw();
  }

  function keyPressed(dir) {
    switch (dir) {
      case 'left':
        if (valid(-1)) {
          --piece.x;
        }
        break;
      case 'right':
        if (valid(1)) {
          ++piece.x;
        }
        break;
      case 'down':
        if (valid(0, 1)) {
          ++piece.y;
        }
        break;
      case 'up':
        var rotated = rotate(piece.shape);
        if (valid(0, 0, rotated)) {
          piece.shape = rotated;
        }
        break;
    }
  }

  //Lets add the keyboard controls now
  document.addEventListener("keydown", function(e){
    var key = e.which;
    var dir = key === 37 ? "left"
        : key === 38 ? "up"
        : key === 39 ? "right"
        : key === 40 ? "down" : null;
    if (dir !== null && isGameOngoing) {
      keyPressed(dir);
      draw();
    }
  }, false);

  var lastX = null, lastY = null;
  function processTouch(e) {
    if (!isGameOngoing) {
      return;
    }
    e.preventDefault(); // prevent scrolling and dispatching mouse events.
    var touchobj = e.targetTouches[0]; // targetTouches includes only touch points in this canvas.
    if (!touchobj) {
      return;
    }
    if (lastX === null) {
      lastX = touchobj.pageX;
      lastY = touchobj.pageY;
      return;
    }
    var distX = touchobj.pageX - lastX; // get horizontal dist traveled by finger while in contact with surface
    var distY = touchobj.pageY - lastY; // get vertical dist traveled by finger while in contact with surface
    var swipedir = null;
    var absDistX = Math.abs(distX);
    var absDistY = Math.abs(distY);
    if (absDistX >= 20 || absDistY >= 20) {
      lastX = touchobj.pageX;
      lastY = touchobj.pageY;
      if (absDistX > absDistY) {
        swipedir = distX < 0 ? 'left' : 'right';
      } else {
        swipedir = distY < 0 ? 'up' : 'down';
      }
      keyPressed(swipedir);
      draw();
    }
  }
  canvas.addEventListener('touchstart', function(e) {
    lastX = null;
    lastY = null;
    processTouch(e);
  }, false);
  canvas.addEventListener('touchmove', function(e) {
    processTouch(e);
  }, false);
  canvas.addEventListener('touchend', function(e) {
    processTouch(e);
  }, false);

  return {
    gotStartMatch: gotStartMatch,
    gotMessage: gotMessage,
    gotEndMatch: gotEndMatch
  };
} // end of createCanvasController

realTimeService.init({
  createCanvasController: createCanvasController,
  canvasWidth: canvasWidth,
  canvasHeight: canvasHeight
});

}])
.config(['$translateProvider', function($translateProvider) {
  'use strict';
  $translateProvider.init(['en', 'he']);
}]);

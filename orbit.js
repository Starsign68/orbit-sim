var ctx=null;
var background = null;
var pos = {x:0,y:10000000};
var vel = {x:0, y:0};
var mouse = {
  x: null,
  y: null,
  buttons: null,
  start: null,
  scroll: 0
};

var scale = 40000;
var desired_scale = scale;
var zoom_end = null;

var mouse_click_pos = {x:null, y:null};

$(function() {
  background = generate_background(1024);
  var canvas = document.getElementById('screen');
  ctx = canvas.getContext('2d');

  $('#screen').on('mousedown mouseup mousemove', function(e) {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    mouse.buttons = e.buttons;
    if(e.type == 'mousedown')
      mouse.start = {x: mouse.x, y: mouse.y};
    else if(e.type == 'mouseup')
      mouse.start = null;
  });

  $('#screen').on('wheel', function(e) {
    mouse.scroll = e.originalEvent.deltaY;
  });

  requestAnimationFrame(loop);
});

var last_time = null;
var phys_debt = 0;
var phys_step = 1000/60;

function loop(t) {
  var dt = t - last_time;
  phys_debt += Math.min(dt, 1000);
  last_time = t;
  var distance = Math.sqrt(Math.pow(pos.x, 2) + Math.pow(pos.y, 2));

  while(phys_debt > phys_step) {
    // thrust
    if(mouse.buttons & 1) {
      vel.x += (mouse.x - mouse.start.x) * 5;
      vel.y -= (mouse.y - mouse.start.y) * 5;
    }

    // move
    pos.x += vel.x;
    pos.y += vel.y;

    phys_debt -= phys_step;
  }

  if(mouse.scroll) {
    zoom_end = t + 500;
    desired_scale *= Math.pow(2, mouse.scroll/300);

    mouse.scroll = 0;
  }

  if(desired_scale > 100000000)
    desired_scale = 100000000;
  else if(desired_scale < 1)
    desired_scale = 1;

  if(zoom_end > t)
    scale += (desired_scale - scale) * dt/(zoom_end-t);
  else {
    scale = desired_scale;
    zoom_end = null;
  }

  var size = 6000000;

  /** render time **/

  /*
  var pos_mod_x = (pos.x < 0) ? 1024 : -1024
  var pos_mod_y = (pos.y < 0) ? 1024 : -1024
  
  ctx.drawImage(background,pos.x%1024+pos_mod_x, pos.y%1024+pos_mod_y);
  ctx.drawImage(background,pos.x%1024+pos_mod_x, pos.y%1024);
  ctx.drawImage(background,pos.x%1024,      pos.y%1024+pos_mod_y);
  ctx.drawImage(background,pos.x%1024,      pos.y%1024);
  */

  ctx.drawImage(background,0,0);

  $('#d').html(
    'scale: ' + scale +
    '<br>pos: ' + pos.x + ', ' + pos.y
  );

  ctx.shadowColor = '#fff';
  ctx.shadowBlur = size/10 / scale;
  ctx.fillStyle = '#27e';
  ctx.beginPath();
  ctx.arc(
    300 - pos.x/scale,
    300 + pos.y/scale,
    size/scale,
    0, 2*Math.PI
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  if(mouse.buttons & 1) {
    ctx.strokeStyle = '#fd1';
    ctx.lineWidth = '3';
    ctx.beginPath();
    ctx.moveTo(300,300);
    ctx.lineTo(300 + (mouse.start.x - mouse.x)/3, 300 + (mouse.start.y - mouse.y)/3);
    ctx.stroke();
  }

  ctx.fillStyle = '#dec';
  ctx.beginPath();
  ctx.arc(300,300,5,0,2*Math.PI);
  ctx.fill();

  requestAnimationFrame(loop);
}

function generate_background(size) {
  var canvas = document.createElement('canvas');
  canvas.height = size;
  canvas.width  = size;
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,size,size);

  for(var i = 0; i < Math.pow(size/16,2); i++) {
    var temp = 3000 + Math.floor(Math.random() * 15000);
    //var temp = 2000+ 800*Math.log(Math.ceil(Math.random() * 30000));
    //var temp = 2000+ 3000/Math.random();
    //var temp = 20000 - 30000 * Math.pow(Math.random()-0.3,2);
    //var temp = 30000 * (Math.pow(1.4 * Math.random() - 0.6, 3) + 0.2);

    ctx.fillStyle = temp_to_colour(temp);
    ctx.beginPath();
    ctx.arc(
      Math.floor(Math.random() * size),
      Math.floor(Math.random() * size),
      temp/20000 + 1,
      0,2*Math.PI
    );
    ctx.fill();
  }

  return canvas;
}

function temp_to_colour(temp) {
  // http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
  temp /= 100;

  var r = (temp <= 66) ? 255 : Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592));
  var g = Math.min(255, (temp <= 66) ? 99.4708025861 * Math.log(temp) - 161.1195681661 : 288.1221695283 * Math.pow(temp - 60, -0.0755148492));
  var b = (temp >= 66) ? 255 : (temp <= 19) ? 0 : Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307);

  return 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')';
}

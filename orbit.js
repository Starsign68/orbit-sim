'use strict';
var mouse = {
  x: null,
  y: null,
  buttons: null,
  start: null,
  scroll: 0
};

var system = {
  a: 0,
  omega: 0,
  M: -2.78,
  r: 6.957e8,
  m: 2e30,
  colour: '#fffbe0',
  satellites: [
    {
      a: 5.79e10,
      omega: 0.51,
      M: -2.78,
      r: 2.4e6,
      m: 3.3e23,
      colour: '#A7A7A3'
    },
    {
      a: 1.08e11,
      omega: 0.96,
      M: -2.12,
      r: 6.1e6,
      m: 4.87e24,
      colour: '#BEAC66'
    },
    {
      a: 1.5e11,
      omega: 1.8,
      M: 0,
      r: 6.4e6,
      m: 5.97e24,
      colour: '#2084EA',
      satellites: [
        {
          a: 3.84e8,
          omega: 1.36,
          M: -2.6,
          r: 1.7e6,
          m: 7.342e22,
          colour: '#9A9997'
        }
      ]
    },
    {
      a: 2.28e11,
      omega: 5.01,
      M: -1.94,
      r: 3.4e6,
      m: 6.42e23,
      colour: '#B3391D'
    },
    {
      a: 7.78e11,
      omega: 4.78,
      M: -1.62,
      r: 7e7,
      m: 1.9e27,
      colour: '#C0A180'
    },
    {
      a: 1.43e12,
      omega: 5.9,
      M: -2.74,
      r: 5.8e7,
      m: 5.68e26,
      colour: '#D1BA84'
    },
    {
      a: 2.87e12,
      omega: 1.73,
      M: -2.35,
      r: 2.5e7,
      m: 8.68e25,
      colour: '#C9EFF0'
    },
    {
      a: 4.5e12,
      omega: 4.31,
      M: -0.54,
      r: 2.5e7,
      m: 1.02e26,
      colour: '#346DF7'
    }
  ]
};

var GRAV = 6.674e-11;

(function initialise_system(body) {
  body.pos = new Vec(body.a * Math.cos(body.M+body.omega), body.a * Math.sin(body.M+body.omega));
  if(body.parent)
    body.pos.add(body.parent.pos);
  for(var i in body.satellites) {
    body.satellites[i].parent = body;
    body.satellites[i].angular_vel = Math.sqrt(GRAV*body.m/Math.pow(body.satellites[i].a, 3));
    initialise_system(body.satellites[i]);
  }
})(system);

var pos = new Vec(0,10000000).add(system.satellites[2].pos);
var vel = new Vec(-36000,-8000);

var scale = 40000;
var initial_scale = scale;
var desired_scale = scale;
var zoom_end = null;

var debug_output = null;
var debug_lines = {};
var ctx=null;
var background = generate_background(1200);

var last_time = null;
var phys_step = 1000/120;

document.addEventListener('DOMContentLoaded',function() {
  var canvas = document.getElementById('screen');

  canvas.addEventListener('mousedown', mouseEvent, false);
  canvas.addEventListener('mouseup',   mouseEvent, false);
  canvas.addEventListener('mousemove', mouseEvent, false);

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    mouse.scroll = e.deltaY;
  });

  function mouseEvent(e) {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    mouse.buttons = e.buttons;

    if(!(mouse.buttons & 1))
      mouse.start = null;
    else if(!mouse.start)
      mouse.start = {x: mouse.x, y: mouse.y};
  }

  debug_output = document.getElementById('d');

  ctx = canvas.getContext('2d');
  requestAnimationFrame(function(t){
    last_time=t;
    requestAnimationFrame(loop);
  });
});

var dt = 0;

function loop(t) {
  dt = Math.min(t - last_time, 5 * phys_step);
  last_time = t;
  while(dt > phys_step) {
    var acc = new Vec();
    // thrust
    if(mouse.start) {
      acc.add(new Vec(mouse.x - mouse.start.x, mouse.start.y - mouse.y).scale(0.5));
    }

    (function updateBodyPos(body) {
      if(body.parent) {
        body.M += body.angular_vel * phys_step;
        if(body.M > Math.PI)
          body.M -= 2*Math.PI;
        body.pos = new Vec(body.a * Math.cos(body.M+body.omega), body.a * Math.sin(body.M+body.omega)).add(body.parent.pos);
      }

      var displacement = pos.to(body.pos);
      acc.add(displacement.set_mag(GRAV*body.m/displacement.mag_squared));

      for(var i in body.satellites)
        updateBodyPos(body.satellites[i]);
    })(system);

    // move/integrate
    var next_vel = new Vec(vel).add(acc.scale(phys_step));
    pos.add(new Vec(vel).add(next_vel).scale(phys_step * 0.5));
    vel = next_vel;

    debug_lines.pos = pos;
    debug_lines.vel = vel;

    dt -= phys_step;
  }

  if(mouse.scroll) {
    initial_scale = scale;
    desired_scale *= (mouse.scroll > 0) ? 1.6 : 0.625;

    if(desired_scale > 20000000000)
      desired_scale = 20000000000;
    else if(desired_scale < 10)
      desired_scale = 10;

    zoom_end = t + 500;
    mouse.scroll = 0;
  }

  if(zoom_end > t) {
    scale = desired_scale + (initial_scale - desired_scale)*(zoom_end-t)/500;
  }
  else {
    scale = desired_scale;
    zoom_end = null;
  }

  debug_lines.scale = scale;

  /** render time **/

  ctx.drawImage(background, -300*pos.x/1e13 - 300, 300*pos.y/1e13 - 300);

  (function drawBody(body) {
    // orbit
    if(body.parent && body.a < 10000 * scale) {
      ctx.globalAlpha = Math.min(1, 1.25-body.a/scale/8000);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = body.colour;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        300 + (body.parent.pos.x - pos.x)/scale,
        300 - (body.parent.pos.y - pos.y)/scale,
        body.a/scale,
        0, 2*Math.PI
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    //body
    if(pos.to(body.pos).mag - body.r < 430 * scale) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = body.r/10 / scale;
      ctx.fillStyle = body.colour;
      ctx.beginPath();
      ctx.arc(
        300 + (body.pos.x - pos.x)/scale,
        300 - (body.pos.y - pos.y)/scale,
        Math.max(5, body.r/scale),
        0, 2*Math.PI
      );
      ctx.fill();
    }

    for(var i in body.satellites)
      drawBody(body.satellites[i]);
  })(system);

  ctx.shadowBlur = 0;

  if(mouse.start) {
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

  d.innerText = '';
  for(var name in debug_lines) {
    d.textContent += name + ': ' + debug_lines[name] + '\r\n';
  }

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
    var temp = 3500 + Math.floor(Math.random() * 8000);

    ctx.fillStyle = temp_to_colour(temp);
    ctx.beginPath();
    ctx.arc(
      Math.floor(Math.random() * size),
      Math.floor(Math.random() * size),
      temp/15000 + 1,
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

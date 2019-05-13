'use strict';
var mouse = {
  x: null,
  y: null,
  buttons: null,
  start: null,
  scroll: 0
};

var debug_output = null;
var debug_lines = {};
var ctx=null;
var background = generate_background(1200);

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
var last_time = null;
var frame_step = 1000/60;
var phys_step = 30;

var home = system.satellites[2];
var pos = new Vec(0,home.r * 1.1).add(home.pos);
var vel = new Vec(-Math.sqrt(GRAV*home.m/(home.r * 1.1)),0).add(get_body_vel(home));
var last_acc = new Vec();

var dominant = system;
var pos_trail = [];

var scale = 40000;
var initial_scale = scale;
var desired_scale = scale;
var zoom_end = null;

function loop(t) {
  dt += Math.min(t - last_time, 5 * frame_step);
  last_time = t;
  while(dt > frame_step) {
    // velocity verlet the first
    pos.add(new Vec(vel).scale(phys_step)).add(new Vec(last_acc).scale(phys_step*phys_step/2));
    var acc = new Vec();
    // thrust
    if(mouse.start) {
      acc.set(mouse.x - mouse.start.x, mouse.start.y - mouse.y).scale(0.1);
    }

    var dominant_search = system;

    (function updateBody(body) {
      if(body.parent) {
        body.M += body.angular_vel * phys_step;
        if(body.M > Math.PI)
          body.M -= 2*Math.PI;
        body.pos = get_body_pos(body);
      }

      var displacement = pos.to(body.pos);
      // velocity verlet the intermediate second
      acc.add(new Vec(displacement).set_mag(GRAV*body.m/displacement.mag_squared));
      if(displacement.mag < body.r) {
        pos.set(new Vec(body.pos).sub(new Vec(displacement).set_mag(body.r)));
        vel.set(get_body_vel(body));
      }

      if(dominant_search == body.parent && displacement.mag < body.SOI)
        dominant_search = body;

      for(var i in body.satellites)
        updateBody(body.satellites[i]);
    })(system);
    dominant = dominant_search;
    debug_lines.dominant = dominant.name;

    // velocity verlet the third (and final)
    vel.add(last_acc.add(acc).scale(phys_step/2));
    last_acc = acc;

    dt -= frame_step;
  } // end physics

  pos_trail.push({
    parent: dominant,
    offset: dominant.pos.to(pos)
  });
  if(pos_trail.length > 2048)
    pos_trail.shift();

  if(mouse.scroll) {
    initial_scale = scale;
    desired_scale *= (mouse.scroll > 0) ? 1.6 : 0.625;

    if(desired_scale > 2.0769e10) // 40000 * 1.6**28
      desired_scale = 2.0769e10;
    else if(desired_scale < 8.4703) // 40000 * 1.6**-18
      desired_scale = 8.4703;

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

  ctx.strokeStyle = '#deca';
  ctx.lineWidth = '2';
  ctx.beginPath();
  ctx.moveTo(
    300 + (pos_trail[0].parent.pos.x + pos_trail[0].offset.x - pos.x)/scale,
    300 - (pos_trail[0].parent.pos.y + pos_trail[0].offset.y - pos.y)/scale
  );
  for(var i = 1; i < pos_trail.length; i++) {
    ctx.lineTo(
      300 + (pos_trail[i].parent.pos.x + pos_trail[i].offset.x - pos.x)/scale,
      300 - (pos_trail[i].parent.pos.y + pos_trail[i].offset.y - pos.y)/scale
    );
  }
  ctx.stroke();

  (function drawBody(body) {
    // orbit
    if(body.parent && body.a < 10000 * scale) {
      ctx.globalAlpha = Math.min(1, 1.25-body.a/scale/8000);
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

    for(var i in body.satellites)
      drawBody(body.satellites[i]);

    //body
    if(pos.to(body.pos).mag - body.r < 430 * scale) {
      if(body.parent) {
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(
          300 + (body.pos.x - pos.x)/scale,
          300 - (body.pos.y - pos.y)/scale,
          Math.max(5, body.r/scale),
          0, 2*Math.PI
        );
        ctx.fill();
      }

      var angle_start = Math.PI/2 - body.pos.arg;
      var angle_end = (body.parent) ? angle_start+Math.PI : angle_start+2*Math.PI;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = body.r/10 / scale;
      ctx.fillStyle = body.colour;
      ctx.beginPath();
      ctx.arc(
        300 + (body.pos.x - pos.x)/scale,
        300 - (body.pos.y - pos.y)/scale,
        Math.max(5, body.r/scale),
        angle_start, angle_end
      );
      ctx.fill();
    }
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

  ctx.globalAlpha = 0.8;

  for(var i = 0; i < Math.pow(size/16,2); i++) {
    var temp = 3500 + Math.floor(Math.random() * 8000);

    ctx.fillStyle = temp_to_colour(temp);
    ctx.beginPath();
    ctx.arc(
      Math.floor(Math.random() * size),
      Math.floor(Math.random() * size),
      temp/15000 + 0.5,
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

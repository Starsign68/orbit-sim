'use strict';
var mouse = {
  x: null,
  y: null,
  buttons: null,
  start: null,
  scroll: 0
};
var keyboard = {prev:{}};

var debug_output = null;
var debug_lines = {};
var ctx=null;
var background = generate_background(1200);

document.addEventListener('DOMContentLoaded',function() {
  var canvas = document.getElementById('screen');

  canvas.addEventListener('mousedown', mouseEvent, false);
  document.addEventListener('mouseup', mouseEvent, false);
  canvas.addEventListener('mousemove', mouseEvent, false);

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    mouse.scroll = e.deltaY;
  });

  function mouseEvent(e) {
    var bounds = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - bounds.left) * canvas.width  / canvas.clientWidth;
    mouse.y = (e.clientY - bounds.top ) * canvas.height / canvas.clientHeight;
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
document.addEventListener('keydown',function(e) {
  var key = e.key;
  if(['Down','Left','Right','Up'].indexOf(key) != -1)
    key = 'Arrow'+key; // standard name
  if(['ArrowDown','ArrowLeft','ArrowRight','ArrowUp'].indexOf(key) != -1)
    e.preventDefault();
  debug_lines.key = key;
  keyboard[key] = true;
});
document.addEventListener('keyup', function(e) {
  var key = e.key;
  if(['Down','Left','Right','Up'].indexOf(e.key) != -1)
    key = 'Arrow'+key;
  keyboard[key] = false;
});

var dt = 0;
var last_time = null;

var frame_step = 1000/60;
var phys_step = frame_step * 512/1000;
var desired_step = phys_step;
var max_step = phys_step;
var time_announcement = null;

var pos = new Vec();
var vel = new Vec();
var acc = new Vec();

var dominant = {
  body: system,
  pos: new Vec(),
  vel: new Vec(),
  acc: new Vec()
};
var emphasise_prediction = null;
var pos_trail = [];

function orbit_around(body, distance) {
  if(distance == undefined)
    distance = 0.2;

  pos.set(0,body.r * (1+distance)).add(body.pos);
  vel.set(-Math.sqrt(GRAV*body.m/(body.r * (1+distance))),0).add(get_body_vel(body));
  acc.set(0);

  pos_trail.push({
    parent: {pos:{x:0,y:0}},
    offset: {x:0,y:0}
  }); // garbage position to split the trail

  if(max_step > frame_step * 512/1000)
    max_step = frame_step * 512/1000;
}
orbit_around(system.satellites[2]);

var scale = 40000;
var initial_scale = scale;
var desired_scale = scale;
var zoom_end = null;

function loop(t) {
  dt += Math.min(t - last_time, 5 * frame_step);
  last_time = t;

  if(keyboard.Home && !keyboard.prev.Home)
    orbit_around(system.satellites[2]);

  if(keyboard.ArrowLeft && !keyboard.prev.ArrowLeft) {
    desired_step = phys_step / 2;
    time_announcement = t + 2000;
  }
  if(keyboard.ArrowRight && !keyboard.prev.ArrowRight) {
    desired_step = phys_step * 2;
    time_announcement = t + 2000;
  }
  if(desired_step < frame_step/1000)
    desired_step = frame_step/1000;

  while(dt > frame_step) {
    var last_acc = acc;
    acc = new Vec();

    // thrust
    if(mouse.start) {
      emphasise_prediction = t + 1500;
      max_step = 1/6;
      acc.set(mouse.x - mouse.start.x, mouse.start.y - mouse.y).scale(1/10); // maximum approx. 85ms-2 diagonally, 60ms-2 vertical and horzontal
    }

    debug_lines.max = max_step;
    debug_lines.desired = desired_step;
    debug_lines.step = phys_step;

    var max_attainable = frame_step/1000*Math.pow(2, Math.floor(Math.log(1000*max_step/frame_step)/Math.LN2));
    var target_step = Math.min(desired_step, max_attainable);

    if(phys_step > target_step) {
      phys_step = target_step;
      time_announcement = t + 2000;
    }
    else if(phys_step < target_step) {
      phys_step *= 2;
      time_announcement = t + 2000;
    }

    // velocity verlet the first: x += v*dt + 1/2 a*dt^2
    pos.add(new Vec(vel).scale(phys_step)).add(new Vec(last_acc).scale(phys_step*phys_step/2));

    var dominant_candidate = system;

    (function updateBody(body) {
      if(body.parent) {
        body.M += body.angular_vel * phys_step;
        if(body.M > Math.PI)
          body.M -= 2*Math.PI;
        body.pos = get_body_pos(body);
      }

      var displacement = pos.to(body.pos);
      var acceleration = new Vec(displacement).set_mag(GRAV*body.m/displacement.mag_squared);

      // velocity verlet the second
      acc.add(acceleration);

      if(displacement.mag < body.r) {
        pos.set(new Vec(body.pos).sub(new Vec(displacement).set_mag(body.r)));
        vel.set(get_body_vel(body));
      }

      if(dominant_candidate == body.parent && displacement.mag < body.SOI) {
        dominant_candidate = body;
      }
      if(body == dominant_candidate) {
        dominant.pos = displacement.negate();
        dominant.acc = acceleration;
      }

      for(var i in body.satellites)
        updateBody(body.satellites[i]);
    })(system);

    dominant.body = dominant_candidate;
    dominant.vel = get_body_vel(dominant.body).sub(vel).negate();
    debug_lines.dominant = dominant.body.name;

    // velocity verlet the third (and final): v += (a(t) + a(t+dt))*dt/2
    vel.add(last_acc.add(acc).scale(phys_step/2));

    max_step = 0.01 * dominant.vel.mag/dominant.acc.mag;
    if(max_step < frame_step/1000)
      max_step = frame_step/1000;
    else if(max_step > frame_step/1000 * 268435456)
      max_step = frame_step/1000 * 268435456;

    dt -= frame_step;
  } // end physics

  pos_trail.push({
    parent: dominant.body,
    offset: dominant.pos
  });
  if(pos_trail.length > 2048)
    pos_trail.shift();

  if(mouse.scroll) {
    initial_scale = scale;
    desired_scale *= (mouse.scroll > 0) ? 1.6 : 0.625;
    zoom_end = t + 500;
  }

  if(keyboard.ArrowDown)
    desired_scale *= 1.05;
  if(keyboard.ArrowUp)
    desired_scale /= 1.05;

  if(desired_scale > 2.0769e10) // 40000 * 1.6**28
    desired_scale = 2.0769e10;
  else if(desired_scale < 8.4703) // 40000 * 1.6**-18
    desired_scale = 8.4703;

  if(desired_scale != scale) {
    if(zoom_end > t) {
      scale = desired_scale + (initial_scale - desired_scale)*(zoom_end-t)/500;
    }
    else {
      scale = desired_scale;
      zoom_end = null;
    }
  }

  debug_lines.scale = scale;

  mouse.scroll = 0;

  keyboard.prev = {}
  for(var key in keyboard) {
    if(key == 'prev')
      continue;
    keyboard.prev[key] = keyboard[key];
  }

  /** render time **/

  var back_x = 300 + 300*pos.x/1e13;
  if(back_x < 0)
    back_x = 0;
  else if(back_x > 600)
    back_x = 600;

  var back_y = 300 - 300*pos.y/1e13;
  if(back_y < 0)
    back_y = 0;
  else if(back_y > 600)
    back_y = 600;
  ctx.drawImage(background, back_x, back_y, 600, 600, 0, 0, 600, 600);

  ctx.strokeStyle = '#dec';
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = '1';

  var trail_parent = pos_trail[0].parent;
  ctx.beginPath();
  ctx.moveTo(
    300 + (trail_parent.pos.x + pos_trail[0].offset.x - pos.x)/scale,
    300 - (trail_parent.pos.y + pos_trail[0].offset.y - pos.y)/scale
  );
  for(var i = 1; i < pos_trail.length; i++) {
    if(pos_trail[i].parent == trail_parent) {
      ctx.lineTo(
        300 + (trail_parent.pos.x + pos_trail[i].offset.x - pos.x)/scale,
        300 - (trail_parent.pos.y + pos_trail[i].offset.y - pos.y)/scale
      );
    }
    else {
      trail_parent = pos_trail[i].parent
      ctx.moveTo(
        300 + (trail_parent.pos.x + pos_trail[i].offset.x - pos.x)/scale,
        300 - (trail_parent.pos.y + pos_trail[i].offset.y - pos.y)/scale
      );
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  (function drawBody(body) {
    // orbit
    if(body.parent
      && body.a < 10000 * scale
      && pos.to(body.parent.pos).mag - body.a < 430 * scale
    ) {
      ctx.globalAlpha = Math.min(1, 1.25-body.a/scale/8000);
      ctx.strokeStyle = body.colour;
      ctx.lineWidth = 2;
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
      var angle_start = 0;
      var angle_end = 2*Math.PI;
      ctx.shadowBlur = 0;
      
      if(body.r > scale) {
        // extra detail
        if(body != system) {
          // draw shadow
          var angle_start = Math.PI/2 - body.pos.arg;
          var angle_end = angle_start+Math.PI;

          if(body.r < scale * 5) {
            ctx.fillStyle = body.colour;
            ctx.beginPath();
            ctx.arc(
              300 + (body.pos.x - pos.x)/scale,
              300 - (body.pos.y - pos.y)/scale,
              5,
              angle_start, angle_end, true
            );
            ctx.fill();
            ctx.globalAlpha = (body.r/scale - 1)/4;
          }

          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(
            300 + (body.pos.x - pos.x)/scale,
            300 - (body.pos.y - pos.y)/scale,
            Math.max(5, body.r/scale),
            angle_start, angle_end, true
          );
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if(body.atmos)
          ctx.shadowBlur = 0.1*body.r/scale;
      }

      ctx.shadowColor = '#fff';
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

  // osculating orbit
  var h = dominant.pos.mag * dominant.vel.mag * Math.sin(dominant.vel.arg - dominant.pos.arg); // specific relative angular momentum; <0 = clockwise
  var p = h * h / (GRAV * dominant.body.m); // semi-latus rectum
  // eccentricity vector:
  var eccentricity_angle = dominant.vel.arg + ((h >= 0) ? -Math.PI/2 : Math.PI/2);
  var v_h_cross = dominant.vel.mag * Math.abs(h) / (GRAV * dominant.body.m);
  var eccentricity = new Vec(v_h_cross * Math.cos(eccentricity_angle), v_h_cross * Math.sin(eccentricity_angle)).sub(new Vec(dominant.pos).normalise());

  var apo_arg = eccentricity.arg;
  var e = eccentricity.mag;

  var max_angle = (e < 1) ? Math.PI : Math.acos(-1/e) * 255/256;

  ctx.strokeStyle = '#F3F487';
  ctx.lineWidth = '2';
  if(emphasise_prediction > t) {
    ctx.globalAlpha = Math.min(1, 0.2 + (emphasise_prediction-t)/900);
  }
  else {
    ctx.globalAlpha = 0.2;
    emphasise_prediction = null;
  }

  ctx.beginPath();
  for (var angle = -max_angle; angle <= max_angle; angle+=max_angle/256) {
    var r = p/(1 + e * Math.cos(angle));
    if(r < dominant.body.SOI) {
      ctx.lineTo(
        300 + (dominant.body.pos.x - pos.x + r*Math.cos(angle + apo_arg))/scale,
        300 - (dominant.body.pos.y - pos.y + r*Math.sin(angle + apo_arg))/scale
      );
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  if(mouse.start) {
    // exhaust line
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

  if(time_announcement > t) {
    ctx.globalAlpha = Math.min(1, (time_announcement-t)/1000);
    ctx.textAlign = 'center';
    ctx.font = '24px monospace';
    ctx.fillStyle = '#35ea9c';

    ctx.fillText('Time rate: \u00D7' + 1000*phys_step/frame_step, 300, 50);

    ctx.globalAlpha = 1;
  }
  else
    time_announcement = null;

  if(Math.abs(pos.x) > 1e13 || Math.abs(pos.y) > 1e13) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#EB5E42';
    ctx.font = '24px monospace';

    ctx.fillText("You've escaped, never to return!", 300, 500);
    ctx.fillText("Press 'Home' to reset", 300, 550);
  }

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

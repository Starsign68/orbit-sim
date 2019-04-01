'use strict';
function Vec(x,y) {
  this.set(x,y);
}

Vec.prototype.set = function set(x,y) {
  if(x == undefined) {
    x = 0;
    y = 0;
  }
  else if(y == undefined) {
    if(x.x && x.y) {
      y = x.y;
      x = x.x;
    }
    else if(x[0] && x[1]) {
      y = x[1];
      x = x[0];
    }
    else
      y = 0;
  }
  
  this.x = x;
  this.y = y;

  return this;
}

Vec.prototype.add = function add(vector) {
  this.x += vector.x;
  this.y += vector.y;
  return this;
}

Vec.prototype.sub = function sub(vector) {
  this.x -= vector.x;
  this.y -= vector.y;
  return this;
}

Vec.prototype.scale = function scale(factor) {
  this.x *= factor;
  this.y *= factor;
  return this;
}

Vec.prototype.negate = function negate() {
  return this.scale(-1);
}

// chainable
Vec.prototype.set_mag = function set_mag(new_mag) {
  var old_mag = this.mag;
  if(old_mag == 0) {
    if(new_mag == 0)
      return this;
    else
      throw 'Tried to resize a zero vector';
  }
  return this.scale(new_mag/old_mag);
}

Object.defineProperty(Vec.prototype, 'mag', {
  get: function get() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  },
  set: Vec.prototype.set_mag
});

Vec.prototype.normalise = function normalise() {
  this.mag = 1;
  return this;
}

Object.defineProperty(Vec.prototype, 'arg', {
  get: function get() {
    return Math.atan2(this.y, this.x);
  }
});

Vec.prototype.toString = function toString() {
  return '('+this.x+', '+this.y+')';
}

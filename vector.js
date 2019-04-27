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
    if('x' in x && 'y' in x) {
      y = x.y;
      x = x.x;
    }
    else if(0 in x && 1 in x) {
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

Vec.prototype.to = function to(vector) {
  return new Vec(vector.x - this.x, vector.y -this.y);
};

Vec.prototype.scale = function scale(factor) {
  this.x *= factor;
  this.y *= factor;
  return this;
}

Vec.prototype.negate = function negate() {
  return this.scale(-1);
}

var hypot = Math.hypot || function hypot(x,y) {
  return Math.sqrt(x * x + y * y);
}
Object.defineProperty(Vec.prototype, 'mag', {
  get: function get() {
    return hypot(this.x, this.y);
  },
  set: function set(new_mag) {
    var old_mag = this.mag;
    if(old_mag == 0) {
      if(new_mag == 0)
        return this;
      else
        throw 'Tried to resize a zero vector';
    }
    this.scale(new_mag/old_mag);
  }
});
Object.defineProperty(Vec.prototype, 'mag_squared', {
  get: function get() {
    return this.x*this.x + this.y*this.y;
  }
});

// chainable
Vec.prototype.set_mag = function set_mag(new_mag) {
  this.mag = new_mag;
  return this;
}

Vec.prototype.normalise = function normalise() {
  return this.set_mag(1);
}

Object.defineProperty(Vec.prototype, 'arg', {
  get: function get() {
    return Math.atan2(this.y, this.x);
  }
});

Vec.prototype.toString = function toString() {
  return '('+this.x+', '+this.y+')';
}

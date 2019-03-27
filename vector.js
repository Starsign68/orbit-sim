function Vec(x,y) {
  if(x == undefined) {
    x = 0;
    y = 0;
  }
  else if(x.x && x.y) {
    y = x.y;
    x = x.x;
  }
  else if(y == undefined) {
    y = 0;
  }
  
  this.x = x;
  this.y = y;
}

Vec.prototype.negate = function negate() {
  this.x *= -1;
  this.y *= -1;
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

Vec.prototype.normalise = function normalise() {
  var mag = this.mag();
  if(mag > 0)
    this.scale(1/this.mag());
  return this;
}

Vec.prototype.mag = function mag() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
}

Vec.prototype.arg = function arg() {
  return Math.atan2(this.y, this.x);
}

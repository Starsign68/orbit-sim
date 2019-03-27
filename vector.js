function Vec(a,b) {
  if(a instanceof Vec) {
    this.x = a.x;
    this.y = a.y;
  }
  else {
    this.x = a;
    this.y = b;
  }
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
  this.scale(1/this.mag());
  return this;
}

Vec.prototype.mag = function mag() {
  return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
}

Vec.prototype.arg = function arg() {
  return Math.atan2(this.y, this.x);
}
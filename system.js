'use strict';
var system = {
  name: 'Sun',
  M: 0,
  a: 0,
  r: 6.957e8,
  m: 2e30,
  SOI: 1e13,
  colour: '#fffbe0',
  atmos: true,
  satellites: [
    {
      name: 'Mercury',
      M: -2.78,
      a: 5.79e10,
      r: 2.4e6,
      m: 3.3e23,
      colour: '#A7A7A3',
      atmos: false
    },
    {
      name: 'Venus',
      M: -2.12,
      a: 1.08e11,
      r: 6.1e6,
      m: 4.87e24,
      colour: '#BEAC66',
      atmos: true
    },
    {
      name: 'Earth',
      M: 0,
      a: 1.5e11,
      r: 6.4e6,
      m: 5.97e24,
      colour: '#2084EA',
      atmos: true,
      satellites: [
        {
          name: 'Moon',
          M: -2.6,
          a: 3.84e8,
          r: 1.7e6,
          m: 7.342e22,
          colour: '#9A9997',
          atmos: false
        }
      ]
    },
    {
      name: 'Mars',
      M: -1.94,
      a: 2.28e11,
      r: 3.4e6,
      m: 6.42e23,
      colour: '#B3391D',
      atmos: true
    },
    {
      name: 'Jupiter',
      M: -1.62,
      a: 7.78e11,
      r: 7e7,
      m: 1.9e27,
      colour: '#C0A180',
      atmos: true,
      satellites: [
        {
          name: 'Io',
          M: 0,
          a: 4.22e8,
          r: 1.8e6,
          m: 8.93e22,
          colour: '#F1E390',
          atmos: false
        },
        {
          name: 'Europa',
          M: 0,
          a: 6.71e8,
          r: 1.6e6,
          m: 4.8e22,
          colour: '#7A7F6F',
          atmos: false
        },
        {
          name: 'Ganymede',
          M: 4.71,
          a: 1.07e9,
          r: 2.6e6,
          m: 1.48e23,
          colour: '#9D8F80',
          atmos: false
        },
        {
          name: 'Callisto',
          M: 0,
          a: 1.88e9,
          r: 2.4e6,
          m: 1.08e23,
          colour: '#47422E',
          atmos: false
        }
      ]
    },
    {
      name: 'Saturn',
      M: -2.74,
      a: 1.43e12,
      r: 5.8e7,
      m: 5.68e26,
      colour: '#D1BA84',
      atmos: true,
      rings: [[9.2e7,1.18e8],[1.22e8,1.37e8]],
      satellites: [
        {
          name: 'Titan',
          M: 2.4,
          a: 1.22e9,
          r: 2.6e6,
          m: 1.35e23,
          colour: '#E9C360',
          atmos: true
        },
        {
          name: 'Rhea',
          M: -0.97,
          a: 5.27e8,
          r: 7.6e5,
          m: 2.3e21,
          colour: '#BBBBBB',
          atmos: false
        },
        {
          name: 'Iapetus',
          M: -1.32,
          a: 3.56e9,
          r: 7.4e5,
          m: 1.8e21,
          colour: '#625447',
          atmos: false
        },
        {
          name: 'Dione',
          M: 0.67,
          a: 3.77e8,
          r: 5.6e5,
          m: 1.1e21,
          colour: '#AAAAAA',
          atmos: false
        },
        {
          name: 'Tethys',
          M: -0.88,
          a: 2.95e8,
          r: 5.3e5,
          m: 6.2e20,
          colour: '#969696',
          atmos: false
        },
        {
          name: 'Enceladus',
          M: -0.2,
          a: 2.38e8,
          r: 2.5e5,
          m: 1.1e20,
          colour: '#c6c6c6',
          atmos: false
        },
        {
          name: 'Mimas',
          M: -2.83,
          a: 1.86e8,
          r: 2e5,
          m: 4e19,
          colour: '#818181',
          atmos: false
        }
      ]
    },
    {
      name: 'Uranus',
      a: 2.87e12,
      M: -2.35,
      r: 2.5e7,
      m: 8.68e25,
      colour: '#C9EFF0',
      atmos: true
    },
    {
      name: 'Neptune',
      a: 4.5e12,
      M: -0.54,
      r: 2.5e7,
      m: 1.02e26,
      colour: '#346DF7',
      atmos: true
    }
  ]
};

var GRAV = 6.674e-11;

(function initialise_system(body) {
  body.pos = get_body_pos(body);
  for(var i in body.satellites) {
    body.satellites[i].parent = body;
    body.satellites[i].mean_motion = Math.sqrt(GRAV*body.m/Math.pow(body.satellites[i].a, 3));
    body.satellites[i].SOI = body.satellites[i].a * Math.pow(body.satellites[i].m / body.m, 2/5);
    initialise_system(body.satellites[i]);
  }
})(system);

function get_body_pos(body) {
  return (body.parent) ? new Vec(body.a * Math.cos(body.M), body.a * Math.sin(body.M)).add(body.parent.pos) : new Vec(0,0);
  // WARN: assumes parent pos has already been updated
}

function get_body_vel(body) {
  return (body.parent) ? new Vec(-Math.sin(body.M), Math.cos(body.M))
                          .set_mag(body.a * body.mean_motion)
                          .add(get_body_vel(body.parent))
                       : new Vec(0,0);
}

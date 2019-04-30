var system = {
  name: 'Sun',
  a: 0,
  omega: 0,
  M: -2.78,
  r: 6.957e8,
  m: 2e30,
  colour: '#fffbe0',
  satellites: [
    {
      name: 'Mercury',
      a: 5.79e10,
      omega: 0.51,
      M: -2.78,
      r: 2.4e6,
      m: 3.3e23,
      colour: '#A7A7A3'
    },
    {
      name: 'Venus',
      a: 1.08e11,
      omega: 0.96,
      M: -2.12,
      r: 6.1e6,
      m: 4.87e24,
      colour: '#BEAC66'
    },
    {
      name: 'Earth',
      a: 1.5e11,
      omega: 1.8,
      M: 0,
      r: 6.4e6,
      m: 5.97e24,
      colour: '#2084EA',
      satellites: [
        {
          name: 'Moon',
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
      name: 'Mars',
      a: 2.28e11,
      omega: 5.01,
      M: -1.94,
      r: 3.4e6,
      m: 6.42e23,
      colour: '#B3391D'
    },
    {
      name: 'Jupiter',
      a: 7.78e11,
      omega: 4.78,
      M: -1.62,
      r: 7e7,
      m: 1.9e27,
      colour: '#C0A180'
    },
    {
      name: 'Saturn',
      a: 1.43e12,
      omega: 5.9,
      M: -2.74,
      r: 5.8e7,
      m: 5.68e26,
      colour: '#D1BA84'
    },
    {
      name: 'Uranus',
      a: 2.87e12,
      omega: 1.73,
      M: -2.35,
      r: 2.5e7,
      m: 8.68e25,
      colour: '#C9EFF0'
    },
    {
      name: 'Neptune',
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
    body.satellites[i].SOI = body.satellites[i].a * Math.pow(body.satellites[i].m / body.m, 2/5);
    initialise_system(body.satellites[i]);
  }
})(system);

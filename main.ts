import {
  Color,
  distance,
  Point,
  Polygon,
  SceneCollection,
  Simulation,
  Vector,
  Circle,
  radToDeg,
  Line
} from 'simulationjs';

const canvas = new Simulation('canvas');
canvas.fitElement();

const lines = new SceneCollection('lines');
canvas.add(lines, 'lines');

const centers = new SceneCollection('centers');
canvas.add(centers, 'centers');

const boidsCollection = new SceneCollection('boids');
canvas.add(boidsCollection, 'boids');

class Boid extends Polygon {
  constructor(x: number, y: number, r = 0) {
    super(
      new Point(x, y),
      [
        new Point(0, -6 * canvas.ratio),
        new Point(-3 * canvas.ratio, 6 * canvas.ratio),
        new Point(3 * canvas.ratio, 6 * canvas.ratio)
      ],
      new Color(0, 0, 0),
      r,
      new Point(0, -1 * canvas.ratio)
    );
  }
}

let numBoids = 300;
let speedReduction = 1;
// const speedReduction = 2.5;

let boidSpeed = 2.5;
boidSpeed /= speedReduction;

// 1 - 0, 1: 100%, 0: 0%
let cohesionStrength = 0.03;
let alignmentStrength = 0.095;
let separationStrength = 0.042;
let avoidanceStrength = 0.4;
cohesionStrength /= speedReduction;
alignmentStrength /= speedReduction;
separationStrength /= speedReduction;
avoidanceStrength /= speedReduction;

// @ts-ignore
document.getElementById('cohesionInput').value = cohesionStrength * speedReduction;
// @ts-ignore
document.getElementById('alignmentInput').value = alignmentStrength * speedReduction;
// @ts-ignore
document.getElementById('separationInput').value = separationStrength * speedReduction;
// @ts-ignore
document.getElementById('numBoidsInput').value = numBoids;
// @ts-ignore
document.getElementById('speedReductionInput').value = speedReduction;

const overflowAmount = 8;
const minDistance = 80;
const distToSeparate = 35;
const avoidDist = 180;
const maxRotation = 15;

let boids = initBoids(numBoids);
addBoidsToFrame(boids);

// let showLines = true;
// let showCircles = true;
let showLines = false;
let showCircles = false;

let colors = false;

let avoidPoint: Point | null = null;

function toPercent(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

// @ts-ignore
document.getElementById('cohesion').innerHTML = toPercent(cohesionStrength);
// @ts-ignore
document.getElementById('alignment').innerHTML = toPercent(alignmentStrength);
// @ts-ignore
document.getElementById('separation').innerHTML = toPercent(separationStrength);
// @ts-ignore
document.getElementById('numBoids').innerHTML = numBoids;

(window as any).changeCohesion = (val: number) => {
  cohesionStrength = val / speedReduction;
  // @ts-ignore
  document.getElementById('cohesion').innerHTML = toPercent(cohesionStrength);
};

(window as any).changeAlignment = (val: number) => {
  alignmentStrength = val / speedReduction;
  // @ts-ignore
  document.getElementById('alignment').innerHTML = toPercent(alignmentStrength);
};

(window as any).changeSeparation = (val: number) => {
  separationStrength = val / speedReduction;
  // @ts-ignore
  document.getElementById('separation').innerHTML = toPercent(separationStrength);
};
// @ts-ignore
document.getElementById('speedReduction').innerHTML = toPercent(speedReduction);

(window as any).changeNumBoids = (val: number) => {
  numBoids = val;
  if (boids.length < numBoids) {
    const newBoids = initBoids(numBoids - boids.length);
    boids = [...boids, ...newBoids];
    addBoidsToFrame(boids);
  }
  if (boids.length > numBoids) {
    const overflow = boids.length - numBoids;
    boids.splice(boids.length - overflow, boids.length);
    addBoidsToFrame(boids);
  }
  // @ts-ignore
  document.getElementById('numBoids').innerHTML = numBoids;
};

(window as any).changeSpeedReduction = (val: number) => {
  cohesionStrength *= speedReduction;
  alignmentStrength *= speedReduction;
  separationStrength *= speedReduction;
  boidSpeed *= speedReduction;
  speedReduction = val;
  cohesionStrength /= speedReduction;
  alignmentStrength /= speedReduction;
  separationStrength /= speedReduction;
  boidSpeed /= speedReduction;
  // @ts-ignore
  document.getElementById('speedReduction').innerHTML = toPercent(speedReduction);
};

(window as any).toggleColors = () => {
  colors = !colors;
  if (!colors) {
    for (let i = 0; i < boids.length; i++) {
      boids[i].fill(new Color(0, 0, 0));
    }
  }
};

canvas.on('mousedown', (e: MouseEvent) => {
  avoidPoint = new Point(e.offsetX * canvas.ratio, e.offsetY * canvas.ratio);
});
canvas.on('mouseup', () => {
  avoidPoint = null;
});
canvas.on('mousemove', (e: MouseEvent) => {
  if (avoidPoint) {
    avoidPoint = new Point(e.offsetX * canvas.ratio, e.offsetY * canvas.ratio);
  }
});

function angleToRotate(avgPoint: Point, boid: Boid) {
  const relativeAvgPoint = new Point(avgPoint.x - boid.pos.x, avgPoint.y - boid.pos.y);
  let rotation = radToDeg(Math.atan2(relativeAvgPoint.y, relativeAvgPoint.x)) + 90 - boid.rotation;
  if (Math.abs(rotation) > 180) {
    rotation = (360 - Math.abs(rotation)) * (Math.sign(rotation) * -1);
  }
  return rotation;
}

function clampAngle(angle: number) {
  return Math.min(Math.abs(angle), maxRotation) * Math.sign(angle);
}

(function main() {
  if (showLines) {
    lines.empty();
  }
  if (showCircles) {
    centers.empty();
  }
  for (let i = 0; i < boids.length; i++) {
    let avgX = 0;
    let avgY = 0;
    let boidsInRange: Boid[] = [];
    let boidsInMinorRadius: Boid[] = [];
    let averageRotation = 0;
    for (let j = 0; j < boids.length; j++) {
      if (i === j) continue;
      const p1 = boids[i].pos;
      const p2 = boids[j].pos;
      const dist = distance(p1, p2);
      if (dist < minDistance && angleToRotate(boids[j].pos, boids[i]) < 140) {
        avgX += p2.x;
        avgY += p2.y;
        boidsInRange.push(boids[j]);
        averageRotation += boids[j].rotation;

        if (showLines) {
          const line = new Line(p1, p2);
          lines.add(line);
        }
      }
      if (dist < distToSeparate) {
        boidsInMinorRadius.push(boids[j]);
      }
    }
    averageRotation /= boidsInRange.length;
    avgX /= boidsInRange.length;
    avgY /= boidsInRange.length;
    const avgPoint = new Vector(avgX, avgY);
    if (showCircles) {
      const center = new Circle(avgPoint.clone(), 4, new Color(0, 0, 255));
      centers.add(center);
    }

    let rotation = 0;
    let cohesionAmount = clampAngle(angleToRotate(avgPoint, boids[i]) * cohesionStrength);
    cohesionAmount = isNaN(cohesionAmount) ? 0 : cohesionAmount;
    rotation += cohesionAmount;

    const relativeVec = new Vector(0, -1, averageRotation);
    const relativePoint = new Point(relativeVec.x + boids[i].pos.x, relativeVec.y + boids[i].pos.y);
    let alignmentAmount = clampAngle(angleToRotate(relativePoint, boids[i]) * alignmentStrength);
    alignmentAmount = isNaN(alignmentAmount) ? 0 : alignmentAmount;
    rotation += alignmentAmount;

    let separationRotation = 0;
    for (let j = 0; j < boidsInMinorRadius.length; j++) {
      const angle = -angleToRotate(boidsInMinorRadius[j].pos, boids[i]) * separationStrength;
      separationRotation += angle;
    }
    separationRotation = clampAngle(separationRotation);
    separationRotation = isNaN(separationRotation) ? 0 : separationRotation;
    rotation += separationRotation;

    if (avoidPoint && distance(avoidPoint, boids[i].pos) < avoidDist) {
      rotation += -clampAngle(angleToRotate(avoidPoint, boids[i]) * avoidanceStrength);
    }

    rotation = clampAngle(rotation);
    boids[i].rotate(rotation);
    const vec = new Vector(0, 1, boids[i].rotation).multiply(-boidSpeed);
    boids[i].move(vec);
    if (colors) {
      boids[i].fill(
        new Color(
          (boids[i].pos.x / canvas.width) * 255,
          (boids[i].pos.y / canvas.height) * 255,
          255 - (boids[i].pos.x / canvas.width) * 255
        )
      );
    }

    if (boids[i].pos.x < -overflowAmount) {
      boids[i].moveTo(new Point(canvas.width + overflowAmount, boids[i].pos.y));
    } else if (boids[i].pos.x > canvas.width + overflowAmount) {
      boids[i].moveTo(new Point(-overflowAmount, boids[i].pos.y));
    }
    if (boids[i].pos.y < -overflowAmount) {
      boids[i].moveTo(new Point(boids[i].pos.x, canvas.height + overflowAmount));
    } else if (boids[i].pos.y > canvas.height + overflowAmount) {
      boids[i].moveTo(new Point(boids[i].pos.x, -overflowAmount));
    }
  }
  window.requestAnimationFrame(main);
})();

function addBoidsToFrame(boids: Boid[]) {
  boidsCollection.empty();
  boids.forEach((boid) => boidsCollection.add(boid));
}

function random(range: number) {
  return Math.floor(Math.random() * range);
}

function initBoids(num: number) {
  return Array(num)
    .fill({})
    .map(() => {
      return new Boid(random(canvas.width), random(canvas.height), random(360));
    });
}

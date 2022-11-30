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

class Boid extends Polygon {
  constructor(x: number, y: number, r = 0) {
    super(
      new Point(x, y),
      [new Point(0, -8), new Point(-4, 8), new Point(4, 8)],
      new Color(0, 0, 0),
      r,
      new Point(0, -2)
    );
  }
}

const numBoids = 300;
const speedReduction = 1;
// const speedReduction = 2.5;

let boidSpeed = 2.5;
boidSpeed /= speedReduction;

// 1 - 0, 1: 100%, 0: 0%
let cohesionStrength = 0.045;
let alignmentStrength = 0.07;
let seperationStrength = 0.042;
let avoidanceStrength = 0.05;
cohesionStrength /= speedReduction;
alignmentStrength /= speedReduction;
seperationStrength /= speedReduction;
avoidanceStrength /= speedReduction;

const overflowAmount = 8;
const minDistance = 80;
const distToSeperate = 35;
const avoidDist = 120;
const maxRotation = 10;

let boids = initBoids(numBoids);
addBoidsToFrame(boids);

const lines = new SceneCollection('lines');
canvas.add(lines, 'lines');

const centers = new SceneCollection('centers');
canvas.add(centers, 'centers');

// let showLines = true;
// let showCircles = true;
let showLines = false;
let showCircles = false;

let avoidPoint: Point | null = null;

canvas.on('mousedown', (e: any) => {
  avoidPoint = new Point(e.offsetX, e.offsetY);
});
canvas.on('mouseup', () => {
  avoidPoint = null;
});
canvas.on('mousemove', (e: any) => {
  if (avoidPoint) {
    avoidPoint = new Point(e.offsetX, e.offsetY);
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
      if (dist < minDistance) {
        avgX += p2.x;
        avgY += p2.y;
        boidsInRange.push(boids[j]);
        averageRotation += boids[j].rotation;

        if (showLines) {
          const line = new Line(p1, p2);
          lines.add(line);
        }
      }
      if (dist < distToSeperate) {
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
    rotation += clampAngle(angleToRotate(avgPoint, boids[i]) * cohesionStrength);

    const relativeVec = new Vector(0, -1, averageRotation);
    const relativePoint = new Point(relativeVec.x + boids[i].pos.x, relativeVec.y + boids[i].pos.y);
    rotation += clampAngle(angleToRotate(relativePoint, boids[i]) * alignmentStrength);

    let seperationRotation = 0;
    for (let j = 0; j < boidsInMinorRadius.length; j++) {
      const angle = -angleToRotate(boidsInMinorRadius[j].pos, boids[i]) * seperationStrength;
      seperationRotation += angle;
    }
    seperationRotation = clampAngle(seperationRotation);
    rotation += seperationRotation;

    if (avoidPoint && distance(avoidPoint, boids[i].pos) < avoidDist) {
      rotation += -clampAngle(angleToRotate(avoidPoint, boids[i]));
    }

    if (!isNaN(rotation)) {
      rotation = clampAngle(rotation);
      boids[i].rotate(rotation);
    }
    const vec = new Vector(0, 1, boids[i].rotation).multiply(-boidSpeed);
    boids[i].move(vec);

    if (boids[i].pos.x < -overflowAmount) {
      boids[i].moveTo(new Point(canvas.canvas.width + overflowAmount, boids[i].pos.y));
    } else if (boids[i].pos.x > canvas.canvas.width + overflowAmount) {
      boids[i].moveTo(new Point(-overflowAmount, boids[i].pos.y));
    }
    if (boids[i].pos.y < -overflowAmount) {
      boids[i].moveTo(new Point(boids[i].pos.x, canvas.canvas.height + overflowAmount));
    } else if (boids[i].pos.y > canvas.canvas.height + overflowAmount) {
      boids[i].moveTo(new Point(boids[i].pos.x, -overflowAmount));
    }
  }
  window.requestAnimationFrame(main);
})();

function addBoidsToFrame(boids: Boid[]) {
  canvas.empty();
  boids.forEach((boid) => canvas.add(boid));
}

function random(range: number) {
  return Math.floor(Math.random() * range);
}

function initBoids(num: number) {
  return Array(num)
    .fill({})
    .map(() => {
      return new Boid(random(canvas.canvas.width), random(canvas.canvas.height), random(360));
    });
}

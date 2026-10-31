import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/* =========================================================
   GREENFIELD CITY 3D
   City, shops, NPC conversations, countryside, lake,
   mountains, airport, vehicles, minimap and day/night.
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const container = $("#game-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc6ec);
scene.fog = new THREE.Fog(0x9cc9e5, 250, 950);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 1600
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

container.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const hemi = new THREE.HemisphereLight(0xd9efff, 0x65734b, 1.35);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d0, 2.1);
sun.position.set(-180, 260, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -350;
sun.shadow.camera.right = 350;
sun.shadow.camera.top = 350;
sun.shadow.camera.bottom = -350;
sun.shadow.camera.far = 900;
scene.add(sun);

/* ---------- Materials and helpers ---------- */

function material(color, roughness = 0.85, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness
  });
}

const M = {
  grass: material(0x73ad61),
  grass2: material(0x8abd70),
  road: material(0x41474d),
  roadLine: material(0xf0df8a),
  sidewalk: material(0xc8c8c0),
  white: material(0xf2f0e8),
  dark: material(0x20282e),
  glass: new THREE.MeshStandardMaterial({
    color: 0x83c6dc,
    roughness: 0.18,
    metalness: 0.15
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x147ca4,
    roughness: 0.18,
    metalness: 0.2,
    transparent: true,
    opacity: 0.94
  }),
  wood: material(0x805438),
  trunk: material(0x755034),
  leaf: material(0x267a3d),
  leafLight: material(0x45994d),
  black: material(0x151719),
  metal: material(0x7c8a91, 0.4, 0.65)
};

function box(parent, x, y, z, w, h, d, mat, cast = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d), mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, x, y, z, r, mat) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 9), mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, x, y, z, r1, r2, h, mat, segments = 9) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r2, h, segments), mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cone(parent, x, y, z, radius, height, mat, sides = 8) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, sides), mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function groundPlane(size, mat, x = 0, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size), mat
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, -0.15, z);
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

groundPlane(1500, M.grass);

/* ---------- City roads ---------- */

const roadLines = [-150, -100, -50, 0, 50, 100, 150];
const roadWidth = 14;
const cityLimit = 180;

for (const line of roadLines) {
  box(world, line, 0.01, 0, roadWidth, 0.12, cityLimit * 2, M.road, false);
  box(world, 0, 0.01, line, cityLimit * 2, 0.12, roadWidth, M.road, false);

  for (let p = -cityLimit + 5; p < cityLimit; p += 15) {
    box(world, line, 0.085, p, 0.18, 0.025, 6, M.roadLine, false);
    box(world, p, 0.085, line, 6, 0.025, 0.18, M.roadLine, false);
  }

  for (const side of [-1, 1]) {
    box(
      world,
      line + side * (roadWidth / 2 + 1.5),
      0.09, 0,
      3, 0.2, cityLimit * 2,
      M.sidewalk, false
    );

    box(
      world,
      0, 0.09,
      line + side * (roadWidth / 2 + 1.5),
      cityLimit * 2, 0.2, 3,
      M.sidewalk, false
    );
  }
}

// Crosswalks
for (const x of [-100, 0, 100]) {
  for (const z of [-100, 0, 100]) {
    for (let i = -4; i <= 4; i++) {
      box(world, x + i * 1.05, 0.09, z - 9, 0.65, 0.025, 2.8, M.white, false);
      box(world, x - 9, 0.09, z + i * 1.05, 2.8, 0.025, 0.65, M.white, false);
    }
  }
}

/* ---------- Trees and street lamps ---------- */

function makeTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  world.add(tree);

  cylinder(tree, 0, 1.2, 0, 0.17, 0.25, 2.4, M.trunk, 7);
  cone(tree, 0, 3.0, 0, 1.35, 2.8, M.leaf, 7);
  cone(tree, 0, 4.0, 0, 0.95, 2.1, M.leafLight, 7);
}

for (let i = 0; i < 250; i++) {
  const x = -420 + Math.random() * 840;
  const z = -420 + Math.random() * 840;

  const nearCity = Math.abs(x) < 185 && Math.abs(z) < 185;
  const nearLake = x > 230 && x < 400 && z > 60 && z < 260;

  if (!nearCity && !nearLake) {
    makeTree(x, z, 0.65 + Math.random() * 1.1);
  }
}

function makeLamp(x, z) {
  cylinder(world, x, 2.5, z, 0.08, 0.12, 5, M.metal);
  box(world, x + 0.55, 4.9, z, 1.1, 0.09, 0.09, M.metal);
  sphere(world, x + 1.0, 4.8, z, 0.22, material(0xffedb2));
}

for (const line of roadLines) {
  for (let p = -140; p <= 140; p += 40) {
    makeLamp(line + 10, p + 10);
    makeLamp(p - 10, line - 10);
  }
}

/* ---------- City buildings ---------- */

const buildings = [];
const buildingColliders = [];

const shopTypes = [
  "Electronics Store",
  "Clothing Store",
  "Pizza Planet",
  "Grocery Shop",
  "Book Shop",
  "Burger Bar",
  "Travel Agency",
  "Watch Shop"
];

const shopSigns = [
  ["NOVA PHONES", 0x174b64],
  ["FASHION HOUSE", 0x8b3760],
  ["PIZZA PLANET", 0x9b3028],
  ["GREEN GROCERY", 0x387c48],
  ["BOOK WORLD", 0x465c9a],
  ["BURGER BAR", 0x98552a],
  ["SUNNY TRAVEL", 0x16716f],
  ["LUXE WATCHES", 0x28231b]
];

function addSign(parent, label, color, width = 9) {
  const signMat = material(color);
  const sign = box(parent, 0, 3.6, -10.18, width, 1.05, 0.22, signMat);
  sign.position.z = -10.2;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#fff2b6";
  ctx.font = "bold 44px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.3, 0.8),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  face.position.set(0, 3.6, -10.075);
  parent.add(face);
}

function createInterior(building, kind, signName) {
  const room = new THREE.Group();
  room.position.copy(building.position);
  room.visible = false;
  world.add(room);

  const floorMat = material(0xd1cec5);
  const wallMat = material(0xece9e1);
  const darkWall = material(0x514332);

  const w = 20;
  const d = 20;
  const h = 6;

  box(room, 0, 0.04, 0, w, 0.15, d, floorMat, false);
  box(room, 0, h / 2, 10, w, h, 0.3, wallMat);
  box(room, -10, h / 2, 0, 0.3, h, d, wallMat);
  box(room, 10, h / 2, 0, 0.3, h, d, wallMat);

  // Back wall. The front is left open as a doorway.
  box(room, -7, h / 2, -10, 6, h, 0.3, wallMat);
  box(room, 7, h / 2, -10, 6, h, 0.3, wallMat);
  box(room, 0, h - 0.1, -10, 8, 0.3, 0.3, wallMat);
  box(room, 0, h + 0.05, 0, w, 0.2, d, wallMat);

  const ceilingLight = new THREE.PointLight(0xffe7bd, 24, 28);
  ceilingLight.position.set(0, 4.8, 0);
  room.add(ceilingLight);

  // Shop-specific furniture and displays.
  if (kind === "Electronics Store") {
    box(room, 0, 0.65, -4, 12, 1.25, 2.1, material(0x374c5a));
    box(room, 0, 1.35, -4, 11.6, 0.12, 1.8, material(0x9ccbdc));

    for (let i = 0; i < 5; i++) {
      box(room, -4.5 + i * 2.25, 1.65, -4, 0.75, 0.48, 0.12, material(0x1d2731));
      box(room, -4.5 + i * 2.25, 1.68, -3.92, 0.62, 0.32, 0.025, material(0x68b4dc));
    }

    box(room, -5, 1.2, 3, 5, 2.2, 0.5, material(0x455a64));
    box(room, 5, 1.2, 3, 5, 2.2, 0.5, material(0x455a64));
    for (let i = 0; i < 3; i++) {
      box(room, -5, 0.55 + i * 0.6, 3.3, 5, 0.08, 0.5, M.white);
      box(room, 5, 0.55 + i * 0.6, 3.3, 5, 0.08, 0.5, M.white);
    }
  } else if (kind === "Clothing Store") {
    for (const x of [-6, -2, 2, 6]) {
      cylinder(room, x, 2.3, -3, 0.06, 0.06, 5, M.metal);
      box(room, x, 3.5, -3, 2.4, 0.1, 0.1, M.metal);
      for (let i = 0; i < 3; i++) {
        const shirt = box(
          room, x - 0.7 + i * 0.7, 2.65, -3,
          0.55, 1.0, 0.16,
          material([0xd84d54, 0x3978c0, 0x54a56a][i])
        );
      }
    }
    box(room, 0, 0.6, 5, 8, 1.2, 1.5, M.wood);
  } else if (kind === "Pizza Planet" || kind === "Burger Bar") {
    box(room, 0, 0.65, -6, 12, 1.3, 1.4, material(0x865335));
    for (const x of [-5, 0, 5]) {
      for (const z of [-1, 4]) {
        cylinder(room, x, 0.8, z, 1.0, 1.0, 0.18, material(0x9a603b), 16);
        for (const dx of [-0.65, 0.65]) {
          for (const dz of [-0.65, 0.65]) {
            cylinder(room, x + dx, 0.35, z + dz, 0.07, 0.07, 0.7, M.black);
          }
        }
      }
    }
  } else {
    box(room, 0, 0.65, -5, 12, 1.3, 1.3, material(0x805438));
    for (let i = 0; i < 5; i++) {
      box(room, -7 + i * 3.5, 1.6, 4, 2.5, 2.7, 0.5, M.wood);
      box(room, -7 + i * 3.5, 1.0, 3.7, 2.4, 0.08, 0.8, M.white);
    }
  }

  // Interior wall posters/signs.
  const posterCanvas = document.createElement("canvas");
  posterCanvas.width = 512;
  posterCanvas.height = 160;
  const pctx = posterCanvas.getContext("2d");
  pctx.fillStyle = "#243e51";
  pctx.fillRect(0, 0, 512, 160);
  pctx.fillStyle = "#fff0ba";
  pctx.font = "bold 42px Arial";
  pctx.textAlign = "center";
  pctx.fillText(signName.toUpperCase(), 256, 94);
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.5),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(posterCanvas)
    })
  );
  poster.position.set(0, 4.4, 9.82);
  room.add(poster);

  return room;
}

function createBuilding(x, z, name, type, height, color, signColor = 0x31566a) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  world.add(group);

  const w = 20;
  const d = 20;
  const wall = material(color);
  const roof = material(0x46535b);

  box(group, 0, height / 2, 0, w, height, d, wall);
  box(group, 0, height + 0.18, 0, w + 0.8, 0.36, d + 0.8, roof);

  // Repeating square windows on all four faces.
  const floors = Math.max(1, Math.floor(height / 3.5));
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x8db5c4,
    roughness: 0.22,
    metalness: 0.2
  });
  const frameMat = material(0x59666b);

  for (let floor = 0; floor < floors; floor++) {
    const y = 2 + floor * 3.4;
    if (y > height - 0.8) continue;

    for (let wx = -7; wx <= 7; wx += 3.5) {
      box(group, wx, y, -10.12, 1.55, 1.8, 0.06, windowMat, false);
      box(group, wx, y, 10.12, 1.55, 1.8, 0.06, windowMat, false);
      box(group, wx, y, -10.17, 0.08, 1.95, 0.08, frameMat, false);
      box(group, wx, y, 10.17, 0.08, 1.95, 0.08, frameMat, false);
    }

    for (let wz = -7; wz <= 7; wz += 3.5) {
      box(group, -10.12, y, wz, 0.06, 1.8, 1.55, windowMat, false);
      box(group, 10.12, y, wz, 0.06, 1.8, 1.55, windowMat, false);
    }
  }

  // Ground floor storefront.
  if (type !== "Apartment" && type !== "Office Tower") {
    box(group, 0, 1.6, -10.16, 13, 3.2, 0.1, material(0x202a30));
    box(group, 0, 1.6, -10.24, 11.8, 2.5, 0.06, windowMat, false);
    box(group, 0, 3.35, -10.3, 15, 0.25, 0.25, material(signColor));
  }

  if (type === "Office Tower" || type === "Apartment") {
    addSign(group, name.toUpperCase(), signColor, 11);
  } else {
    addSign(group, name.toUpperCase(), signColor, 12);
  }

  const building = {
    group, x, z, w, d, height, name, type,
    room: null,
    kind: type
  };

  if (type !== "Office Tower" && type !== "Apartment") {
    building.room = createInterior(group, type, name);
  }

  buildings.push(building);
  buildingColliders.push({ x, z, w, d });

  return building;
}

// Place buildings in safe spaces between the roads.
const cityPlan = [
  [-125, -125, "MAPLE HOUSE", "Home", 9, 0xd5bd99, 0x92543b],
  [-75, -125, "NOVA PHONES", "Electronics Store", 12, 0x8d999c, 0x14506c],
  [-25, -125, "PIZZA PLANET", "Pizza Planet", 8, 0xd6c9ae, 0x9b3028],
  [25, -125, "CIVIC TOWER", "Office Tower", 58, 0x9aa9ad, 0x21475d],
  [75, -125, "FASHION HOUSE", "Clothing Store", 9, 0xd7c8ae, 0x8b3760],
  [125, -125, "GREEN MARKET", "Grocery Shop", 10, 0xc7c0a6, 0x387c48],

  [-125, -75, "PARKVIEW", "Apartment", 42, 0x9aa7ac, 0x526777],
  [-75, -75, "BURGER BAR", "Burger Bar", 8, 0xcab99f, 0x98552a],
  [75, -75, "BOOK WORLD", "Book Shop", 9, 0xc1b9a4, 0x465c9a],
  [125, -75, "CITY FINANCE", "Bank", 18, 0xb5a98c, 0x6b5735],

  [-125, 75, "GREENFIELD HOSPITAL", "Hospital", 25, 0xe2e5e1, 0x9b3030],
  [-75, 75, "SUNNY TRAVEL", "Travel Agency", 9, 0xc9c0a8, 0x16716f],
  [75, 75, "LUXE WATCHES", "Watch Shop", 10, 0xaaa69b, 0x28231b],
  [125, 75, "SKYLINE TOWER", "Office Tower", 64, 0x8e9da5, 0x354a63],

  [-125, 125, "FAMILY HOUSE", "Home", 8, 0xd8c29e, 0x92543b],
  [-75, 125, "CITY APARTMENTS", "Apartment", 36, 0x9eaaad, 0x526777],
  [75, 125, "CORNER STORE", "Grocery Shop", 8, 0xcdbb9e, 0x387c48],
  [125, 125, "MEDICAL CENTRE", "Hospital", 20, 0xe2e5e1, 0x9b3030]
];

for (const item of cityPlan) createBuilding(...item);

/* ---------- Mountain ranges and green hills ---------- */

function makeHill(x, z, radius, height, color = 0x83bb70) {
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    material(color)
  );
  hill.position.set(x, -0.3, z);
  hill.scale.y = height / radius;
  hill.receiveShadow = true;
  world.add(hill);
}

function makeMountain(x, z, radius, height) {
  const mountain = new THREE.Group();
  mountain.position.set(x, 0, z);
  world.add(mountain);

  cone(mountain, 0, height / 2, 0, radius, height, material(0x84999c), 7);
  cone(mountain, 0, height * 0.77, 0, radius * 0.38, height * 0.45, material(0xe2e9e8), 7);
}

for (let i = 0; i < 12; i++) {
  makeMountain(
    -520 + i * 95,
    -420,
    65 + Math.random() * 35,
    160 + Math.random() * 90
  );
  makeMountain(
    -520 + i * 95,
    460,
    70 + Math.random() * 40,
    170 + Math.random() * 100
  );
}

makeHill(-300, -80, 120, 70);
makeHill(-360, 150, 140, 85);
makeHill(80, 340, 120, 65);
makeHill(380, 300, 130, 75);
makeHill(440, -300, 150, 90);

/* ---------- Lake and shoreline ---------- */

const lake = new THREE.Mesh(
  new THREE.CircleGeometry(100, 64),
  M.water
);
lake.rotation.x = -Math.PI / 2;
lake.scale.set(1.5, 0.75, 1);
lake.position.set(340, 0.03, 120);
lake.receiveShadow = true;
world.add(lake);

for (let i = 0; i < 95; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 145 + Math.random() * 35;
  const x = 340 + Math.cos(angle) * radius;
  const z = 120 + Math.sin(angle) * radius * 0.75;

  if (Math.random() < 0.7) {
    makeTree(x, z, 0.5 + Math.random() * 0.8);
  } else {
    cone(world, x, 0.8, z, 0.5, 1.6, M.leafLight, 6);
  }
}

// Reeds around the lake.
for (let i = 0; i < 80; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 105 + Math.random() * 30;
  const x = 340 + Math.cos(angle) * radius;
  const z = 120 + Math.sin(angle) * radius * 0.75;
  cone(world, x, 0.8, z, 0.22, 1.6, M.leaf, 5);
}

/* ---------- Village ---------- */

function villageHouse(x, z, color) {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  world.add(house);

  box(house, 0, 2, 0, 9, 4, 8, material(color));
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(7, 3.2, 4),
    material(0x985b3e)
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.2;
  roof.scale.set(1, 1, 0.85);
  house.add(roof);

  box(house, 0, 1.1, -4.08, 1.4, 2.2, 0.1, M.wood);
  box(house, -2.5, 2.7, -4.1, 1.6, 1.2, 0.1, M.glass);
  box(house, 2.5, 2.7, -4.1, 1.6, 1.2, 0.1, M.glass);
}

for (let i = 0; i < 14; i++) {
  villageHouse(
    470 + (i % 5) * 18 + Math.random() * 5,
    -180 + Math.floor(i / 5) * 25 + Math.random() * 7,
    [0xe0d1b1, 0xc7d5d4, 0xd6c4a1, 0xc5c8b5][i % 4]
  );
}

/* ---------- Airport ---------- */

const airport = new THREE.Group();
airport.position.set(570, 0, 100);
world.add(airport);

box(airport, 0, 0.05, 0, 230, 0.12, 120, material(0x30383d), false);
box(airport, 0, 0.16, -65, 240, 0.12, 12, M.white, false);
box(airport, 0, 0.16, 65, 240, 0.12, 12, M.white, false);

// Runway centre dashes.
for (let x = -105; x <= 105; x += 18) {
  box(airport, x, 0.24, 0, 9, 0.025, 0.7, M.white, false);
}

// Terminal building.
box(airport, 0, 10, -92, 150, 20, 28, material(0x7e9299));
box(airport, 0, 20.3, -92, 154, 0.6, 32, material(0x27343a));
box(airport, 0, 10, -77.7, 135, 12, 0.15, material(0x243c48));

const airportSignCanvas = document.createElement("canvas");
airportSignCanvas.width = 600;
airportSignCanvas.height = 150;
const airportCtx = airportSignCanvas.getContext("2d");
airportCtx.fillStyle = "#07518a";
airportCtx.fillRect(0, 0, 600, 150);
airportCtx.fillStyle = "white";
airportCtx.font = "bold 76px Arial";
airportCtx.textAlign = "center";
airportCtx.fillText("AIRPORT", 300, 100);

const airportSign = new THREE.Mesh(
  new THREE.PlaneGeometry(28, 7),
  new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(airportSignCanvas)
  })
);
airportSign.position.set(0, 18, -76.9);
airport.add(airportSign);

// Small aircraft.
function makePlane(x, z) {
  const plane = new THREE.Group();
  plane.position.set(x, 2, z);
  airport.add(plane);

  const bodyMat = material(0xf0f0e9);
  cylinder(plane, 0, 0.6, 0, 0.65, 0.65, 13, bodyMat, 12).rotation.x = Math.PI / 2;
  box(plane, 0, 0.7, 0, 18, 0.18, 2.2, bodyMat);
  box(plane, 0, 0.7, 5.3, 5, 0.15, 1.5, bodyMat);
  box(plane, 0, 1.4, -5.2, 3, 0.12, 1.2, bodyMat);
  return plane;
}

makePlane(-35, 20);
makePlane(50, 35);

/* ---------- Player character ---------- */

const player = new THREE.Group();
scene.add(player);

const skinMat = material(0xd5a27e);
const hairMat = material(0x33251e);
const shirtMat = material(0x347fb5);
const pantsMat = material(0xd4d1bb);
const shoeMat = material(0x292b2c);

function limb(parent, x, y, z, length, radius, mat) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);

  const mesh = cylinder(
    pivot, 0, -length / 2, 0,
    radius * 0.9, radius, length, mat, 10
  );
  return pivot;
}

sphere(player, 0, 1.72, 0, 0.32, skinMat);
sphere(player, 0, 1.91, 0.04, 0.31, hairMat);
box(player, 0, 1.12, 0, 0.68, 0.78, 0.38, shirtMat);
box(player, 0, 0.68, 0, 0.64, 0.18, 0.38, shirtMat);

const playerLegL = limb(player, -0.18, 0.62, 0, 0.65, 0.13, pantsMat);
const playerLegR = limb(player, 0.18, 0.62, 0, 0.65, 0.13, pantsMat);
const playerArmL = limb(player, -0.42, 1.38, 0, 0.58, 0.11, shirtMat);
const playerArmR = limb(player, 0.42, 1.38, 0, 0.58, 0.11, shirtMat);

box(player, -0.18, 0.12, -0.04, 0.24, 0.18, 0.4, shoeMat);
box(player, 0.18, 0.12, -0.04, 0.24, 0.18, 0.4, shoeMat);

const playerState = {
  yaw: 0,
  pitch: -0.18,
  speed: 6,
  verticalVelocity: 0,
  grounded: true,
  driving: null,
  inside: null,
  animation: 0
};

player.position.set(0, 0, 18);

/* ---------- Vehicles ---------- */

const vehicles = [];

function makeCar(x, z, color, heading = 0) {
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  car.rotation.y = heading;
  world.add(car);

  const paint = material(color, 0.3, 0.35);
  const glass = material(0x263f4b, 0.18, 0.25);

  box(car, 0, 0.65, 0, 2.3, 0.7, 4.5, paint);
  box(car, 0, 1.2, -0.25, 1.9, 0.85, 2.2, paint);
  box(car, 0, 1.22, -0.25, 1.95, 0.6, 2.15, glass);

  box(car, 0, 0.48, -2.25, 1.9, 0.28, 0.12, material(0xc73c32));
  box(car, 0, 0.48, 2.25, 1.9, 0.28, 0.12, material(0xfff0c2));

  const wheels = [];
  for (const [wx, wz] of [
    [-1.08, -1.45], [1.08, -1.45],
    [-1.08, 1.45], [1.08, 1.45]
  ]) {
    const wheel = new THREE.Group();
    wheel.position.set(wx, 0.38, wz);
    car.add(wheel);

    const tyre = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.28, 14),
      M.black
    );
    tyre.rotation.z = Math.PI / 2;
    wheel.add(tyre);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.3, 12),
      M.metal
    );
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    wheels.push(wheel);
  }

  const vehicle = {
    group: car,
    wheels,
    heading,
    speed: 0,
    playerOwned: false
  };

  vehicles.push(vehicle);
  return vehicle;
}

// Only functional, enterable vehicles are placed in the city.
makeCar(-3.8, 16, 0xc52f2c, Math.PI);
makeCar(60, 16, 0x2874bd, Math.PI);
makeCar(-60, -35, 0xe0b33b, Math.PI / 2);
makeCar(120, 65, 0x39875a, -Math.PI / 2);

/* ---------- NPC characters and conversations ---------- */

const npcs = [];

const dialogueSets = {
  "Shopkeeper": [
    "Welcome! Have a look around. Let me know if you need anything.",
    "We have new items in stock today.",
    "Thanks for visiting! Have a nice day."
  ],
  "Customer": [
    "I'm just looking around the shops.",
    "This city has so many places to explore!",
    "Have you visited the lake yet? It's beautiful."
  ],
  "Resident": [
    "Hello there! Welcome to Greenfield.",
    "The mountain road has some amazing views.",
    "The airport is on the other side of the city."
  ],
  "Airport Worker": [
    "Welcome to Greenfield Airport.",
    "Please keep clear of the runway.",
    "Flights are operating normally today."
  ]
};

function makeNPC(x, z, role, shirtColor, pantsColor) {
  const npc = new THREE.Group();
  npc.position.set(x, 0, z);
  world.add(npc);

  const skin = material(0xd7a17d);
  const shirt = material(shirtColor);
  const pants = material(pantsColor);

  sphere(npc, 0, 1.55, 0, 0.25, skin);
  sphere(npc, 0, 1.72, 0.02, 0.25, hairMat);
  box(npc, 0, 1.02, 0, 0.5, 0.65, 0.3, shirt);

  const legL = limb(npc, -0.13, 0.67, 0, 0.5, 0.1, pants);
  const legR = limb(npc, 0.13, 0.67, 0, 0.5, 0.1, pants);
  const armL = limb(npc, -0.31, 1.22, 0, 0.48, 0.085, shirt);
  const armR = limb(npc, 0.31, 1.22, 0, 0.48, 0.085, shirt);

  npcs.push({
    group: npc,
    role,
    legL, legR, armL, armR,
    phase: Math.random() * 6,
    speed: 0.7 + Math.random() * 0.6,
    originX: x,
    originZ: z,
    talkCooldown: 0
  });

  return npc;
}

for (let i = 0; i < 10; i++) {
  const x = -145 + Math.random() * 290;
  const z = -145 + Math.random() * 290;

  if (Math.abs(x % 50) < 12 || Math.abs(z % 50) < 12) continue;

  makeNPC(
    x, z,
    i % 3 === 0 ? "Customer" : "Resident",
    [0x347bb5, 0x9c4d42, 0x43885a, 0xc18b35][i % 4],
    [0x303d4b, 0x45413c, 0x4b5a63][i % 3]
  );
}

const shopkeeperPositions = [
  [-75, -117], [-25, -117], [75, -117], [-75, -67],
  [75, -67], [-75, 83], [75, 83], [125, 133]
];

for (let i = 0; i < shopkeeperPositions.length; i++) {
  const [x, z] = shopkeeperPositions[i];
  makeNPC(x, z, "Shopkeeper", 0x347fb5, 0x3c4651);
}

for (let i = 0; i < 5; i++) {
  makeNPC(
    570 + Math.random() * 60,
    30 + Math.random() * 30,
    "Airport Worker",
    0x284f80,
    0x333b43
  );
}

function updateNPCs(delta, time) {
  for (const npc of npcs) {
    npc.phase += delta * npc.speed;
    npc.talkCooldown = Math.max(0, npc.talkCooldown - delta);

    const swing = Math.sin(npc.phase) * 0.3;
    npc.legL.rotation.x = swing;
    npc.legR.rotation.x = -swing;
    npc.armL.rotation.x = -swing * 0.6;
    npc.armR.rotation.x = swing * 0.6;

    if (npc.role === "Resident" || npc.role === "Customer") {
      npc.group.position.x = npc.originX + Math.sin(time * 0.25 + npc.phase) * 1.2;
      npc.group.position.z = npc.originZ + Math.cos(time * 0.22 + npc.phase) * 1.2;
    }
  }
}

/* ---------- Interaction and entering buildings ---------- */

const keys = {};
let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseSteer = 0;
let currentNPC = null;
let currentVehicle = null;
let currentBuilding = null;
let dialogueTimer = 0;

function showDialogue(name, message) {
  const dialogue = $("#dialogue");
  dialogue.innerHTML = `<strong>${name}</strong>${message}`;
  dialogue.style.display = "block";
  dialogueTimer = 5;
}

function hideDialogue() {
  $("#dialogue").style.display = "none";
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function getNearbyObjects() {
  currentNPC = null;
  currentVehicle = null;
  currentBuilding = null;

  let bestNPC = 3.5;
  for (const npc of npcs) {
    const d = distance2D(player.position, npc.group.position);
    if (d < bestNPC) {
      bestNPC = d;
      currentNPC = npc;
    }
  }

  let bestCar = 4.5;
  for (const vehicle of vehicles) {
    if (vehicle === playerState.driving) continue;
    const d = distance2D(player.position, vehicle.group.position);
    if (d < bestCar) {
      bestCar = d;
      currentVehicle = vehicle;
    }
  }

  if (!playerState.inside) {
    let bestBuilding = 4;
    for (const building of buildings) {
      if (!building.room) continue;

      const entryX = building.x;
      const entryZ = building.z - 11.5;
      const d = Math.hypot(
        player.position.x - entryX,
        player.position.z - entryZ
      );

      if (d < bestBuilding && Math.abs(player.position.x - entryX) < 3.5) {
        bestBuilding = d;
        currentBuilding = building;
      }
    }
  }
}

function enterBuilding(building) {
  if (!building || !building.room) return;

  playerState.inside = building;
  building.group.visible = false;
  building.room.visible = true;

  player.position.set(building.x, 0, building.z - 7.5);
  playerState.yaw = Math.PI;
  $("#locationLabel").textContent = building.name;
  showDialogue(building.name, "Welcome! Walk around and explore the shop.");
}

function exitBuilding() {
  const building = playerState.inside;
  if (!building) return;

  building.room.visible = false;
  building.group.visible = true;

  playerState.inside = null;
  player.position.set(building.x, 0, building.z - 14);
  $("#locationLabel").textContent = "Greenfield City";
}

function enterVehicle(vehicle) {
  if (!vehicle) return;
  playerState.driving = vehicle;
  vehicle.playerOwned = true;
  player.visible = false;
  showDialogue("Vehicle", "Use W/S to drive, A/D to steer, and E to exit.");
}

function exitVehicle() {
  const vehicle = playerState.driving;
  if (!vehicle) return;

  const x = vehicle.group.position.x + Math.sin(vehicle.heading) * 3.2;
  const z = vehicle.group.position.z + Math.cos(vehicle.heading) * 3.2;

  player.position.set(x, 0, z);
  player.visible = true;
  vehicle.speed = 0;
  playerState.driving = null;
}

function interact() {
  if (playerState.driving) {
    exitVehicle();
    return;
  }

  if (playerState.inside) {
    return;
  }

  getNearbyObjects();

  if (currentNPC) {
    const lines = dialogueSets[currentNPC.role] || dialogueSets.Resident;
    const line = lines[Math.floor(Math.random() * lines.length)];
    showDialogue(currentNPC.role, line);
    currentNPC.talkCooldown = 2;
    return;
  }

  if (currentVehicle) {
    enterVehicle(currentVehicle);
    return;
  }

  if (currentBuilding) {
    enterBuilding(currentBuilding);
  }
}

/* ---------- Player collision ---------- */

function collidesWithBuilding(x, z, radius = 0.6) {
  if (playerState.inside) return false;

  for (const b of buildingColliders) {
    const dx = Math.abs(x - b.x);
    const dz = Math.abs(z - b.z);

    if (dx < b.w / 2 + radius && dz < b.d / 2 + radius) {
      return true;
    }
  }

  return false;
}

function movePlayer(dx, dz) {
  const nextX = player.position.x + dx;
  const nextZ = player.position.z + dz;

  if (!collidesWithBuilding(nextX, player.position.z)) {
    player.position.x = nextX;
  }
  if (!collidesWithBuilding(player.position.x, nextZ)) {
    player.position.z = nextZ;
  }
}

/* ---------- Movement ---------- */

function updateWalking(delta) {
  const forward = keys.w || keys.arrowup;
  const backward = keys.s || keys.arrowdown;
  const left = keys.a || keys.arrowleft;
  const right = keys.d || keys.arrowright;

  let x = 0;
  let z = 0;

  if (forward) z -= 1;
  if (backward) z += 1;
  if (left) x -= 1;
  if (right) x += 1;

  const length = Math.hypot(x, z);
  if (length > 0) {
    x /= length;
    z /= length;

    const speed = playerState.speed * (keys.shift ? 1.65 : 1);
    const sin = Math.sin(playerState.yaw);
    const cos = Math.cos(playerState.yaw);

    const dx = (x * cos + z * sin) * speed * delta;
    const dz = (-x * sin + z * cos) * speed * delta;

    movePlayer(dx, dz);
    player.rotation.y = Math.atan2(dx, dz);
    playerState.animation += delta * (keys.shift ? 12 : 8);

    const swing = Math.sin(playerState.animation) * 0.55;
    playerLegL.rotation.x = swing;
    playerLegR.rotation.x = -swing;
    playerArmL.rotation.x = -swing * 0.8;
    playerArmR.rotation.x = swing * 0.8;
  } else {
    playerLegL.rotation.x *= 0.8;
    playerLegR.rotation.x *= 0.8;
    playerArmL.rotation.x *= 0.8;
    playerArmR.rotation.x *= 0.8;
  }

  if (keys.space && playerState.grounded) {
    playerState.verticalVelocity = 6;
    playerState.grounded = false;
  }

  playerState.verticalVelocity -= 16 * delta;
  player.position.y += playerState.verticalVelocity * delta;

  if (player.position.y <= 0) {
    player.position.y = 0;
    playerState.verticalVelocity = 0;
    playerState.grounded = true;
  }
}

function updateDriving(delta) {
  const vehicle = playerState.driving;
  if (!vehicle) return;

  if (keys.w || keys.arrowup) vehicle.speed += 17 * delta;
  if (keys.s || keys.arrowdown) vehicle.speed -= 20 * delta;

  if (!keys.w && !keys.s && !keys.arrowup && !keys.arrowdown) {
    vehicle.speed *= Math.exp(-1.8 * delta);
  }

  vehicle.speed = THREE.MathUtils.clamp(vehicle.speed, -9, 28);

  const steerKeys =
    (keys.a || keys.arrowleft ? 1 : 0) -
    (keys.d || keys.arrowright ? 1 : 0);

  const steering = THREE.MathUtils.clamp(
    steerKeys + mouseSteer, -1, 1
  );

  vehicle.heading += steering * Math.min(1, Math.abs(vehicle.speed) / 8) * 1.8 * delta;

  const oldX = vehicle.group.position.x;
  const oldZ = vehicle.group.position.z;

  vehicle.group.position.x += Math.sin(vehicle.heading) * vehicle.speed * delta;
  vehicle.group.position.z += Math.cos(vehicle.heading) * vehicle.speed * delta;

  const x = vehicle.group.position.x;
  const z = vehicle.group.position.z;

  const blocked =
    collidesWithBuilding(x, z, 1.7) ||
    Math.abs(x) > 720 ||
    Math.abs(z) > 720;

  if (blocked) {
    vehicle.group.position.set(oldX, 0, oldZ);
    vehicle.speed = 0;
  }

  vehicle.group.rotation.y = vehicle.heading;

  for (const wheel of vehicle.wheels) {
    wheel.rotation.x += vehicle.speed * delta * 2.5;
  }
}

/* ---------- Camera ---------- */

function updateCamera(delta) {
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();

  if (playerState.driving) {
    const vehicle = playerState.driving;
    target.set(
      vehicle.group.position.x,
      1.6,
      vehicle.group.position.z
    );

    desired.set(
      target.x - Math.sin(vehicle.heading + playerState.yaw) * 10,
      target.y + 4.2 + playerState.pitch * 3,
      target.z - Math.cos(vehicle.heading + playerState.yaw) * 10
    );
  } else {
    target.set(
      player.position.x,
      player.position.y + 1.35,
      player.position.z
    );

    const distance = playerState.inside ? 7 : 8;
    desired.set(
      target.x - Math.sin(playerState.yaw) * distance * Math.cos(playerState.pitch),
      target.y + 2.3 + Math.sin(playerState.pitch) * 5,
      target.z - Math.cos(playerState.yaw) * distance * Math.cos(playerState.pitch)
    );
  }

  camera.position.lerp(desired, 1 - Math.exp(-7 * delta));
  camera.lookAt(target);
}

/* ---------- Mouse camera and controls ---------- */

renderer.domElement.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  mouseDown = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
});

window.addEventListener("mouseup", () => {
  mouseDown = false;
  mouseSteer = 0;
});

window.addEventListener("mousemove", (event) => {
  if (!mouseDown) return;

  const dx = event.clientX - lastMouseX;
  const dy = event.clientY - lastMouseY;

  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  const sensitivity = Number($("#sensitivityControl").value) / 5;
  playerState.yaw -= dx * 0.004 * sensitivity;
  playerState.pitch = THREE.MathUtils.clamp(
    playerState.pitch - dy * 0.003 * sensitivity,
    -0.8, 0.45
  );

  if (playerState.driving) {
    mouseSteer = THREE.MathUtils.clamp(dx * 0.018, -1, 1);
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }

  if (key === "e" && !event.repeat) interact();
  if (key === "m" && !event.repeat) toggleMap();
  if (key === "escape") {
    $("#settingsOverlay").classList.add("hidden");
    $("#mapOverlay").classList.add("hidden");
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

/* ---------- Minimap ---------- */

function drawMap(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#77ad68";
  ctx.fillRect(0, 0, w, h);

  const scale = Math.min(w, h) / 900;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);

  // Lake.
  ctx.fillStyle = "#147ca4";
  ctx.beginPath();
  ctx.ellipse(340, 120, 150, 75, 0, 0, Math.PI * 2);
  ctx.fill();

  // Airport.
  ctx.fillStyle = "#3c454a";
  ctx.fillRect(455, 35, 230, 120);

  // Roads.
  ctx.fillStyle = "#454b50";
  for (const line of roadLines) {
    ctx.fillRect(line - 7, -180, 14, 360);
    ctx.fillRect(-180, line - 7, 360, 14);
  }

  // Buildings.
  ctx.fillStyle = "#a7aeb0";
  for (const b of buildings) {
    ctx.fillRect(b.x - 9, b.z - 9, 18, 18);
  }

  // Village.
  ctx.fillStyle = "#9e7756";
  ctx.fillRect(450, -210, 120, 90);

  // Player.
  ctx.translate(player.position.x, player.position.z);
  ctx.rotate(-playerState.yaw);
  ctx.fillStyle = "#f6e8dc";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-7, 8);
  ctx.lineTo(7, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function toggleMap() {
  $("#mapOverlay").classList.toggle("hidden");
  drawMap($("#largeMap"));
}

/* ---------- Day and night cycle ---------- */

let worldTime = 0;

function updateDayNight(delta) {
  worldTime += delta * 0.004;

  const daylight = (Math.sin(worldTime) + 1) / 2;
  const night = 1 - daylight;

  sun.intensity = 0.25 + daylight * 2.0;
  hemi.intensity = 0.35 + daylight * 1.1;

  const skyDay = new THREE.Color(0x8fc6ec);
  const skyNight = new THREE.Color(0x101b35);
  scene.background.copy(skyNight).lerp(skyDay, daylight);

  const fogDay = new THREE.Color(0x9cc9e5);
  const fogNight = new THREE.Color(0x17233a);
  scene.fog.color.copy(fogNight).lerp(fogDay, daylight);

  $("#timeLabel").textContent =
    daylight > 0.65 ? "Daytime" :
    daylight > 0.35 ? "Evening" : "Night";
}

/* ---------- UI ---------- */

$("#mapButton").addEventListener("click", toggleMap);
$("#miniMapWrap").addEventListener("click", toggleMap);
$("#closeMap").addEventListener("click", () => {
  $("#mapOverlay").classList.add("hidden");
});

$("#settingsButton").addEventListener("click", () => {
  $("#settingsOverlay").classList.remove("hidden");
});

$("#closeSettings").addEventListener("click", () => {
  $("#settingsOverlay").classList.add("hidden");
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((panel) => panel.classList.add("hidden"));

    button.classList.add("active");
    $("#" + button.dataset.tab).classList.remove("hidden");
  });
});

$("#speedControl").addEventListener("input", (event) => {
  playerState.speed = Number(event.target.value);
});

$("#crosshairToggle").addEventListener("change", (event) => {
  $("#crosshair").style.display = event.target.checked ? "block" : "none";
});

$("#promptsToggle").addEventListener("change", () => {
  updatePrompt();
});

$("#shadowsToggle").addEventListener("change", (event) => {
  renderer.shadowMap.enabled = event.target.checked;
  sun.castShadow = event.target.checked;
});

$("#qualityControl").addEventListener("change", (event) => {
  const quality = event.target.value;
  const ratio = quality === "high" ? 1.75 : quality === "medium" ? 1.35 : 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, ratio));
  renderer.shadowMap.enabled = quality !== "low" && $("#shadowsToggle").checked;
  sun.shadow.mapSize.set(
    quality === "high" ? 2048 : quality === "medium" ? 1024 : 512,
    quality === "high" ? 2048 : quality === "medium" ? 1024 : 512
  );
});

$("#resetPosition").addEventListener("click", () => {
  if (playerState.inside) exitBuilding();
  if (playerState.driving) exitVehicle();

  player.position.set(0, 0, 18);
  playerState.yaw = 0;
  $("#locationLabel").textContent = "City Centre";
  $("#settingsOverlay").classList.add("hidden");
});

function updatePrompt() {
  const prompt = $("#prompt");

  if (!$("#promptsToggle").checked) {
    prompt.style.display = "none";
    return;
  }

  if (playerState.driving) {
    prompt.textContent = "E — Exit vehicle";
    prompt.style.display = "block";
  } else if (playerState.inside) {
    const building = playerState.inside;
    if (player.position.z < building.z - 7.5) {
      prompt.textContent = "Walk toward the entrance to leave";
    } else {
      prompt.textContent = "Explore the shop";
    }
    prompt.style.display = "block";
  } else if (currentNPC) {
    prompt.textContent = "E — Talk to " + currentNPC.role;
    prompt.style.display = "block";
  } else if (currentVehicle) {
    prompt.textContent = "E — Enter vehicle";
    prompt.style.display = "block";
  } else if (currentBuilding) {
    prompt.textContent = "Walk forward to enter " + currentBuilding.name;
    prompt.style.display = "block";
  } else {
    prompt.style.display = "none";
  }
}

/* ---------- Automatic shop entry and exit ---------- */

function updateBuildingTransitions() {
  if (playerState.inside) {
    const b = playerState.inside;

    if (player.position.z < b.z - 11.5) {
      exitBuilding();
    }
    return;
  }

  for (const b of buildings) {
    if (!b.room) continue;

    const atEntrance =
      Math.abs(player.position.x - b.x) < 2.8 &&
      Math.abs(player.position.z - (b.z - 11.2)) < 1.8;

    if (atEntrance) {
      enterBuilding(b);
      break;
    }
  }
}

/* ---------- Main update loop ---------- */

function update(delta, time) {
  updateDayNight(delta);
  updateNPCs(delta, time);

  if (playerState.driving) {
    updateDriving(delta);
  } else {
    updateWalking(delta);
  }

  updateBuildingTransitions();
  getNearbyObjects();
  updatePrompt();

  if (dialogueTimer > 0) {
    dialogueTimer -= delta;
    if (dialogueTimer <= 0) hideDialogue();
  }

  updateCamera(delta);

  if (Math.floor(time * 2) !== Math.floor((time - delta) * 2)) {
    drawMap($("#miniMap"));
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;

  update(delta, time);
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
});

// Initial map and camera.
drawMap($("#miniMap"));
camera.position.set(0, 5, 28);
camera.lookAt(player.position);
animate();
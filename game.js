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
  
road: new THREE.MeshStandardMaterial({
  color: 0x34383c,
  roughness: 0.96,
  metalness: 0
}),

roadLine: new THREE.MeshStandardMaterial({
  color: 0xf8e9a5,
  roughness: 0.65
}),

sidewalk: new THREE.MeshStandardMaterial({
  color: 0xb9b9b5,
  roughness: 0.92
}),

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

/* ---------- Realistic asphalt texture ---------- */

function createAsphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#34383c";
  ctx.fillRect(0, 0, 512, 512);

  // Tiny asphalt stones
  for (let i = 0; i < 18000; i++) {
    const shade = Math.random() * 45 + 35;

    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;

    ctx.fillRect(
      Math.random() * 512,
      Math.random() * 512,
      Math.random() * 2 + 0.3,
      Math.random() * 2 + 0.3
    );
  }

  // Very subtle road wear
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = "rgba(10,10,10,0.035)";
    ctx.fillRect(
      Math.random() * 512,
      Math.random() * 512,
      Math.random() * 100 + 10,
      Math.random() * 4 + 1
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return texture;
}

const asphaltTexture = createAsphaltTexture();

M.road.map = asphaltTexture;
M.road.color.set(0xffffff);
M.road.needsUpdate = true;


const roadLines = [-150, -100, -50, 0, 50, 100, 150];
const roadWidth = 14;
const cityLimit = 180;

const sidewalkWidth = 3;
const sidewalkOffset = roadWidth / 2 + sidewalkWidth / 2;
const intersectionGap = roadWidth + 8;

// Roads
for (const line of roadLines) {

  // Main vertical and horizontal roads
  box(
    world,
    line, 0.01, 0,
    roadWidth, 0.12, cityLimit * 2,
    M.road, false
  );

  box(
    world,
    0, 0.01, line,
    cityLimit * 2, 0.12, roadWidth,
    M.road, false
  );

  // Dashed road centre lines with intersection gaps
  for (let p = -cityLimit + 5; p < cityLimit; p += 15) {

    const nearIntersection = roadLines.some(
      r => Math.abs(p - r) < intersectionGap
    );

    if (!nearIntersection) {
      box(
        world,
        line, 0.085, p,
        0.18, 0.025, 6,
        M.roadLine, false
      );

      box(
        world,
        p, 0.085, line,
        6, 0.025, 0.18,
        M.roadLine, false
      );
    }
  }

  // Sidewalks with gaps at intersections
  for (const side of [-1, 1]) {

    const sidewalkX = line + side * sidewalkOffset;

    // Vertical sidewalk segments
    for (let i = 0; i < roadLines.length - 1; i++) {
      const start = roadLines[i] + intersectionGap / 2;
      const end = roadLines[i + 1] - intersectionGap / 2;

      box(
        world,
        sidewalkX,
        0.09,
        (start + end) / 2,
        sidewalkWidth,
        0.2,
        end - start,
        M.sidewalk,
        false
      );
    }

    // Horizontal sidewalk segments
    const sidewalkZ = line + side * sidewalkOffset;

    for (let i = 0; i < roadLines.length - 1; i++) {
      const start = roadLines[i] + intersectionGap / 2;
      const end = roadLines[i + 1] - intersectionGap / 2;

      box(
        world,
        (start + end) / 2,
        0.09,
        sidewalkZ,
        end - start,
        0.2,
        sidewalkWidth,
        M.sidewalk,
        false
      );
    }
  }
}

// Crosswalks
for (const x of [-100, 0, 100]) {
  for (const z of [-100, 0, 100]) {

    for (let i = -4; i <= 4; i++) {

      box(
        world,
        x + i * 1.05,
        0.09,
        z - 9,
        0.65,
        0.025,
        2.8,
        M.white,
        false
      );

      box(
        world,
        x - 9,
        0.09,
        z + i * 1.05,
        2.8,
        0.025,
        0.65,
        M.white,
        false
      );
    }
  }
}
/* ---------- Trees and street lamps ---------- */

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

// Trees
for (let i = 0; i < 250; i++) {
  const x = -420 + Math.random() * 840;
  const z = -420 + Math.random() * 840;

  const nearCity = Math.abs(x) < 185 && Math.abs(z) < 185;
  const nearLake = x > 230 && x < 400 && z > 60 && z < 260;

  if (!nearCity && !nearLake) {
    makeTree(x, z, 0.65 + Math.random() * 1.1);
  }
}

// Street lamps
function makeLamp(x, z, rotation = 0) {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0, z);
  lamp.rotation.y = rotation;
  world.add(lamp);

  // Lamp pole
  cylinder(lamp, 0, 2.5, 0, 0.08, 0.12, 5, M.metal);

  // Lamp arm
  box(lamp, 0.55, 4.9, 0, 1.1, 0.09, 0.09, M.metal);

  // Lamp light
  sphere(
    lamp,
    1.0,
    4.8,
    0,
    0.22,
    material(0xffedb2)
  );
}

// Place lamps along the sidewalks
const lampOffset = roadWidth / 2 + 3.5;

for (const line of roadLines) {

  for (let p = -140; p <= 140; p += 40) {

    // Avoid placing lamps directly at intersections
    const nearIntersection = roadLines.some(
      r => Math.abs(p - r) < 16
    );

    if (nearIntersection) continue;

    // Vertical road: both sides
    makeLamp(line + lampOffset, p, Math.PI);
    makeLamp(line - lampOffset, p, 0);

    // Horizontal road: both sides
    makeLamp(p, line + lampOffset, -Math.PI / 2);
    makeLamp(p, line - lampOffset, Math.PI / 2);
  }
}
/* ---------- City buildings ---------- */


/* ============================================================
   GREENFIELD CITY 3D - COMPLETE BUILDING SYSTEM
   Unique interiors, shop designs, windows and front signs
============================================================ */

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

const B = {
  glass: new THREE.MeshStandardMaterial({
    color: 0x91c6d9,
    metalness: 0.35,
    roughness: 0.18
  }),
  darkGlass: new THREE.MeshStandardMaterial({
    color: 0x243b49,
    metalness: 0.55,
    roughness: 0.2
  }),
  frame: material(0x303b43),
  gold: material(0xc5a35b),
  white: material(0xf1eee5),
  wood: material(0x795034),
  metal: material(0x626d75)
};

function bBox(parent, x, y, z, w, h, d, color) {
  return box(parent, x, y, z, w, h, d, material(color));
}

function bPoster(parent, label, x, y, z, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), 256, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1.25),
    new THREE.MeshBasicMaterial({ map: texture })
  );

  poster.position.set(x, y, z);
  parent.add(poster);
  return poster;
}

/* ---------- Front-facing signboards ---------- */

function addSign(parent, label, color, width = 12) {
  const sign = new THREE.Group();
  sign.position.set(0, 3.8, -10.38);

  bBox(sign, 0, 0, 0, width, 1.15, 0.22, color);

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 180;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, 1024, 180);

  ctx.strokeStyle = "#f5dfad";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 1012, 168);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 66px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), 512, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.3, 1),
    new THREE.MeshBasicMaterial({ map: texture })
  );

  // Front of building is -Z.
  face.rotation.y = Math.PI;
  face.position.z = -0.125;

  sign.add(face);
  parent.add(sign);

  return sign;
}

/* ---------- Furniture ---------- */

function bCounter(room, x, z, width, color = 0x795034) {
  bBox(room, x, 0.65, z, width, 1.3, 1.1, color);
  bBox(room, x, 1.34, z, width + 0.15, 0.12, 1.25, 0xe0d5bd);
}

function bShelf(room, x, z, color = 0x795034) {
  bBox(room, x, 1.5, z, 2.7, 3, 0.65, color);

  for (let y = 0.65; y < 2.8; y += 0.65) {
    bBox(room, x, y, z - 0.36, 2.6, 0.08, 0.8, 0xe6dfd1);
  }
}

function bTable(room, x, z, color = 0x95623d) {
  cylinder(room, x, 0.9, z, 0.85, 0.85, 0.16, material(color), 20);

  for (const dx of [-0.6, 0.6]) {
    for (const dz of [-0.6, 0.6]) {
      cylinder(
        room, x + dx, 0.4, z + dz,
        0.07, 0.07, 0.8, B.metal
      );
    }
  }
}

function bSofa(room, x, z, color = 0x526d82) {
  bBox(room, x, 0.65, z, 3.5, 0.8, 1.2, color);
  bBox(room, x, 1.2, z + 0.45, 3.5, 1, 0.3, color);

  for (const dx of [-1.5, 1.5]) {
    bBox(room, x + dx, 1.1, z, 0.35, 0.8, 1, color);
  }
}

/* ---------- Shop products ---------- */

function bProduct(room, x, y, z, color) {
  bBox(room, x, y, z, 0.4, 0.65, 0.35, color);
}

/* ---------- Unique interior creation ---------- */

function createInterior(building, kind, signName) {
  const room = new THREE.Group();

  room.position.set(building.x, 0, building.z);
  room.visible = false;
  world.add(room);

  const floorColors = {
    "Electronics Store": 0x9baeb4,
    "Clothing Store": 0xd5c8b4,
    "Pizza Planet": 0xc9a77e,
    "Burger Bar": 0x8b674d,
    "Grocery Shop": 0xc8c9a9,
    "Book Shop": 0x927d68,
    "Travel Agency": 0xc7d7d4,
    "Watch Shop": 0xaaa69b,
    "Home": 0x9d876c,
    "Bank": 0xb7b4a8,
    "Hospital": 0xe6e8e4,
    "Medical Centre": 0xe6e8e4,
    "Apartment": 0xaaa69d,
    "Office Tower": 0xaab5bb
  };

  const floor = floorColors[kind] ?? 0xc4b9a6;
  const wall = kind === "Hospital" ||
    kind === "Medical Centre" ? 0xf3f4f0 : 0xe9e2d6;

  // Floor and walls.
  bBox(room, 0, -0.05, 0, 20, 0.2, 20, floor);

  bBox(room, -10, 3, 0, 0.25, 6, 20, wall);
  bBox(room, 10, 3, 0, 0.25, 6, 20, wall);
  bBox(room, 0, 3, 10, 20, 6, 0.25, wall);

  // Front wall with open doorway.
  bBox(room, -7, 3, -10, 6, 6, 0.25, wall);
  bBox(room, 7, 3, -10, 6, 6, 0.25, wall);
  bBox(room, 0, 5.85, -10, 8, 0.3, 0.25, wall);

  // Ceiling.
  bBox(room, 0, 6.1, 0, 20, 0.2, 20, 0xd9d8d1);

  // Interior lights.
  for (const x of [-6, 0, 6]) {
    const light = new THREE.PointLight(0xffe8c5, 13, 18);
    light.position.set(x, 4.8, 0);
    room.add(light);

    bBox(room, x, 5.95, 0, 1.3, 0.08, 0.45, 0xffffff);
  }

  /* ELECTRONICS STORE */

  if (kind === "Electronics Store") {
    bCounter(room, 0, -6, 12, 0x344e5b);

    for (let i = 0; i < 5; i++) {
      const x = -4.5 + i * 2.25;

      bBox(room, x, 1.95, -6.5, 0.8, 0.95, 0.12, 0x172b36);
      bBox(room, x, 1.95, -6.42, 0.68, 0.75, 0.025, 0x42b8e0);
    }

    bShelf(room, -7, 2, 0x3e515a);
    bShelf(room, 7, 2, 0x3e515a);

    bPoster(room, "LATEST PHONES", 0, 4.4, 9.85, 0x174b64);
    bPoster(room, "GAMING & AUDIO", -7, 3.8, -9.85, 0x174b64);
  }

  /* CLOTHING STORE */

  else if (kind === "Clothing Store") {
    bCounter(room, 0, 6, 8, 0x80543c);

    for (const x of [-6, -2, 2, 6]) {
      bBox(room, x, 3, -4, 0.12, 0.12, 5, 0x50575c);

      for (let i = 0; i < 4; i++) {
        bProduct(
          room,
          x - 0.5 + i * 0.33,
          2.2,
          -4,
          [0xd64e61, 0x3476bb, 0x51a36c, 0xe4ba45][i]
        );
      }
    }

    bPoster(room, "NEW COLLECTION", 0, 4.4, 9.85, 0x8b3760);
    bPoster(room, "SALE 50%", -7, 3.8, -9.85, 0x8b3760);
  }

  /* PIZZA PLANET */

  else if (kind === "Pizza Planet") {
    bCounter(room, 0, -6, 12, 0x9b4e2f);

    for (const x of [-5, 0, 5]) {
      bTable(room, x, 2);
      bTable(room, x, 6);
    }

    bPoster(room, "HOT FRESH PIZZA", 0, 4.4, 9.85, 0xa52d20);
  }

  /* BURGER BAR */

  else if (kind === "Burger Bar") {
    bCounter(room, 0, -6, 12, 0x613b25);

    for (const x of [-5, 0, 5]) {
      bTable(room, x, 2, 0x85502f);
      bTable(room, x, 6, 0x85502f);
    }

    bPoster(room, "BEST BURGERS", 0, 4.4, 9.85, 0x98451e);
  }

  /* GROCERY SHOP */

  else if (kind === "Grocery Shop") {
    bCounter(room, 0, -6, 8, 0x416c40);

    for (const x of [-7, -3, 3, 7]) {
      bShelf(room, x, 3, 0x477247);

      for (let i = 0; i < 4; i++) {
        bProduct(
          room,
          x - 0.8 + i * 0.5,
          1.4,
          2.55,
          [0x56a05c, 0xd8a33c, 0xc65345, 0x4a8cae][i]
        );
      }
    }

    bPoster(room, "FRESH FOOD DAILY", 0, 4.4, 9.85, 0x387c48);
  }

  /* BOOK SHOP */

  else if (kind === "Book Shop") {
    for (const x of [-7, -3, 3, 7]) {
      bShelf(room, x, 2, 0x65452e);

      for (let i = 0; i < 4; i++) {
        bBox(
          room,
          x - 0.8 + i * 0.5,
          2,
          1.55,
          0.35,
          1.1,
          0.12,
          [0x9b3028, 0x315d9b, 0x4d804a, 0xb58b3a][i]
        );
      }
    }

    bCounter(room, 0, -6, 7);
    bPoster(room, "BOOK WORLD", 0, 4.4, 9.85, 0x465c9a);
  }

  /* TRAVEL AGENCY */

  else if (kind === "Travel Agency") {
    bCounter(room, 0, -6, 10, 0x39766d);

    for (const x of [-6, 0, 6]) {
      bSofa(room, x, 2, 0x357c83);
    }

    bPoster(room, "EXPLORE THE WORLD", 0, 4.4, 9.85, 0x16716f);
    bPoster(room, "FLIGHTS & HOLIDAYS", -7, 3.8, -9.85, 0x16716f);
  }

  /* WATCH SHOP */

  else if (kind === "Watch Shop") {
    bCounter(room, 0, -5, 12, 0x302d29);

    for (const x of [-6, -2, 2, 6]) {
      cylinder(
        room, x, 1.9, -5.3,
        0.65, 0.65, 0.2, B.gold, 24
      );

      cylinder(
        room, x, 2.05, -5.3,
        0.45, 0.45, 0.08, B.darkGlass, 24
      );
    }

    bPoster(room, "LUXURY COLLECTION", 0, 4.4, 9.85, 0x28231b);
  }

  /* HOMES */

  else if (kind === "Home") {
    bSofa(room, -4, 3, 0x506c80);
    bTable(room, -4, 6);

    bBox(room, 5, 0.8, 5, 4, 1.5, 4, 0x92704f);
    bBox(room, 5, 1.65, 5, 4.1, 0.2, 4.1, 0xe9dfcc);

    bPoster(room, "HOME SWEET HOME", 0, 4.4, 9.85, 0x75553c);
  }

  /* BANK */

  else if (kind === "Bank") {
    bCounter(room, 0, -6, 14, 0x665b47);
    bSofa(room, -5, 3, 0x35485a);

    for (const x of [-5, 0, 5]) {
      bBox(room, x, 1.5, -6, 0.2, 2.5, 0.2, 0xb99b5d);
      bBox(room, x, 2.7, -6, 2.5, 0.15, 0.3, 0xb99b5d);
    }

    bPoster(room, "CITY FINANCE", 0, 4.4, 9.85, 0x6b5735);
  }

  /* HOSPITAL */

  else if (kind === "Hospital" || kind === "Medical Centre") {
    bCounter(room, 0, -6, 14, 0xd8ddd8);

    for (const x of [-6, 0, 6]) {
      bBox(room, x, 0.7, 3, 2.5, 0.4, 4, 0xffffff);
      bBox(room, x, 1.15, 3, 2.5, 0.12, 4, 0x9ac9d5);
    }

    bPoster(room, "RECEPTION", 0, 4.4, 9.85, 0x337b91);
    bPoster(room, "EMERGENCY", -7, 3.8, -9.85, 0x9b3030);
  }

  /* APARTMENTS */

  else if (kind === "Apartment") {
    bSofa(room, -4, 3, 0x667c91);
    bTable(room, -4, 6);

    bBox(room, 5, 0.8, 4, 4, 1.5, 4, 0x755039);
    bBox(room, 5, 1.7, 4, 4, 0.2, 4, 0xd4c9ae);

    bPoster(room, "APARTMENT LOUNGE", 0, 4.4, 9.85, 0x526777);
  }

  /* OFFICE TOWER */

  else if (kind === "Office Tower") {
    bCounter(room, 0, -6, 14, 0x536b79);

    for (const x of [-6, 0, 6]) {
      bBox(room, x, 1.4, 2, 2.5, 2.8, 1.2, 0x4e6472);
      bBox(room, x, 2.85, 2, 2.6, 0.12, 1.3, 0x8ba9b5);
    }

    bPoster(room, "BUSINESS CENTRE", 0, 4.4, 9.85, 0x354a63);
  }

  return room;
}

/* ---------- Building exterior ---------- */

function createBuilding(
  x, z, name, type, height, color, signColor = 0x31566a
) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  world.add(group);

  const w = 20;
  const d = 20;

  const wall = material(color);
  const roof = material(0x46535b);

  bBox(group, 0, height / 2, 0, w, height, d, color);
  bBox(group, 0, height + 0.18, 0, w + 0.8, 0.36, d + 0.8, 0x46535b);

  // Windows.
  const floors = Math.floor((height - 1) / 3.5);

  for (let floor = 0; floor < floors; floor++) {
    const y = 2 + floor * 3.5;

    for (let wx = -7; wx <= 7; wx += 3.5) {
      bBox(group, wx, y, -10.12, 1.5, 1.8, 0.06, 0x8dc6d9);
      bBox(group, wx, y, 10.12, 1.5, 1.8, 0.06, 0x8dc6d9);

      bBox(group, wx - 0.8, y, -10.16, 0.08, 1.95, 0.08, 0x303b43);
      bBox(group, wx + 0.8, y, -10.16, 0.08, 1.95, 0.08, 0x303b43);
    }

    for (let wz = -7; wz <= 7; wz += 3.5) {
      bBox(group, -10.12, y, wz, 0.06, 1.8, 1.5, 0x8dc6d9);
      bBox(group, 10.12, y, wz, 0.06, 1.8, 1.5, 0x8dc6d9);
    }
  }

  // Shopfront with a central open entrance.
  const isShop = shopTypes.includes(type);

  if (isShop) {
    bBox(group, -6, 1.6, -10.2, 6, 3, 0.12, 0x91c6d9);
    bBox(group, 6, 1.6, -10.2, 6, 3, 0.12, 0x91c6d9);
    bBox(group, 0, 3.1, -10.25, 12, 0.2, 0.2, signColor);
  }

  // Main entrance pillars.
  if (!isShop) {
    bBox(group, -4.5, 1.7, -10.25, 0.4, 3.4, 0.5, 0xe0ded6);
    bBox(group, 4.5, 1.7, -10.25, 0.4, 3.4, 0.5, 0xe0ded6);
  }

  // Correctly facing sign.
  addSign(group, name, signColor, 13);

  // Building data.
  const building = {
    group,
    x,
    z,
    w,
    d,
    height,
    name,
    type,
    room: null
  };

  // Only shops and low-rise buildings receive ground-floor interiors.
  if (height <= 25 || isShop) {
    building.room = createInterior(building, type, name);
  }

  buildings.push(building);

  buildingColliders.push({
    x, z, w, d, building
  });

  return building;
}

/* ---------- Greenfield City layout ---------- */

const cityPlan = [
  [-125,-125,"MAPLE HOUSE","Home",9,0xd5bd99,0x92543b],
  [-75,-125,"NOVA PHONES","Electronics Store",12,0x8d999c,0x14506c],
  [-25,-125,"PIZZA PLANET","Pizza Planet",8,0xd6c9ae,0x9b3028],
  [25,-125,"CIVIC TOWER","Office Tower",58,0x9aa9ad,0x21475d],
  [75,-125,"FASHION HOUSE","Clothing Store",9,0xd7c8ae,0x8b3760],
  [125,-125,"GREEN MARKET","Grocery Shop",10,0xc7c0a6,0x387c48],

  [-125,-75,"PARKVIEW","Apartment",42,0x9aa7ac,0x526777],
  [-75,-75,"BURGER BAR","Burger Bar",8,0xcab99f,0x98552a],
  [75,-75,"BOOK WORLD","Book Shop",9,0xc1b9a4,0x465c9a],
  [125,-75,"CITY FINANCE","Bank",18,0xb5a98c,0x6b5735],

  [-125,75,"GREENFIELD HOSPITAL","Hospital",25,0xe2e5e1,0x9b3030],
  [-75,75,"SUNNY TRAVEL","Travel Agency",9,0xc9c0a8,0x16716f],
  [75,75,"LUXE WATCHES","Watch Shop",10,0xaaa69b,0x28231b],
  [125,75,"SKYLINE TOWER","Office Tower",64,0x8e9da5,0x354a63],

  [-125,125,"FAMILY HOUSE","Home",8,0xd8c29e,0x92543b],
  [-75,125,"CITY APARTMENTS","Apartment",36,0x9eaaad,0x526777],
  [75,125,"CORNER STORE","Grocery Shop",8,0xcdbb9e,0x387c48],
  [125,125,"MEDICAL CENTRE","Medical Centre",20,0xe2e5e1,0x9b3030]
];

for (const item of cityPlan) {
  createBuilding(...item);
}

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
  const forward = keys. s|| keys.arrowup;
  const backward = keys. w|| keys.arrowdown;
  const left = keys. d|| keys.arrowleft;
  const right = keys. a|| keys.arrowright;

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
updateMobileJoystickKeys();
updateMobileActionButton();

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


/* ==========================================
   GREENFIELD CITY 3D - MOBILE CONTROLS
   ========================================== */

let mobileStickX = 0;
let mobileStickY = 0;
let mobileControlsReady = false;

function setupMobileControls() {
  if (mobileControlsReady) return;
  mobileControlsReady = true;

  const isMobile =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window ||
    window.matchMedia("(pointer: coarse)").matches;

  if (!isMobile) return;

  const css = document.createElement("style");

  css.textContent = `
    #mobile-controls {
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      touch-action: none;
      user-select: none;
      font-family: Arial;
    }

    #mobile-camera {
      position: absolute;
      right: 0;
      top: 10%;
      width: 55%;
      height: 65%;
      pointer-events: auto;
      touch-action: none;
    }

    #mobile-joystick {
      position: absolute;
      left: 25px;
      bottom: 30px;
      width: 145px;
      height: 145px;
      border-radius: 50%;
      background: rgba(30,40,55,.35);
      border: 3px solid rgba(255,255,255,.5);
      pointer-events: auto;
      touch-action: none;
    }

    #mobile-stick {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 65px;
      height: 65px;
      border-radius: 50%;
      background: rgba(255,255,255,.9);
      border: 3px solid white;
      box-shadow: 0 4px 12px #0006;
      transform: translate(-50%,-50%);
      pointer-events: none;
    }

    .mobile-button {
      position: absolute;
      border-radius: 50%;
      color: white;
      font-weight: bold;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      pointer-events: auto;
      touch-action: none;
      user-select: none;
      box-shadow: 0 4px 12px #0006;
    }

    #mobile-jump {
      width: 78px;
      height: 78px;
      right: 28px;
      bottom: 30px;
      background: #2788ff;
    }

    #mobile-car {
      width: 75px;
      height: 75px;
      right: 35px;
      bottom: 125px;
      background: #19a85b;
      display: none;
      font-size: 12px;
    }

    .mobile-button:active {
      transform: scale(.9);
    }

    @media (orientation: portrait) {
      #mobile-controls {
        display: none;
      }
    }
  `;

  document.head.appendChild(css);

  const ui = document.createElement("div");
  ui.id = "mobile-controls";

  ui.innerHTML = `
    <div id="mobile-camera"></div>

    <div id="mobile-joystick">
      <div id="mobile-stick"></div>
    </div>

    <button id="mobile-jump" class="mobile-button">
      JUMP
    </button>

    <button id="mobile-car" class="mobile-button">
      ENTER CAR
    </button>
  `;

  document.body.appendChild(ui);

  const joystick = document.getElementById("mobile-joystick");
  const stick = document.getElementById("mobile-stick");
  const jump = document.getElementById("mobile-jump");
  const car = document.getElementById("mobile-car");
  const camera = document.getElementById("mobile-camera");

  let joyPointer = null;
  let camPointer = null;
  let lastX = 0;
  let lastY = 0;

  const maxDistance = 43;

  /* JOYSTICK */

  function resetStick() {
    mobileStickX = 0;
    mobileStickY = 0;

    joyPointer = null;

    stick.style.left = "50%";
    stick.style.top = "50%";
  }

  function moveStick(e) {
    const rect = joystick.getBoundingClientRect();

    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);

    const distance = Math.hypot(dx, dy);

    if (distance > maxDistance) {
      dx = dx / distance * maxDistance;
      dy = dy / distance * maxDistance;
    }

    mobileStickX = dx / maxDistance;
    mobileStickY = dy / maxDistance;

    stick.style.left = `calc(50% + ${dx}px)`;
    stick.style.top = `calc(50% + ${dy}px)`;
  }

  joystick.addEventListener("pointerdown", e => {
    e.preventDefault();

    if (joyPointer !== null) return;

    joyPointer = e.pointerId;
    joystick.setPointerCapture(e.pointerId);

    moveStick(e);
  });

  joystick.addEventListener("pointermove", e => {
    if (e.pointerId !== joyPointer) return;
    moveStick(e);
  });

  joystick.addEventListener("pointerup", resetStick);
  joystick.addEventListener("pointercancel", resetStick);
  joystick.addEventListener("lostpointercapture", resetStick);

  /* JUMP BUTTON */

  function jumpDown(e) {
    e.preventDefault();
    keys.space = true;
  }

  function jumpUp() {
    keys.space = false;
  }

  jump.addEventListener("pointerdown", jumpDown);
  jump.addEventListener("pointerup", jumpUp);
  jump.addEventListener("pointercancel", jumpUp);
  jump.addEventListener("lostpointercapture", jumpUp);

  /* CAMERA SWIPE */

  camera.addEventListener("pointerdown", e => {
    camPointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;

    camera.setPointerCapture(e.pointerId);
  });

  camera.addEventListener("pointermove", e => {
    if (e.pointerId !== camPointer) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    lastX = e.clientX;
    lastY = e.clientY;

    playerState.yaw -= dx * 0.004;

    playerState.pitch = THREE.MathUtils.clamp(
      playerState.pitch - dy * 0.003,
      -0.8,
      0.45
    );
  });

  camera.addEventListener("pointerup", () => camPointer = null);
  camera.addEventListener("pointercancel", () => camPointer = null);

  /* CAR BUTTON */

  car.addEventListener("pointerdown", e => {
    e.preventDefault();

    if (playerState.driving) {
      exitVehicle();
    } else {
      getNearbyObjects();

      if (currentVehicle) {
        enterVehicle(currentVehicle);
      }
    }

    updateMobileActionButton();
  });

  window.addEventListener("blur", () => {
    resetStick();
    jumpUp();
    camPointer = null;
  });

  window.addEventListener("contextmenu", e => {
    if (e.target.closest("#mobile-controls")) {
      e.preventDefault();
    }
  });
}

/* JOYSTICK MOVEMENT */

function updateMobileJoystickKeys() {
  if (!document.getElementById("mobile-controls")) return;

  const deadZone = 0.18;

  const up = mobileStickY < -deadZone;
  const down = mobileStickY > deadZone;
  const left = mobileStickX < -deadZone;
  const right = mobileStickX > deadZone;

  if (playerState.driving) {
    keys.w = up;
    keys.s = down;
    keys.a = left;
    keys.d = right;
  } else {
    keys.s = up;
    keys.w = down;
    keys.d = left;
    keys.a = right;
  }
}

/* CAR BUTTON VISIBILITY */

function updateMobileActionButton() {
  const button = document.getElementById("mobile-car");

  if (!button) return;

  if (playerState.driving) {
    button.style.display = "flex";
    button.innerHTML = "EXIT<br>CAR";
  } else if (currentVehicle && !playerState.inside) {
    button.style.display = "flex";
    button.innerHTML = "ENTER<br>CAR";
  } else {
    button.style.display = "none";
  }
}
setupMobileControls();
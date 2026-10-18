
/* NAOL GANGSTER - OPEN WORLD */
const S = new THREE.Scene();
S.background = new THREE.Color(0x91c7ed);
S.fog = new THREE.Fog(0x91c7ed, 180, 1200);

const cam = new THREE.PerspectiveCamera(
  65, innerWidth / innerHeight, 0.1, 1800
);

const R = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
R.setSize(innerWidth, innerHeight);
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
R.outputColorSpace = THREE.SRGBColorSpace;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = 1.15;

document.body.prepend(R.domElement);
R.domElement.style.position = "fixed";
R.domElement.style.inset = "0";
R.domElement.style.zIndex = "0";

S.add(new THREE.HemisphereLight(0xeaf6ff, 0x586344, 2));

const sun = new THREE.DirectionalLight(0xffefcf, 3);
sun.position.set(-120, 180, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
S.add(sun);
S.add(sun.target);

const mat = (color, roughness = 0.9, metalness = 0) =>
  new THREE.MeshStandardMaterial({
    color, roughness, metalness
  });

function block(w, h, d, material, x, y, z, parent = S) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d), material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  mat(0x68834b)
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.receiveShadow = true;
S.add(ground);

// Main road, long asphalt highway and intersections
const asphalt = mat(0x34383b, 0.95);
const lanePaint = mat(0xe9e4cf);
const sidewalk = mat(0x8e928c);
const roadWidth = 18;

function makeRoad(x, z, width, length, horizontal = false) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(
      horizontal ? length : width,
      horizontal ? width : length
    ),
    asphalt
  );

  road.rotation.x = -Math.PI / 2;
  road.position.set(x, 0.01, z);
  road.receiveShadow = true;
  S.add(road);

  // Dashed centre line
  const count = Math.floor(length / 12);

  for (let i = 0; i < count; i++) {
    const offset = -length / 2 + i * 12;
    block(
      horizontal ? 3.5 : 0.16,
      0.025,
      horizontal ? 0.16 : 3.5,
      lanePaint,
      x + (horizontal ? offset : 0),
      0.04,
      z + (horizontal ? 0 : offset)
    );
  }

  // Road edges
  [-width / 2 + 0.5, width / 2 - 0.5].forEach(edge => {
    block(
      horizontal ? length : 0.13,
      0.025,
      horizontal ? 0.13 : length,
      lanePaint,
      x + (horizontal ? 0 : edge),
      0.035,
      z + (horizontal ? edge : 0)
    );
  });

  // Sidewalk strips
  [-1, 1].forEach(side => {
    block(
      horizontal ? length : 2.5,
      0.12,
      horizontal ? 2.5 : length,
      sidewalk,
      x + (horizontal ? 0 : side * (width / 2 + 1.25)),
      0.02,
      z + (horizontal ? side * (width / 2 + 1.25) : 0)
    );
  });
}

makeRoad(0, 0, roadWidth, 2400, false);
makeRoad(0, 0, roadWidth, 1800, true);
makeRoad(70, 0, roadWidth, 1800, true);
makeRoad(-70, 0, roadWidth, 1800, true);
makeRoad(0, 140, roadWidth, 1600, false);
makeRoad(0, -140, roadWidth, 1600, false);

// Smaller side streets
for (let z = -800; z <= 800; z += 100) {
  if (Math.abs(z) < 30) continue;
  makeRoad(0, z, 9, 150, true);
}

const buildingMaterials = [
  mat(0xd2c5ae), mat(0xb7c3c4), mat(0xd7d8d1),
  mat(0xb28b68), mat(0x9ea9a9), mat(0xe1d8c6)
];

function createBuilding(x, z, w, d, h, material) {
  const group = new THREE.Group();

  block(w, h, d, material, 0, h / 2, 0, group);
  block(
    w + 0.3, 0.25, d + 0.3,
    mat(0x777d7d), 0, h + 0.1, 0, group
  );

  // Windows on the front
  const rows = Math.max(1, Math.floor(h / 3.5));
  const cols = Math.max(2, Math.floor(w / 2.8));
  const windowMat = mat(0x294655, 0.3, 0.25);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      block(
        1.05, 1.3, 0.035,
        windowMat,
        -w / 2 + (col + 0.5) * w / cols,
        2 + row * 3.1,
        d / 2 + 0.025,
        group
      );
    }
  }

  group.position.set(x, 0, z);
  S.add(group);
  return group;
}

// Addis-style urban blocks, leaving roads clear
for (let x = -220; x <= 220; x += 42) {
  for (let z = -330; z <= 330; z += 42) {
    if (Math.abs(x) < 18 || Math.abs(z) < 18) continue;
    if (Math.abs(Math.abs(x) - 70) < 18) continue;
    if (Math.random() < 0.17) continue;

    const w = 13 + Math.random() * 13;
    const d = 13 + Math.random() * 13;
    const h = 8 + Math.random() * 36;
    const material = buildingMaterials[
      Math.floor(Math.random() * buildingMaterials.length)
    ];

    createBuilding(x, z, w, d, h, material);
  }
}

// Street trees and lamps
const treeTrunk = mat(0x614632);
const treeLeaf = mat(0x326c45);
const lampMetal = mat(0x343a3b);
const lampLight = new THREE.MeshStandardMaterial({
  color: 0xffe5a6,
  emissive: 0xffc46a,
  emissiveIntensity: 0.4
});

for (let z = -650; z <= 650; z += 35) {
  [-13, 13].forEach(side => {
    const x = side + (Math.random() - 0.5) * 2;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.35, 3.2, 8),
      treeTrunk
    );
    trunk.position.set(x, 1.6, z);
    S.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 9, 7),
      treeLeaf
    );
    leaves.position.set(x, 4.0, z);
    leaves.scale.y = 1.3;
    S.add(leaves);

    if (z % 70 === 0) {
      block(0.13, 5, 0.13, lampMetal, side * 1.35, 2.5, z);
      block(0.8, 0.1, 0.1, lampMetal, side * 1.1, 4.8, z);
      block(0.35, 0.12, 0.25, lampLight, side * 0.9, 4.75, z);
    }
  });
}

// Landmark helper
function createSign(text, x, y, z, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#101918";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#e6c56b";
  ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = "#ffdf82";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    })
  );

  sign.position.set(x, y, z);
  S.add(sign);
  return sign;
}

// Naol Hotel
createBuilding(
  35, 85, 25, 24, 34, mat(0x9caeb1, 0.35)
);
createSign("NAOL HOTEL", 35, 24, 72.7, 21, 4.5);

// Naol Garage
createBuilding(
  -38, 85, 28, 22, 8, mat(0x777f7e)
);
createSign("NAOL GARAGE", -38, 6, 73.7, 24, 3.5);

// Garage doors and service bays
for (let i = 0; i < 3; i++) {
  block(
    5, 3.4, 0.15, mat(0x303a3c),
    -46 + i * 8, 2.0, 73.8
  );
}

// Hills around the city
for (let i = 0; i < 36; i++) {
  const angle = Math.random() * Math.PI * 2;
  const distance = 900 + Math.random() * 500;
  const height = 80 + Math.random() * 170;

  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(
      130 + Math.random() * 180, height, 7
    ),
    mat(0x72865b)
  );

  hill.position.set(
    Math.cos(angle) * distance,
    height / 2 - 5,
    Math.sin(angle) * distance
  );
  S.add(hill);
}

// Collision-safe landmark data for future interaction logic
window.NaolWorld = {
  scene: S,
  camera: cam,
  renderer: R,
  roadWidth,
  locations: {
    city: { x: 0, z: -40 },
    hotel: { x: 35, z: 85 },
    garage: { x: -38, z: 85 },
    countryside: { x: 0, z: 650 }
  }
};

addEventListener("resize", () => {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  R.setSize(innerWidth, innerHeight);
});

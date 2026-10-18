
/* =====================================================
   NAOL GANGSTER — 3D CITY WORLD
   Addis Ababa-inspired open-world driving environment
   ===================================================== */
(() => {
  if (!window.THREE) {
    const msg = document.getElementById("load-msg");
    if (msg) msg.textContent =
      "Three.js hin fe'amne. Internet kee ilaali.";
    throw new Error("Three.js library unavailable");
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.domElement.id = "world";
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.7)
  );
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.insertBefore(
    renderer.domElement,
    document.body.firstChild
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9bb9d0);
  scene.fog = new THREE.Fog(0x9bb9d0, 180, 850);

  const camera = new THREE.PerspectiveCamera(
    66, innerWidth / innerHeight, 0.1, 1300
  );

  // Natural lighting and sunlight
  scene.add(new THREE.HemisphereLight(
    0xe6f2ff, 0x55513b, 1.35
  ));

  const sun = new THREE.DirectionalLight(0xffedcf, 2);
  sun.position.set(-90, 160, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  sun.shadow.camera.top = 130;
  sun.shadow.camera.bottom = -130;
  scene.add(sun);

  const mat = (color, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({
      color, roughness, metalness
    });

  const asphalt = mat(0x34383b, 0.94);
  const sidewalk = mat(0xaaa69c);
  const grass = mat(0x687c4a);
  const whiteLine = mat(0xe7e2cf);

  const darkWindow = new THREE.MeshStandardMaterial({
    color: 0x304452,
    roughness: 0.28,
    metalness: 0.25
  });

  // Reusable 3D box builder
  const box = (
    w, h, d, material, x, y, z, parent = scene
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Large grass ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    grass
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.13;
  ground.receiveShadow = true;
  scene.add(ground);

  // Long main roads crossing the city
  box(22, 0.12, 1500, asphalt, 0, -0.03, 0);
  box(1500, 0.12, 22, asphalt, 0, -0.025, 0);

  // Road markings
  for (let z = -720; z < 720; z += 16) {
    box(0.18, 0.015, 7, whiteLine, 0, 0.04, z);
  }

  for (let x = -720; x < 720; x += 16) {
    box(7, 0.015, 0.18, whiteLine, x, 0.04, 0);
  }

  // Sidewalks
  for (const side of [-1, 1]) {
    box(2, 0.22, 1500, sidewalk, side * 12, -0.005, 0);
    box(1500, 0.22, 2, sidewalk, 0, -0.005, side * 12);
  }

  // Deterministic random numbers for repeatable city layout
  let seed = 9231;

  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const buildingColors = [
    0xc9b89c,
    0xd2d0c6,
    0xb99f82,
    0x9aa7aa,
    0xe0d7c5,
    0xaaa59b
  ];

  // Buildings, windows and commercial blocks
  for (let gx = -8; gx <= 8; gx++) {
    for (let gz = -8; gz <= 8; gz++) {
      if (Math.abs(gx) < 2 && Math.abs(gz) < 2) {
        continue;
      }

      const bx = gx * 78 + (rand() - 0.5) * 12;
      const bz = gz * 78 + (rand() - 0.5) * 12;
      const w = 22 + rand() * 28;
      const d = 22 + rand() * 28;
      const h = 10 + rand() * 48;

      const wall = mat(
        buildingColors[
          Math.floor(rand() * buildingColors.length)
        ]
      );

      box(w, h, d, wall, bx, h / 2, bz);

      // Roof border
      box(
        w + 0.6, 0.5, d + 0.6,
        mat(0x56534d), bx, h + 0.25, bz
      );

      // Windows on both visible sides
      const floors = Math.max(1, Math.floor(h / 4));

      for (let f = 0; f < floors; f++) {
        const yy = 2.2 + f * 3.8;

        for (let xx = -w / 2 + 3; xx < w / 2 - 1; xx += 5) {
          box(
            1.7, 1.6, 0.09,
            darkWindow, bx + xx, yy, bz + d / 2 + 0.05
          );

          box(
            1.7, 1.6, 0.09,
            darkWindow, bx + xx, yy, bz - d / 2 - 0.05
          );
        }
      }

      // Random shop signboards
      if (rand() > 0.55) {
        const signColors = [
          0x286d63, 0x9b3e32, 0x243e67, 0x866b32
        ];

        box(
          w * 0.7, 1.5, 0.18,
          mat(signColors[Math.floor(rand() * signColors.length)]),
          bx, h * 0.25, bz + d / 2 + 0.16
        );
      }
    }
  }

  // Landmark sign texture
  function createSignTexture(label) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#171a19";
    ctx.fillRect(0, 0, 512, 96);

    ctx.fillStyle = "#f4df9b";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 256, 49);

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  // Naol Hotel and Naol Garage
  function landmark(name, x, z, color, garage = false) {
    const width = garage ? 38 : 34;
    const height = garage ? 12 : 42;
    const depth = garage ? 25 : 30;

    box(
      width, height, depth,
      mat(color), x, height / 2, z
    );

    box(
      width + 2, 1, depth + 2,
      mat(0x282b2b), x, height + 0.5, z
    );

    const sign = box(
      width * 0.82, 3, 0.45,
      mat(0xf0d78c), x, height - 4, z + depth / 2 + 0.3
    );

    sign.material = new THREE.MeshBasicMaterial({
      map: createSignTexture(name)
    });

    if (garage) {
      // Large garage door openings
      for (let i = -1; i <= 1; i++) {
        box(
          8, 6, 0.5,
          mat(0x202729), x + i * 11, 3, z + depth / 2 + 0.5
        );
      }
    } else {
      // Hotel windows and entrance
      for (let f = 0; f < 5; f++) {
        for (let i = -2; i <= 2; i++) {
          box(
            3, 2, 0.12, darkWindow,
            x + i * 5, height - 9 - f * 6, z + depth / 2 + 0.2
          );
        }
      }

      box(
        8, 5, 0.3, mat(0x383b38),
        x, 2.5, z + depth / 2 + 0.4
      );
    }
  }

  landmark("NAOL HOTEL", -105, -115, 0xb5a184);
  landmark("NAOL GARAGE", 110, -115, 0x777d7c, true);

  // City trees
  const trunk = mat(0x60432f);
  const leaves = [
    mat(0x2d6442),
    mat(0x3c7548),
    mat(0x4b7a42)
  ];

  for (let i = 0; i < 180; i++) {
    const x = (rand() - 0.5) * 1100;
    const z = (rand() - 0.5) * 1100;

    if (Math.abs(x % 78) < 18 || Math.abs(z % 78) < 18) {
      continue;
    }

    const h = 3 + rand() * 4;

    const treeTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.42, h, 7),
      trunk
    );

    treeTrunk.position.set(x, h / 2, z);
    scene.add(treeTrunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.8 + rand() * 1.5, 7, 6),
      leaves[Math.floor(rand() * leaves.length)]
    );

    crown.position.set(x, h + 1, z);
    crown.castShadow = true;
    scene.add(crown);
  }

  // Export shared game objects
  window.NAOL = {
    renderer,
    scene,
    camera,
    box,
    mat,
    rand
  };

  // Responsive rendering
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.7)
    );
  });
})();

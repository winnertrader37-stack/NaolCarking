
/* =====================================================
   NAOL GANGSTER — LEOPARD 8 INSPIRED 3D SUV
   Exterior + tan interior + cockpit steering wheel
   ===================================================== */
(() => {
  const { scene, box, mat } = window.NAOL;

  const car = new THREE.Group();
  scene.add(car);

  const paint = new THREE.MeshStandardMaterial({
    color: 0x16191b,
    metalness: 0.72,
    roughness: 0.25
  });

  const trim = mat(0x080a0c, 0.35, 0.3);
  const chrome = mat(0xb7b8b4, 0.24, 0.8);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x243a48,
    metalness: 0.2,
    roughness: 0.12,
    transparent: true,
    opacity: 0.68
  });

  const tire = mat(0x101112, 0.95);
  const leather = mat(0x9a7958, 0.72);
  const leatherLight = mat(0xc3a988, 0.65);

  const lamp = new THREE.MeshStandardMaterial({
    color: 0xe7f0ff,
    emissive: 0x9aaec9,
    emissiveIntensity: 1.1
  });

  const redLamp = new THREE.MeshStandardMaterial({
    color: 0xe52c26,
    emissive: 0x8a0907
  });

  const part = (
    w, h, d, material, x, y, z, parent = car
  ) => box(w, h, d, material, x, y, z, parent);

  // Main body and bonnet
  part(2.45, 0.78, 5.25, paint, 0, 0.88, 0);
  part(2.48, 0.34, 1.55, paint, 0, 1.25, 1.78);
  part(2.42, 0.34, 1.1, paint, 0, 0.65, 2.35);

  // Front bumper and grille
  part(2.3, 0.28, 0.18, trim, 0, 0.76, 2.91);
  part(1.32, 0.7, 0.08, trim, 0, 1.0, 2.84);

  for (let y = 0.77; y < 1.35; y += 0.13) {
    part(1.28, 0.025, 0.04, chrome, 0, y, 2.9);
  }

  // Headlights and rear lights
  part(0.65, 0.12, 0.09, lamp, -0.83, 1.34, 2.84);
  part(0.65, 0.12, 0.09, lamp,  0.83, 1.34, 2.84);

  part(0.62, 0.1, 0.08, redLamp, -0.83, 1.05, -2.67);
  part(0.62, 0.1, 0.08, redLamp,  0.83, 1.05, -2.67);

  // Cabin exterior
  part(2.05, 0.82, 2.85, paint, 0, 1.65, -0.48);
  part(2.03, 0.73, 2.65, glass, 0, 1.73, -0.48);
  part(2.03, 0.1, 3.05, paint, 0, 2.13, -0.48);

  const windshield = part(
    2.02, 0.82, 0.09, glass, 0, 1.72, 1.02
  );
  windshield.rotation.x = -0.28;

  const rearGlass = part(
    1.95, 0.68, 0.08, glass, 0, 1.72, -1.93
  );
  rearGlass.rotation.x = 0.24;

  // Pillars, mirrors and side trim
  for (const x of [-1.06, 1.06]) {
    part(0.09, 0.76, 3.05, trim, x, 1.72, -0.47);

    part(
      0.12, 0.16, 0.48, paint,
      x * 1.12, 1.45, 0.6
    );

    part(
      0.12, 0.14, 0.45, chrome,
      x * 1.13, 1.45, 0.6
    );

    part(
      0.13, 0.2, 1.2, paint,
      x * 1.02, 1.1, 1.7
    );

    part(
      0.13, 0.2, 1.2, paint,
      x * 1.02, 1.1, -1.55
    );

    part(
      0.08, 0.08, 2.8, chrome,
      x * 1.04, 0.52, -0.05
    );
  }

  // Door handles
  for (const x of [-1.235, 1.235]) {
    for (const z of [0.48, -0.98]) {
      part(0.025, 0.06, 0.22, chrome, x, 1.47, z);
    }
  }

  // Four wheels and metallic rims
  const wheels = [];

  for (const x of [-1.18, 1.18]) {
    for (const z of [1.65, -1.65]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.53, z);
      car.add(pivot);

      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.49, 0.49, 0.3, 28),
        tire
      );
      wheel.rotation.z = Math.PI / 2;
      pivot.add(wheel);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.31, 0.31, 0.315, 24),
        chrome
      );
      rim.rotation.z = Math.PI / 2;
      pivot.add(rim);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.33, 16),
        trim
      );
      hub.rotation.z = Math.PI / 2;
      pivot.add(hub);

      for (let i = 0; i < 8; i++) {
        const spoke = part(
          0.025, 0.27, 0.34, trim, 0, 0, 0, pivot
        );
        spoke.rotation.x = i * Math.PI / 4;
      }

      wheels.push({ pivot, front: z > 0 });
    }
  }

  // Interior cabin group
  const cabin = new THREE.Group();
  car.add(cabin);

  // Two front seats with tan leather
  for (const x of [-0.55, 0.55]) {
    part(
      0.72, 0.22, 0.72,
      leatherLight, x, 0.62, -0.58, cabin
    );

    const back = part(
      0.72, 0.92, 0.22,
      leather, x, 1.05, -0.96, cabin
    );
    back.rotation.x = -0.08;

    part(
      0.12, 0.42, 0.5,
      leatherLight, x - 0.34, 0.95, -0.68, cabin
    );

    part(
      0.12, 0.42, 0.5,
      leatherLight, x + 0.34, 0.95, -0.68, cabin
    );
  }

  // Wide tan dashboard
  part(
    2.16, 0.28, 0.55,
    leatherLight, 0, 1.36, 0.72, cabin
  );

  // Driver instrument panel
  part(
    0.82, 0.4, 0.14,
    trim, -0.68, 1.57, 0.7, cabin
  );

  part(
    0.65, 0.36, 0.055,
    mat(0x070b10, 0.25), -0.68, 1.58, 0.78, cabin
  );

  part(
    0.52, 0.24, 0.05,
    mat(0x14202b, 0.2), -0.68, 1.59, 0.82, cabin
  );

  // Central infotainment display
  part(
    0.88, 0.56, 0.075,
    trim, 0.13, 1.72, 0.72, cabin
  );

  part(
    0.78, 0.46, 0.025,
    mat(0x14212c, 0.2), 0.13, 1.72, 0.77, cabin
  );

  part(
    0.62, 0.06, 0.018,
    mat(0x52616a, 0.25), 0.13, 1.82, 0.79, cabin
  );

  // Passenger display
  part(
    0.62, 0.38, 0.06,
    trim, 0.91, 1.55, 0.72, cabin
  );

  part(
    0.52, 0.28, 0.025,
    mat(0x18232c, 0.2), 0.91, 1.55, 0.76, cabin
  );

  // Air vents
  for (const x of [-0.25, 0.25]) {
    part(0.32, 0.16, 0.1, trim, x, 1.19, 0.94, cabin);

    for (let j = -2; j <= 2; j++) {
      part(
        0.025, 0.11, 0.015,
        chrome, x + j * 0.05, 1.19, 0.995, cabin
      );
    }
  }

  // Centre console and gear selector
  part(
    0.78, 0.1, 0.72,
    trim, 0.18, 0.87, 0.2, cabin
  );

  part(
    0.66, 0.06, 0.6,
    leather, 0.18, 0.94, 0.18, cabin
  );

  part(
    0.16, 0.2, 0.18,
    chrome, 0.18, 1.02, 0.16, cabin
  );

  part(
    0.5, 0.045, 0.22,
    trim, 0.18, 1.02, -0.02, cabin
  );

  // Steering wheel: connected to steering animation in game.js
  const steering = new THREE.Group();
  steering.position.set(-0.68, 1.48, 0.93);
  steering.rotation.x = -0.12;
  cabin.add(steering);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.047, 12, 40),
    leather
  );
  steering.add(ring);

  const spokeMat = mat(0x292b2b, 0.4, 0.4);

  const spoke = (x, y, z, sx, sy, sz) => {
    return part(
      sx, sy, sz, spokeMat, x, y, z, steering
    );
  };

  spoke(0, -0.04, 0, 0.075, 0.42, 0.055);

  const left = spoke(
    -0.17, -0.015, 0, 0.28, 0.06, 0.055
  );
  left.rotation.z = -0.45;

  const right = spoke(
    0.17, -0.015, 0, 0.28, 0.06, 0.055
  );
  right.rotation.z = 0.45;

  part(
    0.24, 0.2, 0.075,
    leatherLight, 0, -0.01, 0.01, steering
  );

  part(
    0.16, 0.045, 0.018,
    chrome, 0, 0.015, 0.052, steering
  );

  // Interior mirror and exterior side mirrors
  for (const x of [-1, 1]) {
    part(
      0.13, 0.1, 0.3,
      trim, x * 1.28, 1.82, 0.55, cabin
    );

    part(
      0.25, 0.16, 0.32,
      paint, x * 1.38, 1.55, 0.7
    );
  }

  part(
    1.05, 0.09, 0.25,
    trim, 0, 2.08, -0.7, cabin
  );

  // Functional headlight spotlights
  const headL = new THREE.SpotLight(
    0xe8f2ff, 0, 80, Math.PI / 7, 0.4, 1.4
  );
  headL.position.set(-0.75, 1.15, 2.7);
  headL.target.position.set(-0.75, 0.5, 30);
  car.add(headL, headL.target);

  const headR = new THREE.SpotLight(
    0xe8f2ff, 0, 80, Math.PI / 7, 0.4, 1.4
  );
  headR.position.set(0.75, 1.15, 2.7);
  headR.target.position.set(0.75, 0.5, 30);
  car.add(headR, headR.target);

  // Share car objects with game.js
  window.NAOL_CAR = {
    car,
    wheels,
    steering,
    headL,
    headR
  };
})();

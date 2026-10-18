
/* NAOL GANGSTER - LEOPARD 8 VEHICLE */
(() => {
  "use strict";

  const car = new THREE.Group();
  car.name = "NaolLeopard8";
  S.add(car);

  const paint = new THREE.MeshStandardMaterial({
    color: 0x111416, metalness: 0.72, roughness: 0.27
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x303537, metalness: 0.6, roughness: 0.4
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x172c36, metalness: 0.25,
    roughness: 0.15, transparent: true, opacity: 0.82
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x101112, roughness: 0.92
  });
  const rim = new THREE.MeshStandardMaterial({
    color: 0xb6bec2, metalness: 0.85, roughness: 0.24
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xfff4d2, emissive: 0xffd88a,
    emissiveIntensity: 1.2
  });
  const tailLamp = new THREE.MeshStandardMaterial({
    color: 0xff2727, emissive: 0x9d0000,
    emissiveIntensity: 1
  });

  const wheels = [];
  const doors = [];

  function block(parent, w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d), material
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Main chassis and body
  block(car, 2.02, 0.65, 4.8, paint, 0, 0.86, 0);
  block(car, 1.98, 0.16, 1.2, paint, 0, 1.22, 1.53);
  block(car, 1.98, 0.17, 0.85, paint, 0, 1.19, -1.9);
  block(car, 1.98, 0.16, 0.22, trim, 0, 0.52, 2.43);
  block(car, 1.98, 0.16, 0.22, trim, 0, 0.52, -2.43);

  // Cabin and roof
  block(car, 1.78, 0.83, 2.35, glass, 0, 1.65, -0.25);
  block(car, 1.84, 0.14, 2.5, paint, 0, 2.13, -0.27);

  // Front and rear windows
  const windshield = block(
    car, 1.66, 0.58, 0.055, glass, 0, 1.67, 0.98
  );
  windshield.rotation.x = -0.19;

  const rearWindow = block(
    car, 1.62, 0.55, 0.055, glass, 0, 1.65, -1.49
  );
  rearWindow.rotation.x = 0.16;

  // Roof rails
  [-0.78, 0.78].forEach(x => {
    block(car, 0.045, 0.07, 2.1, trim, x, 2.24, -0.27);
  });

  // Front grille
  block(car, 1.1, 0.42, 0.055, rubber, 0, 0.99, 2.42);

  for (let i = 0; i < 6; i++) {
    block(
      car, 1.0, 0.025, 0.025, rim,
      0, 0.82 + i * 0.055, 2.455
    );
  }

  // Headlights and tail lights
  [-1, 1].forEach(side => {
    block(car, 0.48, 0.12, 0.055, lamp, side * 0.68, 1.22, 2.4);
    block(car, 0.34, 0.23, 0.06, tailLamp, side * 0.76, 1.02, -2.42);
  });

  // Mirrors
  [-1, 1].forEach(side => {
    block(car, 0.16, 0.13, 0.25, trim, side * 1.08, 1.48, 0.72);
  });

  // Four wheels with separate steering and spin pivots
  const wheelPositions = [
    [-1.04, 0.49, 1.52],
    [ 1.04, 0.49, 1.52],
    [-1.04, 0.49, -1.55],
    [ 1.04, 0.49, -1.55]
  ];

  wheelPositions.forEach(([x, y, z], index) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    car.add(pivot);

    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.28, 28),
      rubber
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    pivot.add(tire);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.30, 20),
      rim
    );
    hub.rotation.z = Math.PI / 2;
    pivot.add(hub);

    for (let spoke = 0; spoke < 5; spoke++) {
      const bar = block(
        pivot, 0.035, 0.035, 0.36, trim, 0, 0, 0
      );
      bar.rotation.x = spoke * Math.PI / 5;
    }

    wheels.push({
      pivot,
      front: index < 2,
      rotation: 0
    });
  });

  // Four independently animated doors
  function makeDoor(side, front) {
    const hinge = new THREE.Group();

    hinge.position.set(
      side * 0.96,
      1.12,
      front ? 0.65 : -0.88
    );
    car.add(hinge);

    const door = block(
      hinge, 0.07, 0.64, 0.78,
      paint, side * 0.015, 0, 0
    );

    const window = block(
      hinge, 0.045, 0.32, 0.70,
      glass, side * 0.01, 0.44, 0
    );

    block(
      hinge, 0.04, 0.035, 0.12,
      rim, side * 0.055, 0.05, front ? -0.22 : 0.22
    );

    doors.push({
      hinge,
      door,
      window,
      side,
      front,
      open: false,
      angle: 0
    });
  }

  makeDoor(-1, true);
  makeDoor(1, true);
  makeDoor(-1, false);
  makeDoor(1, false);

  // Cabin dashboard, steering wheel and seats
  block(car, 1.55, 0.16, 0.38, trim, 0, 1.23, 0.76);

  block(car, 0.48, 0.62, 0.38, rubber, -0.48, 1.17, -0.38);
  block(car, 0.48, 0.62, 0.38, rubber, 0.48, 1.17, -0.38);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.025, 8, 24),
    rubber
  );
  steeringWheel.position.set(-0.47, 1.48, 0.62);
  steeringWheel.rotation.x = 0.7;
  car.add(steeringWheel);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.22, 0.025),
    new THREE.MeshStandardMaterial({
      color: 0x14252b,
      emissive: 0x082b35,
      emissiveIntensity: 0.7
    })
  );
  screen.position.set(0, 1.43, 0.77);
  car.add(screen);

  // Headlight beams
  const headlights = [];
  [-0.68, 0.68].forEach(x => {
    const light = new THREE.SpotLight(
      0xffe8bb, 0, 90, Math.PI / 7, 0.4, 1.2
    );
    light.position.set(x, 1.25, 2.5);
    light.target.position.set(x, 0.4, 25);
    car.add(light);
    car.add(light.target);
    headlights.push(light);
  });

  let doorBusy = false;
  let headlampsOn = false;

  function toggleDoor(index) {
    const door = doors[index];
    if (!door || doorBusy) return false;

    door.open = !door.open;
    doorBusy = true;

    const start = door.angle;
    const target = door.open ? door.side * 1.05 : 0;
    const duration = 250;
    const began = performance.now();

    function animate(now) {
      const t = Math.min(1, (now - began) / duration);
      const eased = t * t * (3 - 2 * t);

      door.angle = start + (target - start) * eased;
      door.hinge.rotation.y = door.angle;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        doorBusy = false;
      }
    }

    requestAnimationFrame(animate);
    return true;
  }

  function toggleHeadlights(force) {
    headlampsOn = typeof force === "boolean"
      ? force : !headlampsOn;

    headlights.forEach(light => {
      light.intensity = headlampsOn ? 2.5 : 0;
    });

    return headlampsOn;
  }

  function update(dt, speed, steering) {
    wheels.forEach(wheel => {
      if (wheel.front) {
        wheel.pivot.rotation.y = steering * 0.48;
      }
      wheel.rotation += speed * dt / 0.43;
      wheel.pivot.children[0].rotation.x = wheel.rotation;
    });

    steeringWheel.rotation.z = -steering * 0.75;
  }

  window.NaolCar = {
    root: car,
    wheels,
    doors,
    toggleDoor,
    toggleHeadlights,
    update,
    get headlightsOn() { return headlampsOn; }
  };
})();

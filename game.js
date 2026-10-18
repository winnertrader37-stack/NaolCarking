
/* =====================================================
   NAOL GANGSTER — MAIN GAME ENGINE
   Smooth steering, driving, engine, cameras and touch
   ===================================================== */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const {
    renderer, scene, camera, box, mat, rand
  } = window.NAOL;

  const {
    car, wheels, steering, headL, headR
  } = window.NAOL_CAR;

  let engine = false;
  let paused = false;
  let inside = false;

  let x = 0;
  let z = 0;
  let heading = 0;
  let speed = 0;
  let steer = 0;
  let steerTarget = 0;
  let rpm = 900;
  let score = 0;
  let health = 100;
  let fuel = 100;

  let cameraMode = "chase";
  let freeYaw = 0;
  let freePitch = 0.25;

  const keys = {};
  const touch = { gas: false, brake: false };
  const clock = new THREE.Clock();

  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const clamp = (n, min, max) =>
    Math.max(min, Math.min(max, n));

  function message(text) {
    const el = $("message");
    el.textContent = text;
    el.style.display = "block";

    clearTimeout(message.timer);

    message.timer = setTimeout(() => {
      el.style.display = "none";
    }, 2200);
  }

  // Traffic vehicles
  const traffic = [];
  const trafficColors = [
    0xeee9df,
    0x9b2f29,
    0x253f55,
    0x8c8b83,
    0x252729
  ];

  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    scene.add(g);

    box(
      1.8, 0.65, 3.8,
      mat(trafficColors[i % trafficColors.length], 0.4, 0.25),
      0, 0.65, 0, g
    );

    box(
      1.5, 0.55, 1.8,
      mat(0x263642, 0.22, 0.2),
      0, 1.15, -0.2, g
    );

    for (const sx of [-0.88, 0.88]) {
      for (const sz of [-1.2, 1.2]) {
        const w = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 0.18, 12),
          mat(0x111111)
        );

        w.rotation.z = Math.PI / 2;
        w.position.set(sx, 0.28, sz);
        g.add(w);
      }
    }

    traffic.push({
      g,
      x: (i % 2 ? 1 : -1) * (8 + rand() * 8),
      z: -220 + i * 34,
      speed: 5 + rand() * 9,
      dir: i % 2 ? 1 : -1
    });
  }

  // Street lights
  for (let zz = -600; zz < 600; zz += 42) {
    for (const side of [-1, 1]) {
      const px = side * 15;

      box(
        0.16, 5, 0.16,
        mat(0x343839), px, 2.5, zz
      );

      box(
        1.4, 0.12, 0.12,
        mat(0x343839), px + side * 0.6, 4.9, zz
      );

      const bulb = new THREE.PointLight(
        0xffdf9a, 0.22, 15
      );

      bulb.position.set(px + side * 1.1, 4.7, zz);
      scene.add(bulb);
    }
  }

  /* -----------------------------------------------------
     STEERING WHEEL
     Drag the wheel horizontally to steer.
     On release, it smoothly returns to centre.
     ----------------------------------------------------- */
  const wheelEl = $("wheel");

  let wheelPointer = null;
  let wheelStart = 0;
  let wheelBase = 0;
  let wheelVisual = 0;

  wheelEl.addEventListener("pointerdown", e => {
    if (paused) return;

    wheelPointer = e.pointerId;
    wheelStart = e.clientX;
    wheelBase = wheelVisual;

    wheelEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  wheelEl.addEventListener("pointermove", e => {
    if (wheelPointer !== e.pointerId) return;

    const movement = e.clientX - wheelStart;

    wheelVisual = clamp(
      wheelBase + movement * 0.018,
      -2.15,
      2.15
    );

    steerTarget = wheelVisual / 2.15;
    e.preventDefault();
  });

  function releaseWheel() {
    wheelPointer = null;
    steerTarget = 0;
  }

  wheelEl.addEventListener("pointerup", releaseWheel);
  wheelEl.addEventListener("pointercancel", releaseWheel);
  wheelEl.addEventListener("lostpointercapture", releaseWheel);

  // Accelerator and brake: hold to use
  function bindHold(id, key) {
    const el = $(id);

    el.addEventListener("pointerdown", e => {
      touch[key] = true;

      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {}

      e.preventDefault();
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => {
      el.addEventListener(ev, () => {
        touch[key] = false;
      });
    });
  }

  bindHold("accelerate", "gas");
  bindHold("brake", "brake");

  // Keyboard controls
  addEventListener("keydown", e => {
    keys[e.code] = true;

    if ([
      "ArrowUp", "ArrowDown", "ArrowLeft",
      "ArrowRight", "Space"
    ].includes(e.code)) {
      e.preventDefault();
    }

    if (e.repeat) return;

    if (e.code === "KeyC") cycleCamera();
    if (e.code === "KeyE") toggleEnterExit();
    if (e.code === "KeyP") paused = !paused;
    if (e.code === "KeyL") toggleLights();
  });

  addEventListener("keyup", e => {
    keys[e.code] = false;
  });

  // Prevent stuck keys if the browser loses focus
  addEventListener("blur", () => {
    Object.keys(keys).forEach(key => keys[key] = false);
    touch.gas = false;
    touch.brake = false;
    releaseWheel();
  });

  // Camera controls
  function setCamera(mode) {
    cameraMode = mode;
    inside = mode === "cockpit";

    document.querySelectorAll("[data-camera]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.camera === mode
      );
    });

    if (mode === "cockpit") {
      $("player-state").textContent = "DRIVING";
    } else if (!inside) {
      $("player-state").textContent = engine ? "DRIVING" : "READY";
    }
  }

  function cycleCamera() {
    const modes = [
      "chase", "front", "cockpit", "top", "free"
    ];

    setCamera(
      modes[(modes.indexOf(cameraMode) + 1) % modes.length]
    );
  }

  document.querySelectorAll("[data-camera]").forEach(button => {
    button.addEventListener("click", () => {
      setCamera(button.dataset.camera);
    });
  });

  // Start and stop engine
  $("engine-btn").addEventListener("click", () => {
    if (!engine) {
      engine = true;
      message("Engine started.");
    } else {
      engine = false;
      speed = 0;
      message("Engine stopped.");
    }

    updateDashboard();
  });

  function toggleLights() {
    const on = headL.intensity < 0.1;

    headL.intensity = on ? 2 : 0;
    headR.intensity = on ? 2 : 0;

    message(on ? "Headlights ON" : "Headlights OFF");
  }

  // Enter or exit the vehicle.
  // This prototype switches driving/camera mode; it does
  // not yet animate a separate walking character.
  function toggleEnterExit() {
    if (inside) {
      inside = false;
      setCamera("chase");
      $("player-state").textContent = "ON FOOT";
      message("Konkolaataa keessaa baate.");
    } else {
      inside = true;
      setCamera("cockpit");
      $("player-state").textContent = "DRIVING";
      message("Konkolaataa keessa seente.");
    }
  }

  // The button already exists in index.html.
  $("exit-btn").addEventListener("click", toggleEnterExit);

  function updateDashboard() {
    const kmh = Math.round(Math.abs(speed) * 3.6);

    $("speed").textContent = kmh;
    $("rpm").textContent = engine ? rpm : 0;
    $("engine-label").textContent =
      engine ? "ENGINE ON" : "ENGINE OFF";

    $("gear").textContent =
      !engine ? "P" :
      speed < -0.5 ? "R" :
      kmh < 2 ? "D" :
      kmh < 40 ? "2" : "3";

    $("speed-meter").style.width =
      clamp(kmh / 2.1, 0, 100) + "%";

    $("parked").textContent =
      !engine ? "PARKED" :
      kmh > 2 ? "DRIVING" : "READY";

    $("health").textContent = Math.round(health) + "%";
    $("fuel").textContent = Math.round(fuel) + "%";
    $("score").textContent = score;
  }

  /* -----------------------------------------------------
     GAME PHYSICS, STEERING AND CAMERA
     ----------------------------------------------------- */
  function update(dt) {
    if (paused) return;

    const gas =
      keys.KeyW || keys.ArrowUp || touch.gas;

    const brake =
      keys.KeyS || keys.ArrowDown ||
      touch.brake || keys.Space;

    const left =
      keys.KeyA || keys.ArrowLeft;

    const right =
      keys.KeyD || keys.ArrowRight;

    if (engine) {
      if (gas && fuel > 0) {
        speed += 17 * dt;
        fuel = Math.max(0, fuel - 0.0018 * dt);
      }

      if (brake) {
        speed -= 26 * dt;
      }

      if (!gas && !brake) {
        speed *= Math.exp(-0.55 * dt);
      }
    } else {
      speed *= Math.exp(-4 * dt);
    }

    speed = clamp(speed, -8, 58);

    // Keyboard steering overrides wheel while pressed
    const keySteer = (left ? 1 : 0) - (right ? 1 : 0);

    if (keySteer !== 0) {
      steerTarget = keySteer;
    } else if (wheelPointer === null) {
      steerTarget *= Math.exp(-3.8 * dt);
    }

    // Smooth steering response
    steer += (
      steerTarget - steer
    ) * (1 - Math.exp(-7 * dt));

    // Wheel animation returns smoothly to its centre
    wheelVisual += (
      steer * 2.15 - wheelVisual
    ) * (1 - Math.exp(-8 * dt));

    wheelEl.style.transform =
      `rotate(${wheelVisual * 180 / Math.PI}deg)`;

    // Vehicle movement
    heading += steer * speed * 0.013 * dt;

    x += Math.sin(heading) * speed * dt;
    z += Math.cos(heading) * speed * dt;

    car.position.set(x, 0, z);
    car.rotation.y = heading;

    // Wheel spin and front-wheel steering
    wheels.forEach(w => {
      w.pivot.rotation.x += speed * dt * 1.8;

      if (w.front) {
        w.pivot.rotation.y = -steer * 0.45;
      }
    });

    // Cockpit steering wheel animation
    steering.rotation.z = -steer * 0.72;

    // Engine RPM
    const kmh = Math.round(Math.abs(speed) * 3.6);

    rpm = engine
      ? Math.round(850 + Math.abs(speed) * 75 + (gas ? 700 : 0))
      : 0;

    // Traffic movement and collision
    traffic.forEach(t => {
      t.z += t.speed * t.dir * dt;

      if (t.z > z + 280) t.z = z - 300;
      if (t.z < z - 300) t.z = z + 280;

      t.g.position.set(t.x, 0, t.z);

      const dx = x - t.x;
      const dz = z - t.z;

      if (dx * dx + dz * dz < 5.5 && Math.abs(speed) > 2) {
        speed *= 0.86;
        score += 1;
      }
    });

    // Headlight controls
    if (keys.KeyL) {
      headL.intensity = 2;
      headR.intensity = 2;
    }

    updateDashboard();

    // Forward direction
    const forward = v3(
      Math.sin(heading), 0, Math.cos(heading)
    );

    let target;
    let camPos;

    if (cameraMode === "cockpit") {
      // Driver viewpoint inside the cabin
      camPos = car.localToWorld(v3(-0.15, 1.72, 0.2));
      target = car.localToWorld(v3(0, 1.48, 18));
      camera.position.copy(camPos);

    } else if (cameraMode === "front") {
      // Camera in front of the vehicle, facing it
      camPos = v3(
        x + forward.x * 8,
        3,
        z + forward.z * 8
      );

      target = v3(x, 1.1, z);

      camera.position.lerp(
        camPos, 1 - Math.exp(-5 * dt)
      );

    } else if (cameraMode === "top") {
      camPos = v3(x, 55, z + 0.1);
      target = v3(x, 0, z);

      camera.position.lerp(
        camPos, 1 - Math.exp(-4 * dt)
      );

      camera.up.set(0, 0, -1);

    } else if (cameraMode === "free") {
      const cp = Math.cos(freePitch);

      camPos = v3(
        x + Math.sin(heading + freeYaw) * 14 * cp,
        2 + Math.sin(freePitch) * 14,
        z + Math.cos(heading + freeYaw) * 14 * cp
      );

      target = v3(x, 1, z);

      camera.position.lerp(
        camPos, 1 - Math.exp(-4 * dt)
      );

    } else {
      // Chase camera follows behind the SUV
      camPos = v3(
        x - forward.x * 10,
        4.6,
        z - forward.z * 10
      );

      target = v3(
        x + forward.x * 5,
        1.1,
        z + forward.z * 5
      );

      camera.position.lerp(
        camPos, 1 - Math.exp(-4.5 * dt)
      );
    }

    if (cameraMode !== "top") {
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(target);
  }

  // Drag the screen to rotate Free camera
  let freeDrag = false;
  let lastX = 0;
  let lastY = 0;

  renderer.domElement.addEventListener("pointerdown", e => {
    if (cameraMode !== "free") return;

    freeDrag = true;
    lastX = e.clientX;
    lastY = e.clientY;

    try {
      renderer.domElement.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  renderer.domElement.addEventListener("pointermove", e => {
    if (!freeDrag) return;

    freeYaw -= (e.clientX - lastX) * 0.008;

    freePitch = clamp(
      freePitch + (e.clientY - lastY) * 0.006,
      -0.15, 1.1
    );

    lastX = e.clientX;
    lastY = e.clientY;
  });

  renderer.domElement.addEventListener("pointerup", () => {
    freeDrag = false;
  });

  renderer.domElement.addEventListener("pointercancel", () => {
    freeDrag = false;
  });

  // Main animation loop
  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);

    try {
      update(dt);
      renderer.render(scene, camera);

      const loading = $("loading");

      if (loading.style.display !== "none") {
        loading.style.display = "none";
        $("player-state").textContent = "READY";
      }

    } catch (err) {
      console.error("Naol Gangster frame error:", err);

      $("load-msg").textContent =
        "Game error: " + err.message;

      $("loading").style.display = "grid";
    }
  }

  // Initial camera position
  camera.position.set(0, 5, -11);
  camera.lookAt(0, 1, 12);

  setCamera("chase");
  updateDashboard();
  animate();
})();

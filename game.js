
/* ====================================================
   NAOL GANGSTER - MAIN GAME CONTROLLER
   Load order:
   Three.js -> world.js -> car.js -> player.js -> game.js
   ==================================================== */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const car = window.NaolCar.root;
  const player = window.NaolPlayer;
  const { scene: S, camera: cam, renderer: R } = window.NaolWorld;

  let started = false;
  let paused = true;
  let driving = false;
  let engineOn = false;
  let speed = 0;
  let steering = 0;
  let steeringTarget = 0;
  let yaw = 0;
  let rpm = 900;
  let fuel = 100;
  let health = 100;
  let money = 0;
  let score = 0;
  let cameraMode = 0;
  let headlights = false;
  let driveMode = "NORMAL";

  const keys = Object.create(null);
  const touch = Object.create(null);

  const clock = new THREE.Clock();
  const forward = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  const cameraNames = [
    "CHASE", "FRONT", "COCKPIT", "TOP", "FREE"
  ];

  let freeYaw = 0;
  let freePitch = 0.3;
  let dragging = false;
  let previousPointer = null;
  let audioContext = null;
  let engineOscillator = null;
  let engineGain = null;

  // ---------- Start and pause ----------

  $("go").addEventListener("click", () => {
    if (started) return;

    started = true;
    paused = false;
    $("start").style.display = "none";

    player.create();
    player.setPosition(car.position.x + 2.8, car.position.z - 1);

    try {
      audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();

      engineOscillator = audioContext.createOscillator();
      engineGain = audioContext.createGain();

      engineOscillator.type = "sawtooth";
      engineOscillator.frequency.value = 45;
      engineGain.gain.value = 0;

      engineOscillator.connect(engineGain);
      engineGain.connect(audioContext.destination);
      engineOscillator.start();
    } catch (error) {
      console.warn("Audio is unavailable on this device.");
    }
  });

  function pauseGame() {
    if (!started) return;
    paused = !paused;
    $("menu").style.display = paused ? "flex" : "none";
    if (paused && audioContext?.state === "running") {
      audioContext.suspend();
    } else if (!paused && audioContext?.state === "suspended") {
      audioContext.resume();
    }
  }

  $("pauseBtn").addEventListener("click", pauseGame);
  $("mx").addEventListener("click", () => {
    paused = false;
    $("menu").style.display = "none";
    if (audioContext?.state === "suspended") {
      audioContext.resume();
    }
  });

  // ---------- Menu ----------

  const menuOptions = {
    "Character": () => `
      <button data-action="photo">UPLOAD PHOTO</button>
      <button data-action="walk">ON FOOT</button>
    `,
    "Vehicle": () => `
      <button data-action="engine">ENGINE ON / OFF</button>
      <button data-action="lights">HEADLIGHTS</button>
      <button data-action="sport">SPORT MODE</button>
      <button data-action="normal">NORMAL MODE</button>
    `,
    "Camera": () => cameraNames.map((name, i) =>
      `<button data-camera="${i}">${name}</button>`
    ).join(""),
    "Locations": () => `
      <button data-location="city">ADDIS CITY</button>
      <button data-location="hotel">NAOL HOTEL</button>
      <button data-location="garage">NAOL GARAGE</button>
      <button data-location="countryside">COUNTRYSIDE</button>
    `,
    "Settings": () => `
      <button data-action="lights">TOGGLE LIGHTS</button>
      <button data-action="photo">CHANGE PHOTO</button>
    `
  };

  $("mt").textContent = "NAOL GANGSTER";
  $("mc").innerHTML = Object.keys(menuOptions).map(name =>
    `<button data-tab="${name}">${name}</button>`
  ).join("");

  $("mc").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.tab) {
      $("mt").textContent = button.dataset.tab;
      $("mc").innerHTML = menuOptions[button.dataset.tab]();
      return;
    }

    if (button.dataset.camera !== undefined) {
      setCamera(Number(button.dataset.camera));
      return;
    }

    if (button.dataset.location) {
      const point = window.NaolWorld.locations[
        button.dataset.location
      ];

      car.position.set(point.x, 0, point.z);
      speed = 0;

      if (driving) {
        yaw = car.rotation.y;
      } else {
        player.setPosition(point.x + 3, point.z);
      }
      return;
    }

    switch (button.dataset.action) {
      case "engine":
        toggleEngine();
        break;
      case "lights":
        headlights = window.NaolCar.toggleHeadlights();
        break;
      case "sport":
        driveMode = "SPORT";
        break;
      case "normal":
        driveMode = "NORMAL";
        break;
      case "photo":
        $("file").click();
        break;
      case "walk":
        exitVehicle();
        break;
    }
  });

  $("up").addEventListener("click", () => $("file").click());

  $("file").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) player.setPhoto(file);
  });

  // ---------- Camera selector ----------

  const cameraButtons = [];

  cameraNames.forEach((name, index) => {
    const button = document.createElement("button");
    button.textContent = name;
    button.addEventListener("click", () => setCamera(index));
    $("cams").appendChild(button);
    cameraButtons.push(button);
  });

  function setCamera(index) {
    cameraMode = (index + cameraNames.length) %
      cameraNames.length;

    cameraButtons.forEach((button, i) => {
      button.classList.toggle("on", i === cameraMode);
    });
  }

  setCamera(0);

  // ---------- Keyboard ----------

  addEventListener("keydown", event => {
    keys[event.code] = true;

    if (event.code === "KeyC" && !event.repeat) {
      setCamera(cameraMode + 1);
    }

    if (event.code === "KeyE" && !event.repeat) {
      toggleVehicle();
    }

    if (event.code === "KeyF" && !event.repeat) {
      toggleNearestDoor();
    }

    if (event.code === "KeyL" && !event.repeat) {
      headlights = window.NaolCar.toggleHeadlights();
    }

    if (event.code === "Escape" && !event.repeat) {
      pauseGame();
    }
  });

  addEventListener("keyup", event => {
    keys[event.code] = false;
  });

  // ---------- Mobile pedal controls ----------

  document.querySelectorAll("[data-t]").forEach(button => {
    const action = button.dataset.t;

    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      touch[action] = true;
      button.setPointerCapture?.(event.pointerId);
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(name => {
      button.addEventListener(name, () => {
        touch[action] = false;
      });
    });
  });

  // Smooth steering wheel
  const wheelElement = $("wheel");
  let wheelPointer = null;

  function updateWheel(event) {
    const rect = wheelElement.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);

    steeringTarget = THREE.MathUtils.clamp(
      dx / (rect.width * 0.42), -1, 1
    );

    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    wheelElement.style.transform =
      `rotate(${THREE.MathUtils.clamp(angle, -1.5, 1.5)}rad)`;
  }

  wheelElement.addEventListener("pointerdown", event => {
    wheelPointer = event.pointerId;
    wheelElement.setPointerCapture(event.pointerId);
    updateWheel(event);
  });

  wheelElement.addEventListener("pointermove", event => {
    if (wheelPointer === event.pointerId) updateWheel(event);
  });

  function releaseWheel() {
    wheelPointer = null;
    steeringTarget = 0;
    wheelElement.style.transition = "transform .2s ease";
    wheelElement.style.transform = "rotate(0rad)";
  }

  wheelElement.addEventListener("pointerup", releaseWheel);
  wheelElement.addEventListener("pointercancel", releaseWheel);

  // Player movement controls
  document.querySelectorAll("[data-move]").forEach(button => {
    const action = button.dataset.move;

    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      player.setMove(action, true);
      button.setPointerCapture?.(event.pointerId);
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(name => {
      button.addEventListener(name, () => {
        player.setMove(action, false);
      });
    });
  });

  $("sprintBtn").addEventListener("pointerdown", () => {
    player.setMove("run", true);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(name => {
    $("sprintBtn").addEventListener(name, () => {
      player.setMove("run", false);
    });
  });

  $("jumpBtn").addEventListener("click", () => {
    // Placeholder: add ground collision and jump physics in a later version.
    $("playerState").textContent = "JUMP NOT READY";
  });

  $("interactBtn").addEventListener("click", toggleVehicle);
  $("enterExitBtn").addEventListener("click", toggleVehicle);
  $("doorBtn").addEventListener("click", toggleNearestDoor);

  // ---------- Vehicle state ----------

  function toggleEngine() {
    engineOn = !engineOn;

    if (!engineOn) {
      speed = 0;
      $("engineBtn").textContent = "START ENGINE";
      $("engineState").textContent = "ENGINE OFF";
    } else {
      $("engineBtn").textContent = "STOP ENGINE";
      $("engineState").textContent = "ENGINE ON";
    }
  }

  $("engineBtn").addEventListener("click", toggleEngine);

  function toggleVehicle() {
    if (driving) {
      exitVehicle();
    } else {
      enterVehicle();
    }
  }

  function enterVehicle() {
    if (!started || driving) return;

    const dx = player.root.position.x - car.position.x;
    const dz = player.root.position.z - car.position.z;

    // Entry proximity check
    if (Math.hypot(dx, dz) > 5) {
      $("playerState").textContent = "MOVE CLOSER";
      return;
    }

    driving = true;
    player.setVisible(false);

    // Driver door is the left front door
    if (!window.NaolCar.doors[0].open) {
      window.NaolCar.toggleDoor(0);
    }

    if (!engineOn) toggleEngine();

    $("playerState").textContent = "DRIVING";
    $("vehicleStatus").textContent = "ACTIVE";
    $("driveControls").style.display = "block";
    $("playerControls").style.display = "none";
  }

  function exitVehicle() {
    if (!driving) return;
    if (Math.abs(speed) > 1.5) {
      $("playerState").textContent = "STOP VEHICLE FIRST";
      return;
    }

    driving = false;
    speed = 0;

    player.setVisible(true);

    const side = 2.2;
    const px = car.position.x - Math.cos(yaw) * side;
    const pz = car.position.z + Math.sin(yaw) * side;

    player.setPosition(px, pz);
    player.rotation = yaw;

    if (window.NaolCar.doors[0].open) {
      window.NaolCar.toggleDoor(0);
    }

    $("playerState").textContent = "ON FOOT";
    $("vehicleStatus").textContent = "PARKED";
    $("driveControls").style.display = "none";
    $("playerControls").style.display = "block";
  }

  function toggleNearestDoor() {
    if (!started) return;

    if (driving && Math.abs(speed) > 1.5) {
      $("vehicleStatus").textContent = "STOP FIRST";
      return;
    }

    // The nearest side/front door can be refined with door distances.
    const doors = window.NaolCar.doors;
    const index = driving ? 0 : 0;
    window.NaolCar.toggleDoor(index);
  }

  // ---------- Minimap ----------

  const mapCanvas = $("mm");
  const mapContext = mapCanvas.getContext("2d");

  function drawMap() {
    const ctx = mapContext;
    const w = mapCanvas.width;
    const h = mapCanvas.height;

    ctx.fillStyle = "#18251d";
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const scale = 0.22;
    const worldX = driving ? car.position.x : player.root.position.x;
    const worldZ = driving ? car.position.z : player.root.position.z;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-yaw);

    ctx.strokeStyle = "#59635d";
    ctx.lineWidth = 4;

    [-70, 0, 70].forEach(x => {
      ctx.beginPath();
      ctx.moveTo((x - worldX) * scale, -h);
      ctx.lineTo((x - worldX) * scale, h);
      ctx.stroke();
    });

    [0, 140, -140].forEach(z => {
      ctx.beginPath();
      ctx.moveTo(-w, (z - worldZ) * scale);
      ctx.lineTo(w, (z - worldZ) * scale);
      ctx.stroke();
    });

    ctx.restore();

    // Player/vehicle indicator
    ctx.fillStyle = "#ffe082";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "10px Arial";
    ctx.fillText("N", w - 14, 12);
  }

  // ---------- Main physics ----------

  function updateVehicle(dt) {
    if (!driving || !engineOn) {
      speed *= Math.exp(-dt * 1.8);
      return;
    }

    const gas = keys.KeyW || keys.ArrowUp || touch.g;
    const brake = keys.KeyS || keys.ArrowDown || touch.b;
    const left = keys.KeyA || keys.ArrowLeft;
    const right = keys.KeyD || keys.ArrowRight;
    const handbrake = keys.Space;

    let acceleration = 0;

    if (gas && fuel > 0) {
      acceleration += driveMode === "SPORT" ? 18 : 11;
      fuel = Math.max(0, fuel - dt * 0.015);
    }

    if (brake) {
      acceleration -= speed > 0 ? 24 : -7;
    }

    if (handbrake) {
      speed *= Math.exp(-dt * 7);
    }

    acceleration -= speed * 0.65;
    speed += acceleration * dt;
    speed = THREE.MathUtils.clamp(speed, -9, 55);

    const keySteering = Number(left) - Number(right);
    const desiredSteering = keySteering || steeringTarget;

    steering += (desiredSteering - steering) *
      (1 - Math.exp(-dt * 5));

    yaw += speed * 0.013 * steering * dt;

    forward.set(Math.sin(yaw), 0, Math.cos(yaw));

    car.position.x += forward.x * speed * dt;
    car.position.z += forward.z * speed * dt;
    car.rotation.y = yaw;

    // Simple boundary keeps the player in the generated game area.
    car.position.x = THREE.MathUtils.clamp(
      car.position.x, -850, 850
    );
    car.position.z = THREE.MathUtils.clamp(
      car.position.z, -1050, 1050
    );

    rpm = THREE.MathUtils.clamp(
      900 + Math.abs(speed) * 110 + (gas ? 900 : 0),
      900, 6500
    );

    window.NaolCar.update(dt, speed, steering);
  }

  function updateHUD() {
    $("spd").textContent = Math.round(Math.abs(speed) * 3.6);
    $("gr").textContent = !driving ? "P" :
      speed < -0.5 ? "R" :
      Math.abs(speed) < 0.5 ? "N" :
      Math.min(8, Math.floor(Math.abs(speed) / 7) + 1);

    $("rpmb").style.width = `${rpm / 65}%`;
    $("rpmValue").textContent = Math.round(rpm);
    $("fuelValue").textContent = `${Math.round(fuel)}%`;
    $("healthValue").textContent = `${Math.round(health)}%`;
    $("moneyValue").textContent = `ETB ${money}`;
    $("sc").textContent = score;
    $("driveMode").textContent = driveMode;

    $("engineState").textContent = engineOn
      ? "ENGINE ON" : "ENGINE OFF";
  }

  function updateCamera(dt) {
    const target = driving ? car : player.root;
    if (!target) return;

    const x = target.position.x;
    const z = target.position.z;
    const angle = driving ? yaw : player.rotation;

    forward.set(Math.sin(angle), 0, Math.cos(angle));

    if (cameraMode === 0) {
      desiredCamera.set(
        x - forward.x * 8,
        4.2,
        z - forward.z * 8
      );
      lookTarget.set(x + forward.x * 4, 1.4, z + forward.z * 4);
    } else if (cameraMode === 1) {
      desiredCamera.set(
        x + forward.x * 2,
        2.1,
        z + forward.z * 2
      );
      lookTarget.set(x + forward.x * 20, 1.2, z + forward.z * 20);
    } else if (cameraMode === 2 && driving) {
      desiredCamera.set(
        x - forward.x * 0.1,
        1.72,
        z - forward.z * 0.1
      );
      lookTarget.set(x + forward.x * 25, 1.5, z + forward.z * 25);
    } else if (cameraMode === 3) {
      desiredCamera.set(x, 35, z + 0.1);
      lookTarget.set(x, 0, z);
    } else {
      desiredCamera.set(
        x + Math.sin(freeYaw) * 10 * Math.cos(freePitch),
        1.5 + 10 * Math.sin(freePitch),
        z + Math.cos(freeYaw) * 10 * Math.cos(freePitch)
      );
      lookTarget.set(x, 1.2, z);
    }

    const smooth = 1 - Math.exp(-dt * 5);
    cam.position.lerp(desiredCamera, smooth);
    cam.lookAt(lookTarget);
  }

  // Free camera drag
  R.domElement.addEventListener("pointerdown", event => {
    if (cameraMode !== 4) return;
    dragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
  });

  addEventListener("pointermove", event => {
    if (!dragging || !previousPointer || cameraMode !== 4) return;

    freeYaw -= (event.clientX - previousPointer.x) * 0.008;
    freePitch = THREE.MathUtils.clamp(
      freePitch + (event.clientY - previousPointer.y) * 0.005,
      -0.2, 1.2
    );

    previousPointer = { x: event.clientX, y: event.clientY };
  });

  addEventListener("pointerup", () => {
    dragging = false;
    previousPointer = null;
  });

  // ---------- Animation loop ----------

  function loop() {
    requestAnimationFrame(loop);

    const dt = Math.min(clock.getDelta(), 0.04);

    if (!started || paused) {
      R.render(S, cam);
      return;
    }

    updateVehicle(dt);

    if (!driving) {
      player.update(dt, false);
    }

    if (engineGain && audioContext?.state === "running") {
      engineOscillator.frequency.setTargetAtTime(
        Math.max(35, rpm / 35),
        audioContext.currentTime,
        0.08
      );

      engineGain.gain.setTargetAtTime(
        engineOn ? 0.025 : 0,
        audioContext.currentTime,
        0.1
      );
    }

    updateCamera(dt);
    updateHUD();
    drawMap();
    R.render(S, cam);
  }

  // Initial player and UI state
  player.create();
  player.setVisible(true);
  $("driveControls").style.display = "block";
  $("playerControls").style.display = "none";
  $("vehicleStatus").textContent = "PARKED";
  $("playerState").textContent = "READY";

  loop();
})();

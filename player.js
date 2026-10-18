
/* =====================================================
   NAOL GANGSTER - PLAYER MODULE
   Requires Three.js and world.js loaded first.
   ===================================================== */

(() => {
  "use strict";

  const Player = {
    root: null,
    body: null,
    head: null,
    moving: false,
    speed: 5,
    rotation: 0,
    onFoot: true,
    walkPhase: 0,
    photoTexture: null,
    keys: Object.create(null)
  };

  const mat = (color, roughness = 0.9) =>
    new THREE.MeshStandardMaterial({ color, roughness });

  const skin = mat(0x75462f);
  const shirt = mat(0xf1f1ed);
  const trousers = mat(0x243e68);
  const shoes = mat(0x17191b);
  const hair = mat(0x17110e);
  const eyeMat = mat(0x211711);

  function makeBox(parent, w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function makeLimb(parent, material, radius, length, x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    parent.add(pivot);

    const limb = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, length, 4, 8),
      material
    );
    limb.position.y = -length * 0.35;
    pivot.add(limb);

    return pivot;
  }

  function create() {
    if (Player.root) return Player.root;

    const root = new THREE.Group();
    root.name = "NaolPlayer";
    Player.root = root;

    // Face and head
    const head = new THREE.Group();
    head.position.y = 1.62;
    root.add(head);
    Player.head = head;

    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 20, 16),
      skin
    );
    face.scale.set(0.91, 1.15, 0.94);
    head.add(face);

    // Hair
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55
      ),
      hair
    );
    hairCap.position.y = 0.045;
    head.add(hairCap);

    // Ears
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 8),
        skin
      );
      ear.position.set(side * 0.14, -0.005, 0);
      head.add(ear);
    });

    // Eyes on the front of the face
    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        eyeMat
      );
      eye.position.set(side * 0.047, 0.018, 0.132);
      head.add(eye);
    });

    // Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10),
      skin
    );
    neck.position.y = 1.45;
    root.add(neck);

    // Torso
    const torso = makeBox(
      root, 0.43, 0.53, 0.23, shirt, 0, 1.14, 0
    );
    torso.geometry.translate(0, 0, 0);

    // Shoulder width
    makeBox(root, 0.53, 0.15, 0.23, shirt, 0, 1.35, 0);

    // Arms
    Player.leftArm = makeLimb(
      root, skin, 0.065, 0.28, -0.29, 1.28, 0
    );
    Player.rightArm = makeLimb(
      root, skin, 0.065, 0.28, 0.29, 1.28, 0
    );

    // Trousers
    makeBox(
      root, 0.39, 0.18, 0.22, trousers, 0, 0.83, 0
    );

    Player.leftLeg = makeLimb(
      root, trousers, 0.085, 0.44, -0.115, 0.79, 0
    );
    Player.rightLeg = makeLimb(
      root, trousers, 0.085, 0.44, 0.115, 0.79, 0
    );

    // Shoes
    Player.leftFoot = makeBox(
      root, 0.13, 0.09, 0.24, shoes, -0.115, 0.055, 0.045
    );
    Player.rightFoot = makeBox(
      root, 0.13, 0.09, 0.24, shoes, 0.115, 0.055, 0.045
    );

    root.position.set(2.5, 0, -40);
    S.add(root);

    return root;
  }

  function setPhoto(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;

      const ctx = canvas.getContext("2d");
      const size = Math.min(image.width, image.height);
      const sx = (image.width - size) / 2;
      const sy = (image.height - size) / 2;

      ctx.drawImage(
        image, sx, sy, size, size,
        0, 0, canvas.width, canvas.height
      );

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;

      // This is a portrait texture, not a complete 3D face scan.
      const faceMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85
      });

      const faceMesh = Player.head?.children.find(
        child => child.geometry?.type === "SphereGeometry"
      );

      if (faceMesh) {
        faceMesh.material = faceMaterial;
        Player.photoTexture = texture;
      }

      URL.revokeObjectURL(url);
    };

    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  function setMove(key, pressed) {
    Player.keys[key] = pressed;
  }

  function update(dt, vehicleOccupied = false) {
    if (!Player.root || vehicleOccupied) return;

    const k = Player.keys;
    const forward = k.forward || k.KeyW || k.ArrowUp;
    const back = k.back || k.KeyS || k.ArrowDown;
    const left = k.left || k.KeyA || k.ArrowLeft;
    const right = k.right || k.KeyD || k.ArrowRight;
    const run = k.run || k.ShiftLeft || k.ShiftRight;

    const direction = Number(forward) - Number(back);
    const turn = Number(left) - Number(right);

    Player.moving = direction !== 0 || turn !== 0;

    if (turn) {
      Player.rotation += turn * 2.2 * dt;
    }

    if (direction) {
      const speed = run ? Player.speed * 1.65 : Player.speed;

      Player.root.position.x +=
        Math.sin(Player.rotation) * direction * speed * dt;

      Player.root.position.z +=
        Math.cos(Player.rotation) * direction * speed * dt;
    }

    Player.root.rotation.y = Player.rotation;

    if (Player.moving) {
      Player.walkPhase += dt * (run ? 12 : 8);

      const swing = Math.sin(Player.walkPhase) * 0.55;

      if (Player.leftLeg) Player.leftLeg.rotation.x = swing;
      if (Player.rightLeg) Player.rightLeg.rotation.x = -swing;
      if (Player.leftArm) Player.leftArm.rotation.x = -swing * 0.65;
      if (Player.rightArm) Player.rightArm.rotation.x = swing * 0.65;
    } else {
      [
        Player.leftLeg, Player.rightLeg,
        Player.leftArm, Player.rightArm
      ].forEach(limb => {
        if (limb) limb.rotation.x *= 0.8;
      });
    }
  }

  function setVisible(visible) {
    if (Player.root) Player.root.visible = visible;
  }

  function setPosition(x, z) {
    if (!Player.root) create();
    Player.root.position.x = x;
    Player.root.position.z = z;
  }

  window.NaolPlayer = {
    create,
    update,
    setPhoto,
    setMove,
    setVisible,
    setPosition,
    get root() { return Player.root; },
    get moving() { return Player.moving; },
    get rotation() { return Player.rotation; },
    set rotation(value) { Player.rotation = value; }
  };
})();

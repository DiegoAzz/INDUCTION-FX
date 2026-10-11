// Induction 3D Enterprise - Client Core
const socket = io();

// DOM Elements
const authModal = document.getElementById('authModal');
const employeeLoginForm = document.getElementById('employeeLoginForm');
const companySelect = document.getElementById('companySelect');

const gameContainer = document.getElementById('gameContainer');
const canvasContainer = document.getElementById('canvas3dContainer');
const playerCountEl = document.getElementById('playerCount');
const displayCompanyName = document.getElementById('displayCompanyName');
const displayEmployeeName = document.getElementById('displayEmployeeName');
const logoutBtn = document.getElementById('logoutBtn');

const interactionPrompt = document.getElementById('interactionPrompt');
const promptTargetName = document.getElementById('promptTargetName');
const meetingAlert = document.getElementById('meetingAlert');

// Modal NPC
const npcModal = document.getElementById('npcModal');
const npcAvatarImg = document.getElementById('npcAvatarImg');
const npcDeptBadge = document.getElementById('npcDeptBadge');
const npcNameTitle = document.getElementById('npcNameTitle');
const npcRoleSubtitle = document.getElementById('npcRoleSubtitle');
const npcDialogueText = document.getElementById('npcDialogueText');
const npcCloseBtn = document.getElementById('npcCloseBtn');

// Sidebar Tabs
const tabChatBtn = document.getElementById('tabChatBtn');
const tabPrivateDmBtn = document.getElementById('tabPrivateDmBtn');
const tabTasksBtn = document.getElementById('tabTasksBtn');
const tabAdminBtn = document.getElementById('tabAdminBtn');
const chatView = document.getElementById('chatView');
const privateDmView = document.getElementById('privateDmView');
const tasksView = document.getElementById('tasksView');
const adminView = document.getElementById('adminView');
const tabHRBtn = document.getElementById('tabHRBtn');
const hrView = document.getElementById('hrView');
const employeeRequestsList = document.getElementById('employeeRequestsList');
const myRequestsCountBadge = document.getElementById('myRequestsCountBadge');

// Modales HR y Notificaciones
const hrRequestModal = document.getElementById('hrRequestModal');
const openHRDeskBtn = document.getElementById('openHRDeskBtn');
const btnOpenNewRequestModal = document.getElementById('btnOpenNewRequestModal');
const closeHRRequestModalBtn = document.getElementById('closeHRRequestModalBtn');
const formHRRequest = document.getElementById('formHRRequest');

const terminatedNoticeModal = document.getElementById('terminatedNoticeModal');
const termReasonText = document.getElementById('termReasonText');
const termDateText = document.getElementById('termDateText');
const closeTermNoticeBtn = document.getElementById('closeTermNoticeBtn');

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');

const taskList = document.getElementById('taskList');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');

const adminSelectNpc = document.getElementById('adminSelectNpc');
const adminNpcName = document.getElementById('adminNpcName');
const adminNpcDept = document.getElementById('adminNpcDept');
const adminNpcInfo = document.getElementById('adminNpcInfo');
const adminEditForm = document.getElementById('adminEditForm');
const audioStreamsContainer = document.getElementById('audioStreamsContainer');

// State
let selfId = null;
let currentCompany = null;
let players = {};
let officeNpcs = [];
let nearbyTarget = null;
const visitedNPCs = new Set();

// WebRTC State
let localStream = null;
let isMuted = true;
const peerConnections = {};
const peerAudioElements = {};

// Teclas WASD & Flechas
const keysPressed = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

// ----------------------------------------------------
// THREE.JS SETUP
// ----------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.Fog(0x0f172a, 45, 120);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 14, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(800, 600);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
canvasContainer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 120;
dirLight.shadow.camera.left = -45;
dirLight.shadow.camera.right = 45;
dirLight.shadow.camera.top = 45;
dirLight.shadow.camera.bottom = -45;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.85);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const boardPointLight = new THREE.PointLight(0xec4899, 2.0, 35);
boardPointLight.position.set(0, 8, -20);
scene.add(boardPointLight);

// ----------------------------------------------------
// ENTORNO 3D DE LA OFICINA CORPORATIVA REALISTA (ESTILO ISOMÉTRICO MODERNO)
// ----------------------------------------------------

// 1. Textura procedural elegante de Suelo Parquet de Madera Cálida
function createWoodParquetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fondo madera cálida
  ctx.fillStyle = '#b4733c';
  ctx.fillRect(0, 0, 512, 512);

  // Tablones de parquet con vetas
  const plankHeight = 32;
  const plankWidth = 128;

  for (let y = 0; y < 512; y += plankHeight) {
    const offsetX = (Math.floor(y / plankHeight) % 2 === 0) ? 0 : plankWidth / 2;
    for (let x = -plankWidth; x < 512 + plankWidth; x += plankWidth) {
      const px = x + offsetX;
      // Variación sutil de color entre tablones
      const toneVariation = (Math.sin(px * 12.3 + y * 7.7) * 15);
      const r = Math.min(255, Math.max(0, 180 + toneVariation));
      const g = Math.min(255, Math.max(0, 115 + toneVariation * 0.8));
      const b = Math.min(255, Math.max(0, 60 + toneVariation * 0.6));
      ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      ctx.fillRect(px + 1, y + 1, plankWidth - 2, plankHeight - 2);

      // Líneas de ranura entre tablones
      ctx.strokeStyle = 'rgba(70, 35, 12, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, y + 1, plankWidth - 2, plankHeight - 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}

const woodTexture = createWoodParquetTexture();
const floorGeo = new THREE.PlaneGeometry(84, 84);
const floorMat = new THREE.MeshStandardMaterial({
  map: woodTexture,
  roughness: 0.4,
  metalness: 0.05
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Materiales de Arquitectura Corporativa
const wallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 }); // Paredes blancas limpias
const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 }); // Marcos de aluminio negro/acero
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x67e8f9,
  transparent: true,
  opacity: 0.30,
  roughness: 0.08,
  metalness: 0.1
}); // Vidrio templado cristalino
const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 }); // Cuero ejecutivo sillas
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }); // Metal cromado
const whiteFurnitureMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }); // Mobiliario blanco sastre
const counterWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 }); // Madera nogal mostrador
const cafeteriaGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 }); // Mueble verde cafetería

// Constructor de Mamparas de Cristal Templado con Marcos de Aluminio
function createGlassPartition(x, z, length, rotationY = 0, height = 4.8) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;

  // Panel de Vidrio
  const glass = new THREE.Mesh(new THREE.BoxGeometry(length, height - 0.2, 0.12), glassMat);
  glass.position.y = height / 2;
  group.add(glass);

  // Marco superior e inferior de aluminio
  const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.18), darkFrameMat);
  frameBottom.position.y = 0.06;
  group.add(frameBottom);

  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.18), darkFrameMat);
  frameTop.position.y = height;
  group.add(frameTop);

  // Postes verticales en los extremos
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.14, height, 0.18), darkFrameMat);
  postL.position.set(-length / 2, height / 2, 0);
  group.add(postL);

  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.14, height, 0.18), darkFrameMat);
  postR.position.set(length / 2, height / 2, 0);
  group.add(postR);

  scene.add(group);
  return group;
}

// Constructor de Paredes Sólidas Estructurales
function createWall(x, z, width, depth, height = 5.5) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Paredes Perimetrales del Edificio con Gran Ventanal
createWall(0, -38, 76, 1.4, 5.5); // Norte
createWall(0, 38, 76, 1.4, 5.5);  // Sur
createWall(-38, 0, 1.4, 76, 5.5); // Oeste
createWall(38, 0, 1.4, 76, 5.5);  // Este

// ----------------------------------------------------
// 2. GRAN SALA DE JUNTAS EJECUTIVA (BOARDROOM - ZONA NORTE)
// ----------------------------------------------------
const boardRoom = new THREE.Group();
boardRoom.position.set(0, 0, -22);

// Alfombra Azul Marino Ejecutiva
const boardCarpet = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 18),
  new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9 })
);
boardCarpet.rotation.x = -Math.PI / 2;
boardCarpet.position.y = 0.02;
boardCarpet.receiveShadow = true;
boardRoom.add(boardCarpet);

// Gran Mesa de Juntas Ovalada Ejecutiva
const boardTableBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.4, 1.8, 1.3, 24),
  darkFrameMat
);
boardTableBase.position.set(0, 0.65, 0);
boardRoom.add(boardTableBase);

const boardTablePillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.3, 18), darkFrameMat);
boardTablePillarL.position.set(-5, 0.65, 0);
boardRoom.add(boardTablePillarL);

const boardTablePillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.3, 18), darkFrameMat);
boardTablePillarR.position.set(5, 0.65, 0);
boardRoom.add(boardTablePillarR);

// Tapa de Mesa Ovalada
const tableTop = new THREE.Mesh(
  new THREE.BoxGeometry(14, 0.16, 5.2),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25 })
);
tableTop.position.y = 1.38;
tableTop.castShadow = true;
boardRoom.add(tableTop);

// Franja Pasacables de Acero Cromado Central
const cableTray = new THREE.Mesh(new THREE.BoxGeometry(11, 0.17, 0.8), chromeMat);
cableTray.position.y = 1.385;
boardRoom.add(cableTray);

// Constructor de Sillas Ergonómicas Ejecuticas de Cuero con Ruedas
function createExecutiveChair(x, z, rotY = 0) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = rotY;

  // Base de 5 ruedas cromadas
  const wheelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 12), chromeMat);
  wheelBase.position.y = 0.12;
  chair.add(wheelBase);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 12), chromeMat);
  column.position.y = 0.40;
  chair.add(column);

  // Asiento acolchado
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.95), darkLeatherMat);
  seat.position.y = 0.72;
  seat.castShadow = true;
  chair.add(seat);

  // Respaldar alto con soporte lumbar
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.90, 1.15, 0.14), darkLeatherMat);
  back.position.set(0, 1.32, -0.42);
  back.rotation.x = -0.06;
  back.castShadow = true;
  chair.add(back);

  // Descansabrazos cromados
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.65), chromeMat);
  armL.position.set(-0.52, 0.92, -0.08);
  chair.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.65), chromeMat);
  armR.position.set(0.52, 0.92, -0.08);
  chair.add(armR);

  return chair;
}

// Sillas alrededor de la mesa de conferencias
const chairPositions = [
  { x: -5, z: 3.4, rot: 0 },
  { x: -2.5, z: 3.4, rot: 0 },
  { x: 0, z: 3.4, rot: 0 },
  { x: 2.5, z: 3.4, rot: 0 },
  { x: 5, z: 3.4, rot: 0 },
  { x: -5, z: -3.4, rot: Math.PI },
  { x: -2.5, z: -3.4, rot: Math.PI },
  { x: 0, z: -3.4, rot: Math.PI },
  { x: 2.5, z: -3.4, rot: Math.PI },
  { x: 5, z: -3.4, rot: Math.PI },
  { x: -7.8, z: 0, rot: Math.PI / 2 },
  { x: 7.8, z: 0, rot: -Math.PI / 2 }
];
chairPositions.forEach(cp => {
  boardRoom.add(createExecutiveChair(cp.x, cp.z, cp.rot));
});

// Pantalla / Pizarra de Proyección Ejecutiva
const projectorScreen = new THREE.Mesh(
  new THREE.BoxGeometry(8.5, 4.2, 0.12),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
);
projectorScreen.position.set(0, 3.4, -8.7);
boardRoom.add(projectorScreen);

const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(8.8, 4.5, 0.10), darkFrameMat);
screenFrame.position.set(0, 3.4, -8.76);
boardRoom.add(screenFrame);

scene.add(boardRoom);

// Paredes de cristal divisorias para la Sala de Juntas
createGlassPartition(-11, -22, 18, Math.PI / 2);
createGlassPartition(11, -22, 18, Math.PI / 2);
createGlassPartition(-6.5, -13, 9, 0);
createGlassPartition(6.5, -13, 9, 0);

// ----------------------------------------------------
// 3. RECEPCIÓN / LOBBY CORPORATIVO (ZONA ENTRADA SUR-ESTE)
// ----------------------------------------------------
const lobbyGroup = new THREE.Group();
lobbyGroup.position.set(22, 0, 22);

// Mostrador de Recepción Curvo con Acabado Nogal y Blanco
const receptionDesk = new THREE.Mesh(
  new THREE.BoxGeometry(7.5, 1.8, 2.2),
  counterWoodMat
);
receptionDesk.position.set(0, 0.9, 0);
receptionDesk.castShadow = true;
lobbyGroup.add(receptionDesk);

const receptionTop = new THREE.Mesh(
  new THREE.BoxGeometry(7.8, 0.14, 2.4),
  whiteFurnitureMat
);
receptionTop.position.set(0, 1.84, 0);
lobbyGroup.add(receptionTop);

// Silla de recepcionista
lobbyGroup.add(createExecutiveChair(0, 1.4, 0));

// Sofás de Espera de Cuero Blanco
function createOfficeSofa(x, z, rotY = 0) {
  const sofa = new THREE.Group();
  sofa.position.set(x, 0, z);
  sofa.rotation.y = rotY;

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 1.4), whiteFurnitureMat);
  base.position.y = 0.35;
  base.castShadow = true;
  sofa.add(base);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.35), whiteFurnitureMat);
  backrest.position.set(0, 0.95, -0.55);
  sofa.add(backrest);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 1.4), whiteFurnitureMat);
  armL.position.set(-1.8, 0.65, 0);
  sofa.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 1.4), whiteFurnitureMat);
  armR.position.set(1.8, 0.65, 0);
  sofa.add(armR);

  return sofa;
}

lobbyGroup.add(createOfficeSofa(-6, -6, Math.PI / 4));
lobbyGroup.add(createOfficeSofa(-6, 4, -Math.PI / 4));

// Mesa de centro en Lobby
const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.6), darkFrameMat);
coffeeTable.position.set(-6, 0.3, -1);
lobbyGroup.add(coffeeTable);

scene.add(lobbyGroup);

// ----------------------------------------------------
// 4. CAFETERÍA & LOUNGE DE DESCANSO (ZONA SUR-OESTE)
// ----------------------------------------------------
const cafeGroup = new THREE.Group();
cafeGroup.position.set(-22, 0, 22);

// Barra de Cafetería Verde Moderna con Nevera
const kitchenBar = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.7, 1.8), cafeteriaGreenMat);
kitchenBar.position.set(0, 0.85, 0);
kitchenBar.castShadow = true;
cafeGroup.add(kitchenBar);

const kitchenTop = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.14, 2.0), whiteFurnitureMat);
kitchenTop.position.set(0, 1.75, 0);
cafeGroup.add(kitchenTop);

// Nevera ejecutiva
const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.0, 1.6), chromeMat);
fridge.position.set(-5.2, 2.0, 0);
cafeGroup.add(fridge);

// Cafetera Espresso sobre la barra
const coffeeMachine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.6), chromeMat);
coffeeMachine.position.set(2.5, 2.15, 0);
cafeGroup.add(coffeeMachine);

// Bancos altos de barra
for (let i = -2; i <= 2; i++) {
  const stool = new THREE.Group();
  stool.position.set(i * 1.6, 0, 2.2);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 10), chromeMat);
  leg.position.y = 0.6;
  stool.add(leg);

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 16), darkLeatherMat);
  seat.position.y = 1.25;
  stool.add(seat);

  cafeGroup.add(stool);
}

scene.add(cafeGroup);

// ----------------------------------------------------
// 5. CUBÍCULOS Y DIVISIONES DE CRISTAL INTERIORES
// ----------------------------------------------------
createGlassPartition(-22, 5, 24, 0);
createGlassPartition(22, 5, 24, 0);
createGlassPartition(0, 8, 18, Math.PI / 2);

// Plantas de interior elegantes en esquinas
function createOfficePlant(x, z) {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), whiteFurnitureMat);
  pot.position.y = 0.8;
  pot.castShadow = true;
  group.add(pot);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8), leafMat);
    leaf.scale.set(0.8, 2.2, 0.5);
    leaf.position.set(Math.sin(i * 1.05) * 0.5, 2.4 + i * 0.25, Math.cos(i * 1.05) * 0.5);
    leaf.rotation.y = i * 0.75;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  scene.add(group);
}

createOfficePlant(-34, -34);
createOfficePlant(34, -34);
createOfficePlant(-34, 34);
createOfficePlant(34, 34);
createOfficePlant(-14, -12);
createOfficePlant(14, -12);

// ----------------------------------------------------
// NPCS 3D CON CARAS REALES Y TEXTURAS
// ----------------------------------------------------
const textureLoader = new THREE.TextureLoader();
let npcMeshes = [];

function buildNpcWorld(npcs) {
  if (!Array.isArray(npcs)) npcs = [];
  // Limpiar NPCs previos si existen
  npcMeshes.forEach(item => {
    if (item && item.mesh) scene.remove(item.mesh);
  });
  npcMeshes = [];
  officeNpcs = npcs;

  npcs.forEach((npc, index) => {
    const color = (npc.color && typeof npc.color === 'string') ? npc.color : '#3B82F6';
    const x = (typeof npc.x === 'number' && !isNaN(npc.x)) ? npc.x : 0;
    const z = (typeof npc.z === 'number' && !isNaN(npc.z)) ? npc.z : 0;

    const stationGroup = new THREE.Group();

    // Alfombra de color delimitadora de dependencia
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.85 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.015;
    carpet.receiveShadow = true;
    stationGroup.add(carpet);

    // Mampara de Cristal de fondo para la oficina privada
    const cubicleGlass = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 3.8, 0.12),
      glassMat
    );
    cubicleGlass.position.set(0, 1.9, -3.8);
    stationGroup.add(cubicleGlass);

    const cubicleFrame = new THREE.Mesh(
      new THREE.BoxGeometry(9.8, 0.14, 0.16),
      darkFrameMat
    );
    cubicleFrame.position.set(0, 3.8, -3.8);
    stationGroup.add(cubicleFrame);

    // Escritorio Ejecutivo Moderno de Madera y Metal
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 1.5, 3.0),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
    );
    desk.position.set(0, 0.75, 0);
    desk.castShadow = true;
    stationGroup.add(desk);

    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.12, 3.2),
      whiteFurnitureMat
    );
    deskTop.position.set(0, 1.52, 0);
    deskTop.castShadow = true;
    stationGroup.add(deskTop);

    // Monitor Principal Corporativo de Alta Definición
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, 0.5, 12), chromeMat);
    stand.position.set(0, 1.80, -0.4);
    stationGroup.add(stand);

    const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.12), darkFrameMat);
    monitorFrame.position.set(0, 2.45, -0.4);
    stationGroup.add(monitorFrame);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.25, 0.06),
      new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.45 })
    );
    screen.position.set(0, 2.45, -0.34);
    stationGroup.add(screen);

    // Teclado y Mouse
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.45), darkFrameMat);
    keyboard.position.set(0, 1.60, 0.3);
    stationGroup.add(keyboard);

    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.28), darkFrameMat);
    mouse.position.set(0.9, 1.60, 0.3);
    stationGroup.add(mouse);

    // Silla Ejecutiva detrás del escritorio
    stationGroup.add(createExecutiveChair(0, -1.7, 0));

    // Archivador / Cajonera bajo el escritorio
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.2), whiteFurnitureMat);
    cabinet.position.set(2.2, 0.60, 0);
    stationGroup.add(cabinet);

    // NPC Modelo Humanoide Ejecutivo Corporativo
    const nameLower = (npc.name || '').toLowerCase();
    const isFemale = nameLower.includes('yenis') || nameLower.includes('maria') || nameLower.includes('laura') || nameLower.includes('ana') || nameLower.endsWith('a');
    const npcAvatar = createAvatarMesh(color, false, {
      name: npc.name,
      role: npc.role,
      style: isFemale ? 'executive_female' : 'executive_male'
    });
    npcAvatar.position.set(0, 0, -1.8);
    stationGroup.add(npcAvatar);

    stationGroup.position.set(x, 0, z);
    scene.add(stationGroup);

    npcMeshes.push({
      npcData: { ...npc, x, z, color },
      mesh: stationGroup,
      npcModel: npcAvatar
    });
  });
}

// ----------------------------------------------------
// AVATARES DE JUGADORES 3D - EJECUTIVOS CORPORATIVOS HD
// ----------------------------------------------------
const playerMeshes = {};
const faceTextureCache = {};

function getFaceTexture(type = 'male') {
  if (faceTextureCache[type]) return faceTextureCache[type];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  const isFemale = (type === 'female' || type === 'executive_female');

  function drawExecutiveEye(cx, cy, isLeft) {
    // Fondo blanco del ojo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 44, 52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Contorno fino
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Iris
    ctx.fillStyle = isFemale ? '#1e3a5f' : '#334155';
    ctx.beginPath();
    ctx.arc(cx + (isLeft ? 3 : -3), cy, 30, 0, Math.PI * 2);
    ctx.fill();

    // Pupila negra
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx + (isLeft ? 3 : -3), cy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Brillo blanco nítido
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + (isLeft ? 12 : 5), cy - 9, 9, 0, Math.PI * 2);
    ctx.fill();

    // Pestaña superior
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = isFemale ? 7 : 5;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 44, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Ceja formal ejecutiva
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - 38, cy - 70, 76, 16, 8);
    else ctx.rect(cx - 38, cy - 70, 76, 16);
    ctx.fill();
  }

  drawExecutiveEye(170, 215, true);
  drawExecutiveEye(342, 215, false);

  // Sonrisa profesional
  ctx.strokeStyle = isFemale ? '#be123c' : '#881337';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 310, 36, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.stroke();

  // Rubor suave
  ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
  ctx.beginPath();
  ctx.arc(130, 290, 28, 0, Math.PI * 2);
  ctx.arc(382, 290, 28, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  faceTextureCache[type] = tex;
  return tex;
}

function createNameplateTexture(name, role) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
  grad.addColorStop(1, 'rgba(30, 41, 59, 0.90)');
  ctx.fillStyle = grad;
  if (ctx.roundRect) ctx.roundRect(12, 12, 488, 104, 52);
  else ctx.rect(12, 12, 488, 104);
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(62, 64, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText((name || 'FUNCIONARIO').toUpperCase(), 94, 56);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 22px sans-serif';
  ctx.fillText((role || 'CORPORATIVO').toUpperCase(), 94, 88);

  return new THREE.CanvasTexture(canvas);
}

function createAvatarMesh(colorHex, isSelf = false, options = {}) {
  const safeColor = (colorHex && typeof colorHex === 'string') ? colorHex : '#3b82f6';
  const name = options.name || 'Funcionario';
  const role = options.role || 'Oficina 3D';
  let style = options.style || 'executive_male';

  const isFemale = (style === 'executive_female' || style === 'female' || name.toLowerCase().includes('yenis') || name.toLowerCase().includes('maria') || name.toLowerCase().includes('laura'));

  const root = new THREE.Group();
  const char = new THREE.Group();
  root.add(char);

  // 1. Sombra de contacto suave
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  // Halo iluminado para el jugador actual
  if (isSelf) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1.02, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.03;
    root.add(halo);
  }

  // Materiales formales ejecutivos
  const tieColorHex = options.tieColor || '#dc2626';
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfa384, roughness: 0.65 });
  const suitMat = new THREE.MeshStandardMaterial({ color: safeColor, roughness: 0.45 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const tieMat = new THREE.MeshStandardMaterial({ color: tieColorHex, roughness: 0.35 }); // Corbata ejecutiva
  const darkShoesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25 }); // Zapatos oxford de cuero
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.25 });
  const hairMat = new THREE.MeshStandardMaterial({ color: isFemale ? 0x451a03 : 0x1c1917, roughness: 0.6 });
  const leatherBriefcaseMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.35 });

  // 2. PIERNAS: Pantalón de vestir sastre y Zapatos Oxford
  const legL = new THREE.Group();
  legL.position.set(-0.25, 1.10, 0);
  char.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.25, 1.10, 0);
  char.add(legR);

  function buildExecutiveLeg(parent) {
    const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.165, 0.90, 16), suitMat);
    trouser.position.y = -0.45;
    trouser.castShadow = true;
    parent.add(trouser);

    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.90, 0.06);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.07, 0.54), darkShoesMat);
    sole.position.y = -0.04;
    sole.castShadow = true;
    shoeGroup.add(sole);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.14, 0.46), darkShoesMat);
    upper.position.set(0, 0.05, 0.02);
    upper.castShadow = true;
    shoeGroup.add(upper);

    const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.23, 14), darkShoesMat);
    toe.rotation.z = Math.PI / 2;
    toe.position.set(0, 0.02, 0.23);
    shoeGroup.add(toe);

    parent.add(shoeGroup);
  }

  buildExecutiveLeg(legL);
  buildExecutiveLeg(legR);

  // 3. CADERA Y CINTURÓN FORMAL
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.37, 0.24, 18), suitMat);
  pelvis.position.y = 1.22;
  pelvis.castShadow = true;
  char.add(pelvis);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.08, 18), beltMat);
  belt.position.y = 1.32;
  char.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.05), goldMat);
  buckle.position.set(0, 1.32, 0.40);
  char.add(buckle);

  // 4. TORSO: Saco / Blazer Formal Ejecutivo
  const blazer = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.40, 0.88, 18), suitMat);
  blazer.position.y = 1.76;
  blazer.castShadow = true;
  char.add(blazer);

  // Camisa formal blanca con cuello
  const shirtChest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.76, 0.14), shirtMat);
  shirtChest.position.set(0, 1.84, 0.37);
  char.add(shirtChest);

  // Solapas de saco formal
  const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), suitMat);
  lapelL.position.set(-0.16, 1.82, 0.41);
  lapelL.rotation.z = -0.15;
  char.add(lapelL);

  const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), suitMat);
  lapelR.position.set(0.16, 1.82, 0.41);
  lapelR.rotation.z = 0.15;
  char.add(lapelR);

  // Corbata formal o broche
  if (!isFemale) {
    const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.05), tieMat);
    tieKnot.position.set(0, 2.14, 0.42);
    char.add(tieKnot);

    const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.55, 0.04), tieMat);
    tieBody.position.set(0, 1.82, 0.43);
    char.add(tieBody);
  } else {
    const brooch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), goldMat);
    brooch.position.set(-0.22, 1.95, 0.44);
    char.add(brooch);
  }

  // Botones dorados ejecutivos
  const buttonTop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), goldMat);
  buttonTop.rotation.x = Math.PI / 2;
  buttonTop.position.set(0, 1.62, 0.44);
  char.add(buttonTop);

  const buttonBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), goldMat);
  buttonBottom.rotation.x = Math.PI / 2;
  buttonBottom.position.set(0, 1.48, 0.43);
  char.add(buttonBottom);

  // Gafete de acreditación corporativa oficial
  const badgeGroup = new THREE.Group();
  badgeGroup.position.set(0, 1.68, 0.47);
  const lanyard = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
  lanyard.position.y = 0.17;
  badgeGroup.add(lanyard);
  const badgeCard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.02), shirtMat);
  badgeCard.castShadow = true;
  badgeGroup.add(badgeCard);
  const badgePhoto = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.025), new THREE.MeshBasicMaterial({ color: safeColor }));
  badgePhoto.position.set(0, 0.04, 0.005);
  badgeGroup.add(badgePhoto);
  char.add(badgeGroup);

  // 5. BRAZOS Y MANGAS DE SACO
  const armL = new THREE.Group();
  armL.position.set(-0.55, 2.10, 0);
  char.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.55, 2.10, 0);
  char.add(armR);

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.74, 14), suitMat);
  sleeveL.position.y = -0.37;
  sleeveL.castShadow = true;
  armL.add(sleeveL);

  const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.06, 14), shirtMat);
  cuffL.position.y = -0.73;
  armL.add(cuffL);

  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 14), skinMat);
  handL.position.y = -0.79;
  handL.castShadow = true;
  armL.add(handL);

  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.74, 14), suitMat);
  sleeveR.position.y = -0.37;
  sleeveR.castShadow = true;
  armR.add(sleeveR);

  const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.06, 14), shirtMat);
  cuffR.position.y = -0.73;
  armR.add(cuffR);

  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 14), skinMat);
  handR.position.y = -0.79;
  handR.castShadow = true;
  armR.add(handR);

  // Maletín Ejecutivo de Cuero Formal
  const briefcase = new THREE.Group();
  briefcase.position.set(0.15, -0.80, 0.10);

  const caseBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.12), leatherBriefcaseMat);
  caseBody.castShadow = true;
  briefcase.add(caseBody);

  const lockL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.13), goldMat);
  lockL.position.set(-0.14, 0.06, 0);
  briefcase.add(lockL);

  const lockR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.13), goldMat);
  lockR.position.set(0.14, 0.06, 0);
  briefcase.add(lockR);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), goldMat);
  handle.position.set(0, 0.18, 0);
  briefcase.add(handle);

  armR.add(briefcase);

  // 6. CUELLO Y CABEZA
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 14), skinMat);
  neck.position.y = 2.26;
  char.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.65, 0);
  char.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24), skinMat);
  headMesh.scale.set(1.0, 1.06, 0.98);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), skinMat);
  earL.position.set(-0.48, 0, 0);
  earL.scale.set(0.4, 1, 0.7);
  headGroup.add(earL);

  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), skinMat);
  earR.position.set(0.48, 0, 0);
  earR.scale.set(0.4, 1, 0.7);
  headGroup.add(earR);

  // Capa de Rostro Expressive
  const faceTex = getFaceTexture(isFemale ? 'female' : 'male');
  const facePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.72),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true })
  );
  facePlane.position.set(0, -0.01, 0.475);
  headGroup.add(facePlane);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
  nose.position.set(0, -0.04, 0.48);
  headGroup.add(nose);

  // 7. PEINADO FORMAL EJECUTIVO (SIN GORRAS NI SOMBREROS)
  const hairGroup = new THREE.Group();

  if (isFemale) {
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.50, 22, 16, 0, Math.PI * 2, 0, Math.PI / 1.7),
      hairMat
    );
    hairCrown.position.y = 0.08;
    hairGroup.add(hairCrown);

    const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.42), hairMat);
    hairSideL.position.set(-0.45, -0.15, 0.05);
    hairGroup.add(hairSideL);

    const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.42), hairMat);
    hairSideR.position.set(0.45, -0.15, 0.05);
    hairGroup.add(hairSideR);

    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), hairMat);
    bun.position.set(0, 0.05, -0.46);
    hairGroup.add(bun);
  } else {
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.50, 22, 16, 0, Math.PI * 2, 0, Math.PI / 1.8),
      hairMat
    );
    hairCrown.position.y = 0.08;
    hairGroup.add(hairCrown);

    const part = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.38), hairMat);
    part.position.set(0.04, 0.42, 0.16);
    part.rotation.z = -0.10;
    hairGroup.add(part);

    const sideburnL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.14), hairMat);
    sideburnL.position.set(-0.46, -0.05, 0.08);
    hairGroup.add(sideburnL);

    const sideburnR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.14), hairMat);
    sideburnR.position.set(0.46, -0.05, 0.08);
    hairGroup.add(sideburnR);
  }

  headGroup.add(hairGroup);

  // Cartel Flotante con Nombre y Cargo
  const nameTex = createNameplateTexture(name, role);
  const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true }));
  nameSprite.position.set(0, 3.65, 0);
  nameSprite.scale.set(2.8, 0.7, 1);
  root.add(nameSprite);

  root.userData = {
    leftLeg: legL,
    rightLeg: legR,
    armL: armL,
    armR: armR,
    char: char,
    head: headGroup,
    walkTime: 0
  };

  return root;
}

// ----------------------------------------------------
// CONTROLES WASD Y FLECHAS INFALIBLES
// ----------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (document.activeElement?.tagName === 'INPUT' || 
      document.activeElement?.tagName === 'TEXTAREA' || 
      document.activeElement?.tagName === 'SELECT') {
    return;
  }

  const code = e.code;
  const key = e.key.toLowerCase();

  if (code === 'KeyW' || key === 'w' || code === 'ArrowUp' || key === 'arrowup') keysPressed.forward = true;
  if (code === 'KeyS' || key === 's' || code === 'ArrowDown' || key === 'arrowdown') keysPressed.backward = true;
  if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft' || key === 'arrowleft') keysPressed.left = true;
  if (code === 'KeyD' || key === 'd' || code === 'ArrowRight' || key === 'arrowright') keysPressed.right = true;

  if (code === 'KeyE' || key === 'e') {
    if (nearbyTarget && npcModal.classList.contains('hidden')) {
      openNpcModal(nearbyTarget);
    } else if (window.currentNearbyPeer && peerActionModal && peerActionModal.classList.contains('hidden')) {
      openPeerActionModal(window.currentNearbyPeer.id);
    }
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  const key = e.key.toLowerCase();

  if (code === 'KeyW' || key === 'w' || code === 'ArrowUp' || key === 'arrowup') keysPressed.forward = false;
  if (code === 'KeyS' || key === 's' || code === 'ArrowDown' || key === 'arrowdown') keysPressed.backward = false;
  if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft' || key === 'arrowleft') keysPressed.left = false;
  if (code === 'KeyD' || key === 'd' || code === 'ArrowRight' || key === 'arrowright') keysPressed.right = false;
});

// ----------------------------------------------------
// CONTROLES TÁCTILES MÓVILES (JOYSTICK VIRTUAL)
// ----------------------------------------------------
const joystickBase = document.getElementById('joystickBase');
const joystickStick = document.getElementById('joystickStick');
const mobileInteractBtn = document.getElementById('mobileInteractBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.querySelector('.sidebar');

let touchMoveX = 0;
let touchMoveZ = 0;
let isJoystickActive = false;
let joystickTouchId = null;

if (joystickBase) {
  const maxRadius = 35; // Radio máximo del stick en px

  joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    isJoystickActive = true;
    updateJoystickPos(touch);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!isJoystickActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        updateJoystickPos(e.changedTouches[i]);
        break;
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (!isJoystickActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        isJoystickActive = false;
        joystickTouchId = null;
        touchMoveX = 0;
        touchMoveZ = 0;
        joystickStick.style.transform = `translate(0px, 0px)`;
        break;
      }
    }
  });

  function updateJoystickPos(touch) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) {
      touchMoveX = 0;
      touchMoveZ = 0;
      joystickStick.style.transform = `translate(0px, 0px)`;
      return;
    }

    const angle = Math.atan2(deltaY, deltaX);
    const clampedDist = Math.min(distance, maxRadius);
    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

    // Normalizar vector de movimiento para el mundo 3D
    touchMoveX = stickX / maxRadius;
    touchMoveZ = stickY / maxRadius;
  }
}

// Botón Táctil de Hablar con NPC en móvil
if (mobileInteractBtn) {
  mobileInteractBtn.addEventListener('click', () => {
    if (nearbyTarget && npcModal.classList.contains('hidden')) {
      openNpcModal(nearbyTarget);
    }
  });
}

// Abrir / Cerrar Drawer de Sidebar en móviles
if (toggleSidebarBtn && sidebar) {
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

function handleResize() {
  const isMobile = window.innerWidth <= 768;
  const rect = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
  const width = (rect && rect.width > 0) ? rect.width : (canvasContainer?.clientWidth || window.innerWidth);
  const height = (rect && rect.height > 0) ? rect.height : (canvasContainer?.clientHeight || Math.max(window.innerHeight - 64, 300));

  camera.aspect = width / Math.max(height, 1);
  camera.fov = isMobile ? 65 : 50;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
window.addEventListener('resize', handleResize);

// ----------------------------------------------------
// GESTIÓN DE EMPRESAS Y AUTENTICACIÓN DE FUNCIONARIOS
// ----------------------------------------------------
const playerEmail = document.getElementById('playerEmail');
const playerPassword = document.getElementById('playerPassword');
const loginModalTitle = document.getElementById('loginModalTitle');
const loginModalSubtitle = document.getElementById('loginModalSubtitle');
const companySelectGroup = document.getElementById('companySelectGroup');

// Obtener slug de empresa desde la URL (?company=sysnet)
const urlParamsGame = new URLSearchParams(window.location.search);
const requestedCompanySlug = urlParamsGame.get('company');

let companiesCache = {};

async function loadCompanies() {
  try {
    const res = await fetch('/api/companies');
    const companies = await res.json();
    companySelect.innerHTML = '';
    companiesCache = {};

    companies.forEach(c => {
      companiesCache[c.id] = c;
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.departmentCount || 0} dep.)`;
      companySelect.appendChild(opt);
    });

    if (requestedCompanySlug && companies.some(c => c.id === requestedCompanySlug)) {
      companySelect.value = requestedCompanySlug;
      const comp = companiesCache[requestedCompanySlug];
      if (comp) {
        if (loginModalTitle) loginModalTitle.textContent = `Sede Virtual: ${comp.name}`;
        if (loginModalSubtitle) loginModalSubtitle.textContent = `Ingresa con tus credenciales de funcionario de ${comp.name}.`;
      }
    } else if (companies.length > 0) {
      companySelect.value = companies[0].id;
    }
  } catch (err) {
    console.error('Error cargando empresas:', err);
  }
}

companySelect.addEventListener('change', () => {
  const comp = companiesCache[companySelect.value];
  if (comp) {
    if (loginModalTitle) loginModalTitle.textContent = `Sede Virtual: ${comp.name}`;
    if (loginModalSubtitle) loginModalSubtitle.textContent = `Ingresa con tus credenciales de funcionario de ${comp.name}.`;
  }
});

// Ingreso / Login de Funcionario a la Empresa
employeeLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const companyId = companySelect.value;
  const email = playerEmail.value.trim().toLowerCase();
  const password = playerPassword.value.trim();
  const color = document.querySelector('input[name="avatarColor"]:checked')?.value || '#3b82f6';
  const avatarStyle = document.querySelector('input[name="avatarStyle"]:checked')?.value || 'executive_male';

  try {
    const res = await fetch(`/api/companies/${companyId}/employee-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!data.success) {
      if (data.terminated) {
        showTerminationNotice(data.terminationReason);
        return;
      }
      alert(data.error || 'Credenciales de funcionario incorrectas.');
      return;
    }

    const emp = data.employee;
    const company = data.company;

    // Guardar sesión en localStorage
    localStorage.setItem('induction_session', JSON.stringify({
      companyId: company.id,
      name: emp.name,
      email: emp.email,
      role: emp.role || 'Funcionario',
      department: emp.department || 'General',
      color: color,
      avatarStyle: avatarStyle
    }));

    loginPlayer(company.id, emp.name, emp.email, emp.role || 'Funcionario', emp.department || 'General', color, avatarStyle);
    loadEmployeeHRRequests();
  } catch (err) {
    alert('Error al autenticar funcionario con el servidor.');
  }
});

// Selección visual de tarjetas de estilo de avatar
document.querySelectorAll('.avatar-style-picker .style-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.avatar-style-picker .style-card').forEach(c => {
      c.style.border = '2px solid rgba(255,255,255,0.1)';
      c.style.background = 'rgba(30, 41, 59, 0.4)';
    });
    card.style.border = '2px solid #3b82f6';
    card.style.background = 'rgba(30, 41, 59, 0.8)';
    const input = card.querySelector('input');
    if (input) input.checked = true;
  });
});

function showTerminationNotice(reason, date) {
  if (termReasonText) termReasonText.textContent = reason || 'Terminación de contrato laboral';
  if (termDateText) termDateText.textContent = date || new Date().toLocaleDateString('es-CO');
  if (terminatedNoticeModal) terminatedNoticeModal.classList.remove('hidden');
}

if (closeTermNoticeBtn) {
  closeTermNoticeBtn.addEventListener('click', () => {
    localStorage.removeItem('induction_session');
    location.reload();
  });
}

function loginPlayer(companyId, name, email, role, department, color, avatarStyle = 'executive_male') {
  socket.emit('player:join', { companyId, name, email, role, department, color, avatarStyle });
  authModal.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  displayEmployeeName.textContent = `${name} • ${role} (${department || 'General'})`;
  handleResize();
  requestAnimationFrame(() => handleResize());
  setTimeout(() => handleResize(), 150);
}

// Cerrar sesión
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('induction_session');
  location.reload();
});

// Inicializar empresas y sesión
async function initApp() {
  await loadCompanies();
  const saved = localStorage.getItem('induction_session');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.companyId && data.name) {
        loginPlayer(data.companyId, data.name, data.email || '', data.role || 'Funcionario', data.department || 'General', data.color || '#3b82f6', data.avatarStyle || 'executive_male');
      }
    } catch (e) {
      console.warn('Error restaurando sesión');
    }
  }
}

initApp();
window.addEventListener('DOMContentLoaded', initApp);

function updatePlayerCount() {
  const count = Object.keys(players || {}).length || 1;
  if (playerCountEl) playerCountEl.textContent = count;
}

// ----------------------------------------------------
// SOCKETS Y MULTIJUGADOR
// ----------------------------------------------------
socket.on('office:init', (data) => {
  selfId = data.selfId;
  currentCompany = data.company;
  displayCompanyName.textContent = data.company.name;
  players = data.players;

  // Restaurar progreso de misiones guardadas en DB
  visitedNPCs.clear();
  if (data.savedProgress) {
    data.savedProgress.forEach(id => visitedNPCs.add(id));
  }

  buildNpcWorld(data.npcs);
  renderChecklist();
  if (typeof populateAdminForm === 'function') populateAdminForm();
  updatePlayerCount();

  // Crear avatares 3D
  for (const id in players) {
    const p = players[id];
    const isMe = id === selfId;
    const mesh = createAvatarMesh(p.suitColor || p.color || '#1e3a8a', isMe, {
      name: p.name,
      role: p.role,
      department: p.department,
      style: p.avatarStyle || (p.gender === 'female' ? 'executive_female' : 'executive_male'),
      tieColor: p.tieColor || '#dc2626'
    });
    mesh.position.set(p.x || 0, 0, p.z || 0);
    scene.add(mesh);
    playerMeshes[id] = mesh;
  }

  handleResize();
  if (selfId && playerMeshes[selfId]) {
    const pMesh = playerMeshes[selfId];
    camera.position.set(pMesh.position.x, pMesh.position.y + 14, pMesh.position.z + 18);
    camera.lookAt(pMesh.position.x, 1.5, pMesh.position.z);
  }
  if (!isAnimating) {
    isAnimating = true;
    animate();
  }
});

socket.on('player:joined', (player) => {
  players[player.id] = player;
  updatePlayerCount();

  const mesh = createAvatarMesh(player.suitColor || player.color || '#1e3a8a', false, {
    name: player.name,
    role: player.role,
    department: player.department,
    style: player.avatarStyle || (player.gender === 'female' ? 'executive_female' : 'executive_male'),
    tieColor: player.tieColor || '#dc2626'
  });
  mesh.position.set(player.x || 0, 0, player.z || 0);
  scene.add(mesh);
  playerMeshes[player.id] = mesh;

  addChatMessage({
    senderName: '🏢 Sede 3D',
    text: `${player.name} (${player.role}) se conectó a la oficina.`,
    isSystem: true
  });

  if (localStream) initiatePeerConnection(player.id, true);
});

socket.on('player:moved', (data) => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].z = data.z;
    players[data.id].rotationY = data.rotationY;
    players[data.id].inMeetingRoom = data.inMeetingRoom;

    const mesh = playerMeshes[data.id];
    if (mesh) {
      const movedDist = Math.hypot(data.x - mesh.position.x, data.z - mesh.position.z);
      mesh.position.set(data.x, 0, data.z);
      if (data.rotationY !== undefined) mesh.rotation.y = data.rotationY;

      // Animación de caminata remota
      if (movedDist > 0.02 && mesh.userData) {
        mesh.userData.walkTime += 0.35;
        const cycle = mesh.userData.walkTime;
        if (mesh.userData.leftLeg) mesh.userData.leftLeg.rotation.x = Math.sin(cycle) * 0.7;
        if (mesh.userData.rightLeg) mesh.userData.rightLeg.rotation.x = -Math.sin(cycle) * 0.7;
        if (mesh.userData.armL) mesh.userData.armL.rotation.x = -Math.sin(cycle) * 0.6;
        if (mesh.userData.armR) mesh.userData.armR.rotation.x = Math.sin(cycle) * 0.6;
        if (mesh.userData.char) mesh.userData.char.position.y = Math.abs(Math.sin(cycle)) * 0.08;
      }
    }
    updateSpatialAudioVolumes();
  }
});

socket.on('player:voice_updated', (data) => {
  if (players[data.id]) {
    players[data.id].isSpeaking = data.isSpeaking;
    const mesh = playerMeshes[data.id];
    if (mesh) {
      let wave = mesh.getObjectByName('voiceWave');
      if (data.isSpeaking) {
        if (!wave) {
          const waveGeo = new THREE.RingGeometry(1.2, 1.45, 32);
          const waveMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
          wave = new THREE.Mesh(waveGeo, waveMat);
          wave.name = 'voiceWave';
          wave.rotation.x = -Math.PI / 2;
          wave.position.y = 0.05;
          mesh.add(wave);
        }
        wave.visible = true;
      } else if (wave) {
        wave.visible = false;
      }
    }
  }
});

socket.on('player:left', (id) => {
  if (players[id]) {
    addChatMessage({
      senderName: '🏢 Sede 3D',
      text: `${players[id].name} se desconectó.`,
      isSystem: true
    });
    delete players[id];
    if (playerMeshes[id]) {
      scene.remove(playerMeshes[id]);
      delete playerMeshes[id];
    }
    closePeerConnection(id);
    updatePlayerCount();
  }
});

socket.on('office:npcs_updated', (npcs) => {
  buildNpcWorld(npcs);
  renderChecklist();
  if (typeof populateAdminForm === 'function') populateAdminForm();
});

// ----------------------------------------------------
// SISTEMA DE LLAMADAS PRIVADAS 1 A 1 & CHAT PRIVADO (DM)
// ----------------------------------------------------
const privateDmMessages = document.getElementById('privateDmMessages');
const privateDmForm = document.getElementById('privateDmForm');
const privateDmInput = document.getElementById('privateDmInput');
const privateDmSendBtn = document.getElementById('privateDmSendBtn');
const dmTargetHeader = document.getElementById('dmTargetHeader');

const peerActionModal = document.getElementById('peerActionModal');
const peerModalName = document.getElementById('peerModalName');
const peerModalRole = document.getElementById('peerModalRole');
const peerStartCallBtn = document.getElementById('peerStartCallBtn');
const peerStartChatBtn = document.getElementById('peerStartChatBtn');
const peerModalCloseBtn = document.getElementById('peerModalCloseBtn');

const incomingCallAlert = document.getElementById('incomingCallAlert');
const callerNameDisplay = document.getElementById('callerNameDisplay');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const rejectCallBtn = document.getElementById('rejectCallBtn');

const activeCallBar = document.getElementById('activeCallBar');
const activeCallPartnerName = document.getElementById('activeCallPartnerName');
const hangupCallBtn = document.getElementById('hangupCallBtn');

let selectedPeerId = null;
let activeCallPartnerId = null;
let incomingCallerId = null;
let ringtoneInterval = null;

// Sintetizador de Timbre de Llamada
function playRingtone() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) { }
}

function startRingtone() {
  playRingtone();
  ringtoneInterval = setInterval(playRingtone, 2000);
}

function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

// Abrir modal de opciones cuando te acercas a un compañero
function openPeerActionModal(peerId) {
  const peer = players[peerId];
  if (!peer) return;

  selectedPeerId = peerId;
  peerModalName.textContent = peer.name;
  peerModalRole.textContent = `${peer.role || 'Funcionario'} (${peer.department || 'General'})`;
  peerActionModal.classList.remove('hidden');
}

peerModalCloseBtn.addEventListener('click', () => peerActionModal.classList.add('hidden'));

// 1. Iniciar Llamada de Voz Privada
peerStartCallBtn.addEventListener('click', async () => {
  peerActionModal.classList.add('hidden');
  if (!selectedPeerId) return;

  await ensureMicrophone();
  socket.emit('call:request', { targetId: selectedPeerId });
  alert(`Llamando a ${peerModalName.textContent}... Esperando que acepte.`);
});

// 2. Iniciar Chat Privado Directo (DM)
peerStartChatBtn.addEventListener('click', () => {
  peerActionModal.classList.add('hidden');
  if (!selectedPeerId) return;

  const peer = players[selectedPeerId];
  dmTargetHeader.textContent = `Chat Privado con ${peer.name} (${peer.role})`;
  privateDmInput.disabled = false;
  privateDmSendBtn.disabled = false;
  privateDmInput.focus();

  // Abrir pestaña de chat privado
  switchTab(tabPrivateDmBtn, privateDmView);
});

// Recibir Llamada Entrante
socket.on('call:incoming', (data) => {
  incomingCallerId = data.callerId;
  callerNameDisplay.textContent = `${data.callerName} (${data.callerRole})`;
  incomingCallAlert.classList.remove('hidden');
  startRingtone();
});

// Aceptar Llamada
acceptCallBtn.addEventListener('click', async () => {
  stopRingtone();
  incomingCallAlert.classList.add('hidden');
  if (!incomingCallerId) return;

  await ensureMicrophone();
  socket.emit('call:accept', { callerId: incomingCallerId });
});

// Rechazar Llamada
rejectCallBtn.addEventListener('click', () => {
  stopRingtone();
  incomingCallAlert.classList.add('hidden');
  if (incomingCallerId) {
    socket.emit('call:reject', { callerId: incomingCallerId });
    incomingCallerId = null;
  }
});

socket.on('call:declined', (data) => {
  alert(`${data.partnerName} no puede atender tu llamada en este momento.`);
});

// Llamada Conectada Exitosamente
socket.on('call:connected', (data) => {
  activeCallPartnerId = data.partnerId;
  activeCallPartnerName.textContent = data.partnerName;
  activeCallBar.classList.remove('hidden');

  // En llamada privada, activar micrófono continuo entre ambos
  if (localStream) {
    localStream.getAudioTracks().forEach(t => t.enabled = true);
  }
  playRadioBeep(true);
});

// Colgar / Terminar Llamada
hangupCallBtn.addEventListener('click', () => {
  if (activeCallPartnerId) {
    socket.emit('call:hangup', { partnerId: activeCallPartnerId });
  }
  endActiveCall();
});

socket.on('call:ended', () => {
  alert('La llamada privada ha finalizado.');
  endActiveCall();
});

function endActiveCall() {
  activeCallPartnerId = null;
  activeCallBar.classList.add('hidden');
  if (localStream) {
    localStream.getAudioTracks().forEach(t => t.enabled = false);
  }
  playRadioBeep(false);
}

// Enviar Mensaje Privado DM
privateDmForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = privateDmInput.value.trim();
  if (text && selectedPeerId) {
    socket.emit('chat:private_dm', { targetId: selectedPeerId, text });
    privateDmInput.value = '';
  }
});

// Recibir Mensaje Privado DM
socket.on('chat:private_receive', (msg) => {
  const el = document.createElement('div');
  const isMe = msg.senderId === selfId;
  el.className = 'chat-msg';
  el.style.borderLeftColor = '#8b5cf6';
  el.style.background = 'rgba(139, 92, 246, 0.08)';

  el.innerHTML = `
    <div class="chat-msg-header">
      <strong style="color: #c4b5fd;">🔒 ${escapeHtml(msg.senderName)} ${isMe ? '(Tú)' : ''}</strong>
      <span>${msg.timestamp || ''}</span>
    </div>
    <div>${escapeHtml(msg.text)}</div>
  `;

  privateDmMessages.appendChild(el);
  privateDmMessages.scrollTop = privateDmMessages.scrollHeight;
});

tabPrivateDmBtn.addEventListener('click', () => switchTab(tabPrivateDmBtn, privateDmView));

// ----------------------------------------------------
// AUDIO WALKIE-TALKIE PUSH-TO-TALK (ESTILO RADIO TAXI)
// ----------------------------------------------------
const pttButton = document.getElementById('pttButton');
const transmittingIndicator = document.getElementById('transmittingIndicator');
let isTransmitting = false;

// Sintetizador Web Audio para efectos de sonido de Radio Walkie-Talkie (Bip de inicio y cierre)
let audioCtx = null;
function playRadioBeep(isStart = true) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (isStart) {
      // Bip de inicio (agudo ascendente)
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else {
      // Bip de fin (descendente corto)
      osc.frequency.setValueAtTime(1100, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(650, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }
  } catch (e) {
    // Si el navegador bloquea audio antes de interacción
  }
}

// Reconstrucción del mapa 3D en caliente (cuando se agregan dependencias)
socket.on('office:rebuild_layout', (npcs) => {
  buildNpcWorld(npcs);
  renderChecklist();
  if (typeof populateAdminForm === 'function') populateAdminForm();
});

// Inicializar micrófono con cancelación estricta de eco y ruido
async function ensureMicrophone() {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      // Mantener tracks en silencio por defecto hasta pulsar PTT
      localStream.getAudioTracks().forEach(t => t.enabled = false);

      // Conectar P2P con todos los usuarios presentes
      for (const id in players) {
        if (id !== selfId) initiatePeerConnection(id, true);
      }
    } catch (err) {
      console.warn('Permiso de micrófono no otorgado aún:', err);
    }
  }
}

// Iniciar transmisión de radio (PULSAR)
async function startTransmitting() {
  if (isTransmitting) return;
  await ensureMicrophone();

  if (localStream) {
    isTransmitting = true;
    localStream.getAudioTracks().forEach(t => t.enabled = true);
    pttButton.classList.add('transmitting');
    transmittingIndicator.classList.remove('hidden');
    playRadioBeep(true);

    socket.emit('player:voice_state', { isMuted: false, isSpeaking: true });
  }
}

// Detener transmisión de radio (SOLTAR)
function stopTransmitting() {
  if (!isTransmitting) return;
  isTransmitting = false;

  if (localStream) {
    localStream.getAudioTracks().forEach(t => t.enabled = false);
  }

  pttButton.classList.remove('transmitting');
  transmittingIndicator.classList.add('hidden');
  playRadioBeep(false);

  socket.emit('player:voice_state', { isMuted: true, isSpeaking: false });
}

// Eventos de Mouse / Touch en el botón Walkie-Talkie
pttButton.addEventListener('mousedown', (e) => {
  e.preventDefault();
  startTransmitting();
});
window.addEventListener('mouseup', () => stopTransmitting());

pttButton.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startTransmitting();
}, { passive: false });
window.addEventListener('touchend', () => stopTransmitting());

// Eventos de Teclado: Barra Espaciadora o Tecla 'V' (Push-to-Talk)
window.addEventListener('keydown', (e) => {
  if (document.activeElement?.tagName === 'INPUT' || 
      document.activeElement?.tagName === 'TEXTAREA' || 
      document.activeElement?.tagName === 'SELECT') {
    return;
  }

  // Espacio o V para Walkie-Talkie
  if ((e.code === 'Space' || e.code === 'KeyV') && !e.repeat) {
    e.preventDefault();
    startTransmitting();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'KeyV') {
    e.preventDefault();
    stopTransmitting();
  }
});

socket.on('webrtc:signal', async (data) => {
  const { sender, signal } = data;
  let pc = peerConnections[sender];
  if (!pc) pc = createPeerConnection(sender);

  if (signal.type === 'offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(signal));
    if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc:signal', { target: sender, signal: answer });
  } else if (signal.type === 'answer') {
    await pc.setRemoteDescription(new RTCSessionDescription(signal));
  } else if (signal.candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
  }
});

function createPeerConnection(targetId) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  peerConnections[targetId] = pc;

  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit('webrtc:signal', { target: targetId, signal: { candidate: e.candidate } });
  };

  pc.ontrack = (e) => {
    let audio = peerAudioElements[targetId];
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audioStreamsContainer.appendChild(audio);
      peerAudioElements[targetId] = audio;
    }
    audio.srcObject = e.streams[0];
    updateSpatialAudioVolumes();
  };
  return pc;
}

async function initiatePeerConnection(targetId, isCaller) {
  const pc = createPeerConnection(targetId);
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  if (isCaller) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc:signal', { target: targetId, signal: offer });
  }
}

function closePeerConnection(id) {
  if (peerConnections[id]) { peerConnections[id].close(); delete peerConnections[id]; }
  if (peerAudioElements[id]) { peerAudioElements[id].remove(); delete peerAudioElements[id]; }
}

function updateSpatialAudioVolumes() {
  if (!selfId || !players[selfId]) return;
  const me = players[selfId];
  const maxDistance = 18; // Radio auditivo espacial natural de oficina

  for (const id in peerAudioElements) {
    const target = players[id];
    const audio = peerAudioElements[id];
    if (!target || !audio) continue;

    // 1. Si están en llamada privada 1 a 1, volumen al 100% independiente de la distancia
    if (activeCallPartnerId === id) {
      audio.volume = 1.0;
      continue;
    }

    // 2. Aislamiento acústico de la Sala de Juntas (Privacidad acústica total)
    // El área de la sala de juntas está en z < -13 y |x| < 12
    const meInBoardroom = (me.z < -13 && Math.abs(me.x) < 12);
    const targetInBoardroom = ((target.z || 0) < -13 && Math.abs(target.x || 0) < 12);

    if (meInBoardroom !== targetInBoardroom) {
      // Las paredes de cristal acústico aíslan la conversación de quienes estén afuera
      audio.volume = 0;
      continue;
    }

    // 3. Audio por proximidad en espacio abierto (cercano y privado)
    const dist = Math.hypot(me.x - target.x, (me.z || 0) - (target.z || 0));
    if (dist > maxDistance) {
      audio.volume = 0;
    } else {
      audio.volume = Math.max(0, 1 - (dist / maxDistance));
    }
  }
}

// ----------------------------------------------------
// CHECKLIST, MODAL NPC CON CARA REAL & PROGRESO
// ----------------------------------------------------
function renderChecklist() {
  taskList.innerHTML = '';
  officeNpcs.forEach(npc => {
    const isDone = visitedNPCs.has(npc.id);
    const li = document.createElement('li');
    li.className = `task-item ${isDone ? 'completed' : ''}`;
    li.innerHTML = `
      <span class="check-box">${isDone ? '✅' : '⬜'}</span>
      <div>
        <strong>Habla con ${npc.name}</strong>
        <p>${npc.role} (${npc.department})</p>
      </div>
    `;
    taskList.appendChild(li);
  });
  updateProgress();
}

function updateProgress() {
  const total = officeNpcs.length;
  if (total === 0) return;
  const completed = visitedNPCs.size;
  const pct = Math.round((completed / total) * 100);
  progressPercent.textContent = `${pct}%`;
  progressBarFill.style.width = `${pct}%`;
}

function openNpcModal(npc) {
  npcNameTitle.textContent = npc.name;
  npcRoleSubtitle.textContent = npc.role;
  npcDeptBadge.textContent = npc.department;
  npcDialogueText.textContent = npc.info;
  npcAvatarImg.src = npc.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80';
  npcModal.classList.remove('hidden');

  // Guardar misión en memoria y persistir en el servidor
  visitedNPCs.add(npc.id);
  socket.emit('player:complete_task', npc.id);
  renderChecklist();
}

npcCloseBtn.addEventListener('click', () => npcModal.classList.add('hidden'));

// ----------------------------------------------------
// TABS DE LA BARRA LATERAL (CHAT, PRIVADO, INDUCCIÓN)
// ----------------------------------------------------
function switchTab(activeBtn, activeView) {
  const allTabs = [tabChatBtn, tabPrivateDmBtn, tabTasksBtn, tabAdminBtn, tabHRBtn].filter(Boolean);
  const allViews = [chatView, privateDmView, tasksView, adminView, hrView].filter(Boolean);

  allTabs.forEach(b => b.classList.remove('active'));
  allViews.forEach(v => v.classList.remove('active'));

  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.add('active');
}

if (tabChatBtn) tabChatBtn.addEventListener('click', () => switchTab(tabChatBtn, chatView));
if (tabPrivateDmBtn) tabPrivateDmBtn.addEventListener('click', () => switchTab(tabPrivateDmBtn, privateDmView));
if (tabTasksBtn) tabTasksBtn.addEventListener('click', () => switchTab(tabTasksBtn, tasksView));
if (tabHRBtn) tabHRBtn.addEventListener('click', () => {
  switchTab(tabHRBtn, hrView);
  loadEmployeeHRRequests();
});

// ----------------------------------------------------
// MÓDULO DE TALENTO HUMANO & TRÁMITES (VIDA REAL)
// ----------------------------------------------------
function openHRModal() {
  if (hrRequestModal) hrRequestModal.classList.remove('hidden');
}

if (openHRDeskBtn) openHRDeskBtn.addEventListener('click', openHRModal);
if (btnOpenNewRequestModal) btnOpenNewRequestModal.addEventListener('click', openHRModal);
if (closeHRRequestModalBtn) closeHRRequestModalBtn.addEventListener('click', () => {
  if (hrRequestModal) hrRequestModal.classList.add('hidden');
});

if (formHRRequest) {
  formHRRequest.addEventListener('submit', async (e) => {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem('induction_session') || '{}');
    if (!session.companyId || !session.email) {
      alert('Debes ingresar con tus credenciales de funcionario para radicar un trámite.');
      return;
    }

    const type = document.getElementById('hrReqType').value;
    const title = document.getElementById('hrReqTitle').value.trim();
    const startDate = document.getElementById('hrReqStartDate').value;
    const endDate = document.getElementById('hrReqEndDate').value;
    const reason = document.getElementById('hrReqReason').value.trim();

    try {
      const res = await fetch(`/api/companies/${session.companyId}/hr/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeEmail: session.email,
          type,
          title,
          reason,
          startDate,
          endDate
        })
      });

      const data = await res.json();
      if (data.success) {
        hrRequestModal.classList.add('hidden');
        formHRRequest.reset();
        alert(`🎉 ¡TRÁMITE RADICADO FORMALMENTE!\n\nNúmero Oficial: ${data.request.radicado}\nTipo: ${data.request.type}\nAsunto: ${data.request.title}\n\nHa sido remitido a la Dirección de Recursos Humanos. Recibirás respuesta oficial.`);
        loadEmployeeHRRequests();
        if (tabHRBtn && hrView) switchTab(tabHRBtn, hrView);
      } else {
        alert(data.error || 'Error al radicar solicitud');
      }
    } catch (err) {
      alert('Error de conexión al enviar el trámite');
    }
  });
}

async function loadEmployeeHRRequests() {
  const session = JSON.parse(localStorage.getItem('induction_session') || '{}');
  if (!session.companyId || !session.email) return;

  try {
    const res = await fetch(`/api/companies/${session.companyId}/hr/requests`);
    const allReqs = await res.json();
    if (!Array.isArray(allReqs)) return;

    const myReqs = allReqs.filter(r => (r.employee?.email || '').toLowerCase() === session.email.toLowerCase() || r.employeeId === session.email);
    if (myRequestsCountBadge) myRequestsCountBadge.textContent = myReqs.length;

    if (!employeeRequestsList) return;
    employeeRequestsList.innerHTML = '';

    if (myReqs.length === 0) {
      employeeRequestsList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px;">
          No has radicado trámites o permisos aún. Haz clic arriba en "+ Diligenciar Trámite".
        </div>
      `;
      return;
    }

    myReqs.forEach(r => {
      const card = document.createElement('div');
      card.style.background = 'rgba(255,255,255,0.04)';
      card.style.border = '1px solid var(--border)';
      card.style.borderRadius = '8px';
      card.style.padding = '10px';

      let statusBadge = '<span class="badge-status badge-pending">🟡 PENDIENTE</span>';
      if (r.status === 'APROBADO') statusBadge = '<span class="badge-status badge-approved">🟢 APROBADO</span>';
      else if (r.status === 'RECHAZADO') statusBadge = '<span class="badge-status badge-rejected">🔴 RECHAZADO</span>';

      const dateStr = new Date(r.createdAt).toLocaleDateString('es-CO');

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span class="radicado-tag" style="font-size: 11px;">${r.radicado}</span>
          <span style="font-size: 11px; color: var(--text-muted);">${dateStr}</span>
        </div>
        <div style="font-weight: 700; font-size: 13px; margin: 2px 0;">${r.title}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Tipo: ${r.type}</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${statusBadge}
        </div>
        ${r.adminNotes ? `
          <div style="background: rgba(0,0,0,0.25); border-left: 3px solid #60a5fa; padding: 6px 8px; margin-top: 8px; border-radius: 4px; font-size: 11px; color: #cbd5e1;">
            <strong>Dictamen RRHH:</strong> ${r.adminNotes}
          </div>
        ` : ''}
      `;
      employeeRequestsList.appendChild(card);
    });
  } catch (err) {
    console.error('Error cargando solicitudes del empleado:', err);
  }
}

// Notificaciones en tiempo real vía socket
socket.on('player:expelled', (data) => {
  gameContainer.classList.add('hidden');
  showTerminationNotice(data.reason, data.date);
});

socket.on('hr:request_resolved', (req) => {
  const session = JSON.parse(localStorage.getItem('induction_session') || '{}');
  if (session.email && (req.employee?.email || '').toLowerCase() === session.email.toLowerCase()) {
    alert(`📢 RESOLUCIÓN OFICIAL DE RRHH\n\nTu trámite ${req.radicado} (${req.title}) ha sido ${req.status}.\n\nDictamen oficial: ${req.adminNotes || 'Procesado formalmente.'}`);
    loadEmployeeHRRequests();
  }
});

if (tabAdminBtn) {
  tabAdminBtn.addEventListener('click', () => {
    switchTab(tabAdminBtn, adminView);
    populateAdminForm();
  });
}

function populateAdminForm() {
  if (!adminSelectNpc) return;
  adminSelectNpc.innerHTML = '';
  officeNpcs.forEach(npc => {
    const opt = document.createElement('option');
    opt.value = npc.id;
    opt.textContent = `${npc.name} (${npc.department})`;
    adminSelectNpc.appendChild(opt);
  });
  loadSelectedNpcData();
}

if (adminSelectNpc) adminSelectNpc.addEventListener('change', loadSelectedNpcData);

function loadSelectedNpcData() {
  if (!adminSelectNpc) return;
  const selected = officeNpcs.find(n => n.id === adminSelectNpc.value);
  if (selected) {
    if (adminNpcName) adminNpcName.value = selected.name;
    if (adminNpcDept) adminNpcDept.value = selected.department;
    if (adminNpcInfo) adminNpcInfo.value = selected.info;
  }
}

if (adminEditForm) {
  adminEditForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = adminSelectNpc ? adminSelectNpc.value : null;
    const name = adminNpcName ? adminNpcName.value.trim() : '';
    const department = adminNpcDept ? adminNpcDept.value.trim() : '';
    const info = adminNpcInfo ? adminNpcInfo.value.trim() : '';

    socket.emit('admin:update_npc', { id, name, department, info });
    alert('¡NPC y políticas actualizadas en la empresa!');
  });
}

// ----------------------------------------------------
// BUCLE DE FÍSICAS 3D Y ANIMACIÓN
// ----------------------------------------------------
let isAnimating = false;
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  updatePlayerPhysics(delta);

  // Animación idle suave de los NPCs
  npcMeshes.forEach(item => {
    if (item && item.npcModel && item.npcModel.userData) {
      if (item.npcModel.userData.char) {
        item.npcModel.userData.char.position.y = Math.sin(now * 0.003) * 0.02;
      }
      if (item.npcModel.userData.head) {
        item.npcModel.userData.head.rotation.y = Math.sin(now * 0.0015) * 0.18;
      }
    }
  });

  try {
    renderer.render(scene, camera);
  } catch (renderErr) {
    console.error('Render error:', renderErr);
  }
}

function updatePlayerPhysics(delta) {
  if (!selfId || !playerMeshes[selfId]) return;

  const playerMesh = playerMeshes[selfId];
  const speed = 12 * delta;
  let moveX = 0;
  let moveZ = 0;

  // 1. Controles de Teclado
  if (keysPressed.forward) moveZ -= speed;
  if (keysPressed.backward) moveZ += speed;
  if (keysPressed.left) moveX -= speed;
  if (keysPressed.right) moveX += speed;

  // 2. Controles de Joystick Táctil (Móvil)
  if (isJoystickActive && (touchMoveX !== 0 || touchMoveZ !== 0)) {
    moveX = touchMoveX * speed;
    moveZ = touchMoveZ * speed;
  }

  const isMoving = (moveX !== 0 || moveZ !== 0);

  // Animación de caminata / reposo
  if (playerMesh.userData) {
    if (isMoving) {
      playerMesh.userData.walkTime += delta * 14;
      const cycle = playerMesh.userData.walkTime;
      if (playerMesh.userData.leftLeg) playerMesh.userData.leftLeg.rotation.x = Math.sin(cycle) * 0.7;
      if (playerMesh.userData.rightLeg) playerMesh.userData.rightLeg.rotation.x = -Math.sin(cycle) * 0.7;
      if (playerMesh.userData.armL) playerMesh.userData.armL.rotation.x = -Math.sin(cycle) * 0.6;
      if (playerMesh.userData.armR) playerMesh.userData.armR.rotation.x = Math.sin(cycle) * 0.6;
      if (playerMesh.userData.char) playerMesh.userData.char.position.y = Math.abs(Math.sin(cycle)) * 0.08;
    } else {
      if (playerMesh.userData.leftLeg) playerMesh.userData.leftLeg.rotation.x *= 0.8;
      if (playerMesh.userData.rightLeg) playerMesh.userData.rightLeg.rotation.x *= 0.8;
      if (playerMesh.userData.armL) playerMesh.userData.armL.rotation.x *= 0.8;
      if (playerMesh.userData.armR) playerMesh.userData.armR.rotation.x *= 0.8;
      if (playerMesh.userData.char) {
        const now = performance.now();
        playerMesh.userData.char.position.y = Math.sin(now * 0.003) * 0.02;
      }
    }
  }

  if (isMoving) {
    if (moveX !== 0 && moveZ !== 0 && !isJoystickActive) {
      moveX *= 0.7071;
      moveZ *= 0.7071;
    }

    const nextX = Math.max(-33, Math.min(33, playerMesh.position.x + moveX));
    const nextZ = Math.max(-33, Math.min(33, playerMesh.position.z + moveZ));

    playerMesh.position.x = nextX;
    playerMesh.position.z = nextZ;

    const targetAngle = Math.atan2(moveX, moveZ);
    playerMesh.rotation.y = targetAngle;

    socket.emit('player:move', {
      x: nextX,
      y: 0,
      z: nextZ,
      rotationY: targetAngle,
      inMeetingRoom: (nextZ < -10 && Math.abs(nextX) < 12)
    });
  }

  // Cámara en tercera persona (ajuste dinámico móvil vs escritorio)
  const isMobile = window.innerWidth <= 768;
  const camOffsetY = isMobile ? 20 : 14;
  const camOffsetZ = isMobile ? 24 : 18;

  const camTargetX = playerMesh.position.x;
  const camTargetY = playerMesh.position.y + camOffsetY;
  const camTargetZ = playerMesh.position.z + camOffsetZ;

  camera.position.x += (camTargetX - camera.position.x) * 0.08;
  camera.position.y += (camTargetY - camera.position.y) * 0.08;
  camera.position.z += (camTargetZ - camera.position.z) * 0.08;
  camera.lookAt(playerMesh.position.x, 1.5, playerMesh.position.z);

  // Detección de cercanía a NPCs o a Compañeros Reales
  nearbyTarget = null;
  let nearbyPeer = null;

  // 1. Verificar NPCs
  for (const item of npcMeshes) {
    const dist = Math.hypot(playerMesh.position.x - item.npcData.x, playerMesh.position.z - item.npcData.z);
    if (dist < 6.5) {
      nearbyTarget = item.npcData;
      break;
    }
  }

  // 2. Si no hay NPC, verificar compañeros reales
  if (!nearbyTarget) {
    for (const pId in players) {
      if (pId !== selfId && playerMeshes[pId]) {
        const peerMesh = playerMeshes[pId];
        const dist = Math.hypot(playerMesh.position.x - peerMesh.position.x, playerMesh.position.z - peerMesh.position.z);
        if (dist < 5.5) {
          nearbyPeer = { id: pId, ...players[pId] };
          break;
        }
      }
    }
  }

  if (nearbyTarget) {
    promptTargetName.textContent = nearbyTarget.name;
    interactionPrompt.classList.remove('hidden');
    if (mobileInteractBtn) {
      mobileInteractBtn.textContent = '💬 Hablar';
      mobileInteractBtn.classList.remove('hidden');
      mobileInteractBtn.onclick = () => openNpcModal(nearbyTarget);
    }
  } else if (nearbyPeer) {
    promptTargetName.textContent = `${nearbyPeer.name} (Llamar / Chat Privado)`;
    interactionPrompt.classList.remove('hidden');
    if (mobileInteractBtn) {
      mobileInteractBtn.textContent = '👥 Opciones';
      mobileInteractBtn.classList.remove('hidden');
      mobileInteractBtn.onclick = () => openPeerActionModal(nearbyPeer.id);
    }
  } else {
    interactionPrompt.classList.add('hidden');
    if (mobileInteractBtn) mobileInteractBtn.classList.add('hidden');
  }

  // Tecla 'E' con compañero real
  window.currentNearbyPeer = nearbyPeer;

  // Alerta de Sala de Juntas
  if (playerMesh.position.z < -10 && Math.abs(playerMesh.position.x) < 12) {
    meetingAlert.classList.remove('hidden');
  } else {
    meetingAlert.classList.add('hidden');
  }
}

// ----------------------------------------------------
// INICIALIZACIÓN INMEDIATA DEL MOTOR 3D
// ----------------------------------------------------
handleResize();
if (!isAnimating) {
  isAnimating = true;
  animate();
}


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
camera.position.set(0, 18, 22);

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
// ENTORNO 3D DE LA OFICINA
// ----------------------------------------------------
const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(80, 40, 0x38bdf8, 0x334155);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x243454, roughness: 0.6 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.1 });

function createWall(x, z, width, depth, height = 5.5, isGlass = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), isGlass ? glassMat : wallMat);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = !isGlass;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Paredes exteriores
createWall(0, -35, 70, 1.5, 6);
createWall(0, 35, 70, 1.5, 6);
createWall(-35, 0, 1.5, 70, 6);
createWall(35, 0, 1.5, 70, 6);

// Sala de Juntas Ejecutiva (Norte)
createWall(-12, -22, 1, 24, 5, true);
createWall(12, -22, 1, 24, 5, true);
createWall(-7, -10, 9, 1, 5, true);
createWall(7, -10, 9, 1, 5, true);

const boardCarpet = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 22),
  new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.7 })
);
boardCarpet.rotation.x = -Math.PI / 2;
boardCarpet.position.set(0, 0.02, -22);
boardCarpet.receiveShadow = true;
scene.add(boardCarpet);

const boardTable = new THREE.Mesh(
  new THREE.CylinderGeometry(5.5, 5.5, 1.2, 32),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
);
boardTable.position.set(0, 1.2, -22);
boardTable.castShadow = true;
scene.add(boardTable);

// Divisiones de Oficinas
createWall(-20, 5, 28, 1, 4);
createWall(20, 5, 28, 1, 4);

// Plantas
function createOfficePlant(x, z) {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
  pot.position.y = 0.7;
  group.add(pot);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), leafMat);
    leaf.scale.set(1, 1.8, 0.6);
    leaf.position.set(Math.sin(i * 1.5) * 0.4, 2 + i * 0.3, Math.cos(i * 1.5) * 0.4);
    leaf.rotation.y = i * 0.8;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  scene.add(group);
}
createOfficePlant(-32, -32);
createOfficePlant(32, -32);
createOfficePlant(-32, 32);
createOfficePlant(32, 32);

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

    // Alfombra de color
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.015;
    carpet.receiveShadow = true;
    stationGroup.add(carpet);

    // Escritorio
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.6, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    desk.position.set(0, 0.8, 0);
    desk.castShadow = true;
    stationGroup.add(desk);

    // Laptop encendida
    const laptopBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    laptopBase.position.set(0, 1.64, 0);
    stationGroup.add(laptopBase);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 0.06),
      new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.6 })
    );
    screen.position.set(0, 2.1, -0.45);
    screen.rotation.x = -0.15;
    stationGroup.add(screen);

    // NPC Modelo
    const npcGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.8, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 })
    );
    body.position.y = 1.3;
    body.castShadow = true;
    npcGroup.add(body);

    // Retrato / Cara Real flotante del NPC (Sprite o Disco 3D con foto)
    if (npc.avatarUrl) {
      try {
        const faceTexture = textureLoader.load(npc.avatarUrl);
        const faceGeo = new THREE.CircleGeometry(0.7, 32);
        const faceMat = new THREE.MeshBasicMaterial({ 
          map: faceTexture, 
          side: THREE.DoubleSide 
        });
        const faceMesh = new THREE.Mesh(faceGeo, faceMat);
        faceMesh.position.set(0, 2.7, 0.1);
        npcGroup.add(faceMesh);
      } catch (err) {
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xffedd5 })
        );
        head.position.y = 2.6;
        npcGroup.add(head);
      }
    } else {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffedd5 })
      );
      head.position.y = 2.6;
      npcGroup.add(head);
    }

    npcGroup.position.set(0, 0, -1.8);
    stationGroup.add(npcGroup);

    stationGroup.position.set(x, 0, z);
    scene.add(stationGroup);

    npcMeshes.push({
      npcData: { ...npc, x, z, color },
      mesh: stationGroup,
      npcModel: npcGroup
    });
  });
}

// ----------------------------------------------------
// AVATARES DE JUGADORES 3D
// ----------------------------------------------------
const playerMeshes = {};

function createAvatarMesh(colorHex, isSelf = false) {
  const safeColor = (colorHex && typeof colorHex === 'string') ? colorHex : '#3b82f6';
  const group = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.8, 1.7, 16),
    new THREE.MeshStandardMaterial({ color: safeColor, roughness: 0.3 })
  );
  body.position.y = 1.3;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffe4e6 })
  );
  head.position.y = 2.5;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 })
  );
  visor.position.set(0, 2.55, 0.42);
  group.add(visor);

  if (isSelf) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);
  }

  return group;
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
  const width = canvasContainer.clientWidth || window.innerWidth;
  const height = canvasContainer.clientHeight || window.innerHeight;

  camera.aspect = width / height;
  // En móviles, ajustar el campo de visión (FOV) para no recortar la escena
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
  const color = document.querySelector('input[name="avatarColor"]:checked').value;

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
      color: color
    }));

    loginPlayer(company.id, emp.name, emp.email, emp.role || 'Funcionario', emp.department || 'General', color);
    loadEmployeeHRRequests();
  } catch (err) {
    alert('Error al autenticar funcionario con el servidor.');
  }
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

function loginPlayer(companyId, name, email, role, department, color) {
  socket.emit('player:join', { companyId, name, email, role, department, color });
  authModal.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  displayEmployeeName.textContent = `${name} • ${role} (${department || 'General'})`;
  handleResize();
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
        loginPlayer(data.companyId, data.name, data.email || '', data.role || 'Funcionario', data.department || 'General', data.color || '#3b82f6');
      }
    } catch (e) {
      console.warn('Error restaurando sesión');
    }
  }
}

initApp();
window.addEventListener('DOMContentLoaded', initApp);

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
    const mesh = createAvatarMesh(p.color || '#3b82f6', isMe);
    mesh.position.set(p.x || 0, 0, p.z || 0);
    scene.add(mesh);
    playerMeshes[id] = mesh;
  }

  handleResize();
  if (!isAnimating) {
    isAnimating = true;
    animate();
  }
});

socket.on('player:joined', (player) => {
  players[player.id] = player;
  updatePlayerCount();

  const mesh = createAvatarMesh(player.color || '#3b82f6', false);
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
      mesh.position.set(data.x, 0, data.z);
      if (data.rotationY !== undefined) mesh.rotation.y = data.rotationY;
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
  const maxDistance = 25;

  for (const id in peerAudioElements) {
    const target = players[id];
    const audio = peerAudioElements[id];
    if (!target || !audio) continue;

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
    item.npcModel.rotation.y = Math.sin(now * 0.002) * 0.12;
  });

  renderer.render(scene, camera);
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

  if (moveX !== 0 || moveZ !== 0) {
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


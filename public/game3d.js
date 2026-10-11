// Induction 3D - Three.js Corporate Engine & NPCs
const socket = io();

// Elementos DOM
const joinModal = document.getElementById('joinModal');
const joinForm = document.getElementById('joinForm');
const gameContainer = document.getElementById('gameContainer');
const canvasContainer = document.getElementById('canvas3dContainer');
const playerCountEl = document.getElementById('playerCount');
const interactionPrompt = document.getElementById('interactionPrompt');
const promptTargetName = document.getElementById('promptTargetName');
const meetingAlert = document.getElementById('meetingAlert');

const deskModal = document.getElementById('deskModal');
const deskTitle = document.getElementById('deskTitle');
const deskDeptBadge = document.getElementById('deskDeptBadge');
const deskInfo = document.getElementById('deskInfo');
const deskCloseBtn = document.getElementById('deskCloseBtn');

const tabChatBtn = document.getElementById('tabChatBtn');
const tabTasksBtn = document.getElementById('tabTasksBtn');
const tabAdminBtn = document.getElementById('tabAdminBtn');
const chatView = document.getElementById('chatView');
const tasksView = document.getElementById('tasksView');
const adminView = document.getElementById('adminView');

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');

const taskList = document.getElementById('taskList');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');

const adminSelectDesk = document.getElementById('adminSelectDesk');
const adminDeskTitle = document.getElementById('adminDeskTitle');
const adminDeskDept = document.getElementById('adminDeskDept');
const adminDeskInfo = document.getElementById('adminDeskInfo');
const adminEditForm = document.getElementById('adminEditForm');

const toggleMicBtn = document.getElementById('toggleMicBtn');
const micIcon = document.getElementById('micIcon');
const micText = document.getElementById('micText');
const audioStreamsContainer = document.getElementById('audioStreamsContainer');

// Estado
let selfId = null;
let players = {};
let officeDesks = [];
let nearbyTarget = null;
const visitedDesks = new Set();

// WebRTC State
let localStream = null;
let isMuted = true;
const peerConnections = {};
const peerAudioElements = {};

// Teclado WASD y Flechas con redundancia total de teclas
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
scene.background = new THREE.Color(0x0a0f1d);
scene.fog = new THREE.Fog(0x0a0f1d, 35, 90);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 18, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(800, 600);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasContainer.appendChild(renderer.domElement);

// Luces
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -40;
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
scene.add(dirLight);

// Luz de acento en sala de juntas
const boardPointLight = new THREE.PointLight(0xec4899, 1.5, 25);
boardPointLight.position.set(0, 8, -20);
scene.add(boardPointLight);

// ----------------------------------------------------
// CONSTRUCCIÓN DEL MUNDO 3D (Oficinas, Paredes y Suelos)
// ----------------------------------------------------

// Suelo Principal
const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Cuadrícula decorativa sobre el suelo
const gridHelper = new THREE.GridHelper(80, 40, 0x334155, 0x1e293b);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// Materiales de Paredes y Vidrio
const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
const glassMat = new THREE.MeshStandardMaterial({ 
  color: 0x38bdf8, 
  transparent: true, 
  opacity: 0.35, 
  roughness: 0.1 
});

function createWall(x, z, width, depth, height = 5, isGlass = false) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, isGlass ? glassMat : wallMat);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = !isGlass;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Paredes Perimetrales de la Empresa
createWall(0, -35, 70, 1.5, 6); // Pared Norte
createWall(0, 35, 70, 1.5, 6);  // Pared Sur
createWall(-35, 0, 1.5, 70, 6); // Pared Oeste
createWall(35, 0, 1.5, 70, 6);  // Pared Este

// Sala de Juntas Ejecutiva (Norte Central)
createWall(-12, -22, 1, 24, 5, true); // Vidrio oeste
createWall(12, -22, 1, 24, 5, true);  // Vidrio este
createWall(-7, -10, 9, 1, 5, true);   // Vidrio sur izq
createWall(7, -10, 9, 1, 5, true);    // Vidrio sur der (puerta en el centro)

// Alfombra de la Sala de Juntas
const boardCarpetGeo = new THREE.PlaneGeometry(22, 22);
const boardCarpetMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.7 });
const boardCarpet = new THREE.Mesh(boardCarpetGeo, boardCarpetMat);
boardCarpet.rotation.x = -Math.PI / 2;
boardCarpet.position.set(0, 0.02, -22);
boardCarpet.receiveShadow = true;
scene.add(boardCarpet);

// Mesa Ejecutiva Ovalada
const tableGeo = new THREE.CylinderGeometry(5.5, 5.5, 1.2, 32);
const tableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
const boardTable = new THREE.Mesh(tableGeo, tableMat);
boardTable.position.set(0, 1.2, -22);
boardTable.castShadow = true;
boardTable.receiveShadow = true;
scene.add(boardTable);

// Divisiones de Oficinas (Paredes interiores)
createWall(-20, 5, 28, 1, 4); // División Oficina RRHH / Dev
createWall(20, 5, 28, 1, 4);  // División Oficina TI / Cafetería

// Decoraciones 3D: Plantas Corporativas
function createOfficePlant(x, z) {
  const group = new THREE.Group();
  // Maceta
  const potGeo = new THREE.CylinderGeometry(0.8, 0.6, 1.4, 16);
  const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 0.7;
  pot.castShadow = true;
  group.add(pot);

  // Hojas
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const leafGeo = new THREE.SphereGeometry(0.9, 8, 8);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.scale.set(1, 1.8, 0.6);
    leaf.position.set(Math.sin(i * 1.5) * 0.4, 2 + i * 0.3, Math.cos(i * 1.5) * 0.4);
    leaf.rotation.y = i * 0.8;
    leaf.castShadow = true;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  scene.add(group);
}

createOfficePlant(-32, -32);
createOfficePlant(32, -32);
createOfficePlant(-32, 32);
createOfficePlant(32, 32);
createOfficePlant(-14, -8);
createOfficePlant(14, -8);

// ----------------------------------------------------
// NPCS & ESTACIONES CORPORATIVAS 3D
// ----------------------------------------------------
const npcs = [
  {
    id: 'desk-rrhh',
    name: 'Sofía Valenzuela',
    role: 'Líder de Recursos Humanos (RRHH)',
    department: 'Talento & Cultura',
    x: -20,
    z: -12,
    color: 0x8b5cf6,
    icon: '🤝',
    info: '¡Hola! Qué gusto tenerte en el equipo. Yo gestiono tus vacaciones, seguro médico corporativo y bienestar. Te dejé una copia del manual de convivencia en tu correo institucional.'
  },
  {
    id: 'desk-it',
    name: 'Alex Rivera',
    role: 'Especialista en Ciberseguridad TI',
    department: 'Tecnología & Soporte',
    x: 20,
    z: -12,
    color: 0x06b6d4,
    icon: '🛡️',
    info: '¡Bienvenido! Regla #1 en la empresa: Todo dispositivo debe tener 2FA activo en 1Password y Google Suite. Nunca compartas credenciales ni entres a la VPN en redes Wi-Fi públicas sin cifrado.'
  },
  {
    id: 'desk-dev',
    name: 'Carlos Mendoza',
    role: 'Principal Tech Lead',
    department: 'Ingeniería de Software',
    x: -20,
    z: 18,
    color: 0x3b82f6,
    icon: '💻',
    info: '¡Qué bueno verte por aquí! Trabajamos con Sprints de 2 semanas. Tenemos Daily Standup a las 9:30 AM en la Sala de Juntas. Revisa nuestro repositorio para desplegar tu entorno local.'
  },
  {
    id: 'desk-cafe',
    name: 'Valeria Gómez',
    role: 'Head of People & Social',
    department: 'Cafetería & Zona Lounge',
    x: 20,
    z: 18,
    color: 0xf59e0b,
    icon: '☕',
    info: '¡Tómate un café o té! Este es nuestro espacio para descansar, recargar energía y charlar sin hablar de trabajo. Los viernes a las 4:30 PM jugamos partidas online todos juntos.'
  }
];

// Generar escritorios, laptops y modelos de NPCs en 3D
const npcMeshes = [];

npcs.forEach(npc => {
  const stationGroup = new THREE.Group();

  // Alfombra
  const carpetGeo = new THREE.PlaneGeometry(10, 8);
  const carpetMat = new THREE.MeshStandardMaterial({ color: npc.color, roughness: 0.8 });
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.015;
  carpet.receiveShadow = true;
  stationGroup.add(carpet);

  // Escritorio 3D
  const deskGeo = new THREE.BoxGeometry(6, 1.6, 2.8);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.set(0, 0.8, 0);
  desk.castShadow = true;
  desk.receiveShadow = true;
  stationGroup.add(desk);

  // Laptop 3D con pantalla encendida
  const laptopBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.08, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x0f172a })
  );
  laptopBase.position.set(0, 1.64, 0);
  laptopBase.castShadow = true;
  stationGroup.add(laptopBase);

  const screenGeo = new THREE.BoxGeometry(1.4, 0.9, 0.06);
  const screenMat = new THREE.MeshStandardMaterial({ 
    color: npc.color, 
    emissive: npc.color, 
    emissiveIntensity: 0.6 
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 2.1, -0.45);
  screen.rotation.x = -0.15;
  stationGroup.add(screen);

  // Modelo del NPC (Cuerpo 3D estilizado)
  const npcGroup = new THREE.Group();
  
  // Cuerpo
  const bodyGeo = new THREE.CylinderGeometry(0.65, 0.8, 1.8, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: npc.color, roughness: 0.4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.3;
  body.castShadow = true;
  npcGroup.add(body);

  // Cabeza
  const headGeo = new THREE.SphereGeometry(0.6, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffedd5 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.6;
  head.castShadow = true;
  npcGroup.add(head);

  // Cabello / Peinado estilizado
  const hairGeo = new THREE.SphereGeometry(0.63, 16, 16);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 2.8, -0.1);
  hair.scale.set(1, 0.8, 1);
  npcGroup.add(hair);

  npcGroup.position.set(0, 0, -1.8); // Sentado detrás del escritorio
  stationGroup.add(npcGroup);

  stationGroup.position.set(npc.x, 0, npc.z);
  scene.add(stationGroup);

  npcMeshes.push({
    npcData: npc,
    mesh: stationGroup,
    npcModel: npcGroup
  });
});

officeDesks = npcs;

// ----------------------------------------------------
// AVATARES 3D (Jugador Local y Multijugador)
// ----------------------------------------------------
const playerMeshes = {}; // socketId -> THREE.Group

function createAvatarMesh(colorHex, isSelf = false) {
  const group = new THREE.Group();

  // Sombra falsa suave en suelo
  const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const shadowMat = new THREE.MeshBasicMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0.35 
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // Cuerpo Cápsula / Cilindro
  const bodyGeo = new THREE.CylinderGeometry(0.65, 0.8, 1.7, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: colorHex, 
    roughness: 0.3,
    metalness: 0.1
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.3;
  body.castShadow = true;
  group.add(body);

  // Cabeza
  const headGeo = new THREE.SphereGeometry(0.58, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4e6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.5;
  head.castShadow = true;
  group.add(head);

  // Visor / Ojos
  const visorGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);
  const visorMat = new THREE.MeshStandardMaterial({ 
    color: 0x0f172a, 
    roughness: 0.2 
  });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 2.55, 0.42);
  group.add(visor);

  // Aro de luz en el suelo si es el jugador local
  if (isSelf) {
    const ringGeo = new THREE.RingGeometry(1.1, 1.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);
  }

  return group;
}

// ----------------------------------------------------
// CONTROLES WASD Y FLECHAS (INFALIBLES)
// ----------------------------------------------------
window.addEventListener('keydown', (e) => {
  // Ignorar movimiento si el usuario está escribiendo en el chat o en el formulario admin
  if (document.activeElement === chatInput || 
      document.activeElement === adminDeskInfo || 
      document.activeElement === adminDeskTitle) {
    return;
  }

  const code = e.code;
  const key = e.key.toLowerCase();

  // W / Flecha Arriba
  if (code === 'KeyW' || key === 'w' || code === 'ArrowUp' || key === 'arrowup') {
    keysPressed.forward = true;
  }
  // S / Flecha Abajo
  if (code === 'KeyS' || key === 's' || code === 'ArrowDown' || key === 'arrowdown') {
    keysPressed.backward = true;
  }
  // A / Flecha Izquierda
  if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft' || key === 'arrowleft') {
    keysPressed.left = true;
  }
  // D / Flecha Derecha
  if (code === 'KeyD' || key === 'd' || code === 'ArrowRight' || key === 'arrowright') {
    keysPressed.right = true;
  }

  // Tecla 'E' para interactuar
  if ((code === 'KeyE' || key === 'e') && nearbyTarget && deskModal.classList.contains('hidden')) {
    openDeskModal(nearbyTarget);
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  const key = e.key.toLowerCase();

  if (code === 'KeyW' || key === 'w' || code === 'ArrowUp' || key === 'arrowup') {
    keysPressed.forward = false;
  }
  if (code === 'KeyS' || key === 's' || code === 'ArrowDown' || key === 'arrowdown') {
    keysPressed.backward = false;
  }
  if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft' || key === 'arrowleft') {
    keysPressed.left = false;
  }
  if (code === 'KeyD' || key === 'd' || code === 'ArrowRight' || key === 'arrowright') {
    keysPressed.right = false;
  }
});

// Redimensionar Canvas 3D
function handleResize() {
  const width = canvasContainer.clientWidth || 800;
  const height = canvasContainer.clientHeight || 600;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
window.addEventListener('resize', handleResize);

// ----------------------------------------------------
// UI TABS & LOGIN
// ----------------------------------------------------
function switchTab(activeBtn, activeView) {
  [tabChatBtn, tabTasksBtn, tabAdminBtn].forEach(b => b.classList.remove('active'));
  [chatView, tasksView, adminView].forEach(v => v.classList.remove('active'));
  activeBtn.classList.add('active');
  activeView.classList.add('active');
}

tabChatBtn.addEventListener('click', () => switchTab(tabChatBtn, chatView));
tabTasksBtn.addEventListener('click', () => switchTab(tabTasksBtn, tasksView));
tabAdminBtn.addEventListener('click', () => {
  switchTab(tabAdminBtn, adminView);
  populateAdminForm();
});

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const role = document.getElementById('playerRole').value;
  const color = document.querySelector('input[name="avatarColor"]:checked').value;

  socket.emit('player:join', { name, role, color });
  joinModal.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  handleResize();
});

// ----------------------------------------------------
// SOCKET.IO EVENTOS
// ----------------------------------------------------
socket.on('office:init', (data) => {
  selfId = data.selfId;
  players = data.players;
  updatePlayerCount();
  renderChecklist();
  populateAdminForm();

  // Crear avatares 3D existentes
  for (const id in players) {
    const p = players[id];
    const isMe = id === selfId;
    const mesh = createAvatarMesh(p.color || '#3b82f6', isMe);
    mesh.position.set(p.x || 0, 0, p.z || 0);
    scene.add(mesh);
    playerMeshes[id] = mesh;
  }

  animate();
});

socket.on('player:joined', (player) => {
  players[player.id] = player;
  updatePlayerCount();

  const mesh = createAvatarMesh(player.color || '#3b82f6', false);
  mesh.position.set(player.x || 0, 0, player.z || 0);
  scene.add(mesh);
  playerMeshes[player.id] = mesh;

  addChatMessage({
    senderName: '🏢 Recepción 3D',
    text: `${player.name} (${player.role}) ingresó a la oficina.`,
    isSystem: true
  });

  if (localStream) {
    initiatePeerConnection(player.id, true);
  }
});

socket.on('player:moved', (data) => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].z = data.z;
    players[data.id].facing = data.facing;
    players[data.id].inMeetingRoom = data.inMeetingRoom;

    const mesh = playerMeshes[data.id];
    if (mesh) {
      mesh.position.set(data.x, 0, data.z);
      if (data.rotationY !== undefined) mesh.rotation.y = data.rotationY;
    }
    updateSpatialAudioVolumes();
  }
});

socket.on('player:left', (id) => {
  if (players[id]) {
    addChatMessage({
      senderName: '🏢 Recepción 3D',
      text: `${players[id].name} salió de la oficina.`,
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

socket.on('office:desks_updated', (desks) => {
  officeDesks = desks;
  renderChecklist();
  populateAdminForm();
});

// Chat
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text) {
    socket.emit('player:message', { text });
    chatInput.value = '';
  }
});

socket.on('chat:broadcast', (msg) => {
  let isNear = false;
  const me = players[selfId];

  if (me) {
    const dist = Math.hypot(me.x - msg.x, (me.z || 0) - (msg.z || 0));
    if (dist < 22) isNear = true;
  }

  addChatMessage({ ...msg, isNear, isMeeting: msg.inMeetingRoom });
});

function addChatMessage(msg) {
  const el = document.createElement('div');
  el.className = `chat-msg ${msg.isNear ? 'near' : ''} ${msg.isMeeting ? 'meeting' : ''}`;
  
  if (msg.isSystem) {
    el.innerHTML = `<small style="color: #94a3b8">${msg.text}</small>`;
  } else {
    el.innerHTML = `
      <div class="chat-msg-header">
        <strong>${escapeHtml(msg.senderName)}</strong>
        <span>${msg.timestamp || ''} ${msg.isMeeting ? '🔒 (Junta)' : (msg.isNear ? '• (Cerca)' : '')}</span>
      </div>
      <div>${escapeHtml(msg.text)}</div>
    `;
  }

  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updatePlayerCount() {
  playerCountEl.textContent = Object.keys(players).length;
}

// ----------------------------------------------------
// AUDIO ESPACIAL WEBRTC
// ----------------------------------------------------
toggleMicBtn.addEventListener('click', async () => {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      isMuted = false;
      toggleMicBtn.classList.add('active');
      micIcon.textContent = '🔊';
      micText.textContent = 'Micrófono Activo';

      for (const id in players) {
        if (id !== selfId) initiatePeerConnection(id, true);
      }
    } catch (err) {
      alert('Por favor autoriza el permiso de micrófono en tu navegador.');
      console.error(err);
    }
  } else {
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    toggleMicBtn.classList.toggle('active', !isMuted);
    micIcon.textContent = isMuted ? '🎤' : '🔊';
    micText.textContent = isMuted ? 'Voz Silenciada' : 'Micrófono Activo';
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
  const maxDistance = 25; // Distancia 3D

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
// CHECKLIST & MODAL NPC
// ----------------------------------------------------
function renderChecklist() {
  taskList.innerHTML = '';
  officeDesks.forEach(desk => {
    const isDone = visitedDesks.has(desk.id);
    const li = document.createElement('li');
    li.className = `task-item ${isDone ? 'completed' : ''}`;
    li.innerHTML = `
      <span class="check-box">${isDone ? '✅' : '⬜'}</span>
      <div>
        <strong>${desk.icon || '📌'} Habla con ${desk.name || desk.title}</strong>
        <p>${desk.role || desk.department}</p>
      </div>
    `;
    taskList.appendChild(li);
  });
  updateProgress();
}

function updateProgress() {
  const total = officeDesks.length;
  if (total === 0) return;
  const completed = visitedDesks.size;
  const pct = Math.round((completed / total) * 100);
  progressPercent.textContent = `${pct}%`;
  progressBarFill.style.width = `${pct}%`;
}

function openDeskModal(desk) {
  deskTitle.textContent = `${desk.icon || '👤'} ${desk.name || desk.title} (${desk.role || desk.department})`;
  deskDeptBadge.textContent = desk.department;
  deskInfo.textContent = desk.info;
  deskModal.classList.remove('hidden');

  visitedDesks.add(desk.id);
  renderChecklist();
}

deskCloseBtn.addEventListener('click', () => deskModal.classList.add('hidden'));

// Admin Form
function populateAdminForm() {
  adminSelectDesk.innerHTML = '';
  officeDesks.forEach(desk => {
    const opt = document.createElement('option');
    opt.value = desk.id;
    opt.textContent = `${desk.icon || '👤'} ${desk.name || desk.title}`;
    adminSelectDesk.appendChild(opt);
  });
  loadSelectedDeskData();
}

adminSelectDesk.addEventListener('change', loadSelectedDeskData);

function loadSelectedDeskData() {
  const selected = officeDesks.find(d => d.id === adminSelectDesk.value);
  if (selected) {
    adminDeskTitle.value = selected.name || selected.title;
    adminDeskDept.value = selected.department;
    adminDeskInfo.value = selected.info;
  }
}

adminEditForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = adminSelectDesk.value;
  const name = adminDeskTitle.value.trim();
  const department = adminDeskDept.value.trim();
  const info = adminDeskInfo.value.trim();

  socket.emit('admin:update_desk', { id, name, title: name, department, info });
  alert('¡NPC y Estación actualizada! Todos los usuarios verán los cambios en tiempo real.');
});

// ----------------------------------------------------
// BUCLE PRINCIPAL DE ANIMACIÓN Y FÍSICAS 3D
// ----------------------------------------------------
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  updatePlayerPhysics(delta);

  // Animación idle suave de los NPCs
  npcMeshes.forEach(item => {
    item.npcModel.rotation.y = Math.sin(now * 0.002) * 0.15;
  });

  renderer.render(scene, camera);
}

function updatePlayerPhysics(delta) {
  if (!selfId || !playerMeshes[selfId]) return;

  const playerMesh = playerMeshes[selfId];
  const speed = 12 * delta;
  let moveX = 0;
  let moveZ = 0;

  if (keysPressed.forward) moveZ -= speed;
  if (keysPressed.backward) moveZ += speed;
  if (keysPressed.left) moveX -= speed;
  if (keysPressed.right) moveX += speed;

  if (moveX !== 0 || moveZ !== 0) {
    // Normalizar si se mueve en diagonal
    if (moveX !== 0 && moveZ !== 0) {
      moveX *= 0.7071;
      moveZ *= 0.7071;
    }

    const nextX = Math.max(-33, Math.min(33, playerMesh.position.x + moveX));
    const nextZ = Math.max(-33, Math.min(33, playerMesh.position.z + moveZ));

    playerMesh.position.x = nextX;
    playerMesh.position.z = nextZ;

    // Rotar avatar hacia la dirección que camina
    const targetAngle = Math.atan2(moveX, moveZ);
    playerMesh.rotation.y = targetAngle;

    // Enviar posición al servidor
    socket.emit('player:move', {
      x: nextX,
      y: 0,
      z: nextZ,
      rotationY: targetAngle,
      inMeetingRoom: (nextZ < -10 && Math.abs(nextX) < 12)
    });
  }

  // Cámara en tercera persona con seguimiento suave
  const camTargetX = playerMesh.position.x;
  const camTargetY = playerMesh.position.y + 14;
  const camTargetZ = playerMesh.position.z + 18;

  camera.position.x += (camTargetX - camera.position.x) * 0.08;
  camera.position.y += (camTargetY - camera.position.y) * 0.08;
  camera.position.z += (camTargetZ - camera.position.z) * 0.08;
  camera.lookAt(playerMesh.position.x, 1.5, playerMesh.position.z);

  // Detectar cercanía con NPCs
  nearbyTarget = null;
  for (const item of npcMeshes) {
    const dist = Math.hypot(playerMesh.position.x - item.npcData.x, playerMesh.position.z - item.npcData.z);
    if (dist < 6.5) {
      nearbyTarget = item.npcData;
      break;
    }
  }

  if (nearbyTarget) {
    promptTargetName.textContent = nearbyTarget.name || nearbyTarget.title;
    interactionPrompt.classList.remove('hidden');
  } else {
    interactionPrompt.classList.add('hidden');
  }

  // Alerta de Sala de Juntas
  if (playerMesh.position.z < -10 && Math.abs(playerMesh.position.x) < 12) {
    meetingAlert.classList.remove('hidden');
  } else {
    meetingAlert.classList.add('hidden');
  }
}

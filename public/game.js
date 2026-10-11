// Induction Enterprise - Core Client
const socket = io();

// Elementos del DOM
const joinModal = document.getElementById('joinModal');
const joinForm = document.getElementById('joinForm');
const gameContainer = document.getElementById('gameContainer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerCountEl = document.getElementById('playerCount');
const interactionPrompt = document.getElementById('interactionPrompt');
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
let meetingRoom = null;
let nearbyDesk = null;
const visitedDesks = new Set();
const floatingMessages = [];

// Audio & WebRTC State
let localStream = null;
let isMuted = true;
const peerConnections = {}; // targetSocketId -> RTCPeerConnection
const peerAudioElements = {}; // targetSocketId -> HTMLAudioElement

// Teclas
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

// Tabs
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

// Login
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const role = document.getElementById('playerRole').value;
  const color = document.querySelector('input[name="avatarColor"]:checked').value;

  socket.emit('player:join', { name, role, color });
  joinModal.classList.add('hidden');
  gameContainer.classList.remove('hidden');
});

// Sockets
socket.on('office:init', (data) => {
  selfId = data.selfId;
  players = data.players;
  officeDesks = data.desks;
  meetingRoom = data.meetingRoom;
  updatePlayerCount();
  renderChecklist();
  populateAdminForm();
  requestAnimationFrame(gameLoop);
});

socket.on('player:joined', (player) => {
  players[player.id] = player;
  updatePlayerCount();
  addChatMessage({
    senderName: '🏢 Sistema',
    text: `${player.name} (${player.role}) se unió a la oficina.`,
    isSystem: true
  });
  // Si tenemos micrófono activo, iniciar llamada WebRTC con el nuevo integrante
  if (localStream) {
    initiatePeerConnection(player.id, true);
  }
});

socket.on('player:moved', (data) => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].y = data.y;
    players[data.id].facing = data.facing;
    players[data.id].inMeetingRoom = data.inMeetingRoom;
    updateSpatialAudioVolumes();
  }
});

socket.on('player:voice_updated', (data) => {
  if (players[data.id]) {
    players[data.id].isMuted = data.isMuted;
    players[data.id].isSpeaking = data.isSpeaking;
  }
});

socket.on('player:left', (id) => {
  if (players[id]) {
    addChatMessage({
      senderName: '🏢 Sistema',
      text: `${players[id].name} se retiró de la oficina.`,
      isSystem: true
    });
    delete players[id];
    closePeerConnection(id);
    updatePlayerCount();
  }
});

socket.on('office:desks_updated', (desks) => {
  officeDesks = desks;
  renderChecklist();
  populateAdminForm();
  addChatMessage({
    senderName: '📢 RRHH',
    text: 'Se han actualizado las políticas y contenidos de una estación.',
    isSystem: true
  });
});

socket.on('chat:broadcast', (msg) => {
  let isNear = false;
  const me = players[selfId];

  // Aislamiento de Sala de Juntas
  if (me) {
    if (me.inMeetingRoom && !msg.inMeetingRoom) return; // Si estoy en junta, no me distraen de afuera
    if (!me.inMeetingRoom && msg.inMeetingRoom) return; // Si están en junta, no se escucha afuera
    
    const dist = Math.hypot(me.x - msg.x, me.y - msg.y);
    if (dist < 180) isNear = true;
  }

  addChatMessage({ ...msg, isNear, isMeeting: msg.inMeetingRoom });

  floatingMessages.push({
    senderId: msg.senderId,
    text: msg.text,
    timer: 240
  });
});

// Control de Micrófono / WebRTC
toggleMicBtn.addEventListener('click', async () => {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      isMuted = false;
      toggleMicBtn.classList.add('active');
      micIcon.textContent = '🔊';
      micText.textContent = 'Micrófono Activo';
      socket.emit('player:voice_state', { isMuted: false, isSpeaking: true });

      // Iniciar conexiones con todos los compañeros
      for (const id in players) {
        if (id !== selfId) {
          initiatePeerConnection(id, true);
        }
      }
    } catch (err) {
      alert('Por favor autoriza el permiso de micrófono en tu navegador para hablar por audio espacial.');
      console.error(err);
    }
  } else {
    // Alternar silencio
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);

    if (isMuted) {
      toggleMicBtn.classList.remove('active');
      micIcon.textContent = '🎤';
      micText.textContent = 'Voz Silenciada';
      socket.emit('player:voice_state', { isMuted: true, isSpeaking: false });
    } else {
      toggleMicBtn.classList.add('active');
      micIcon.textContent = '🔊';
      micText.textContent = 'Micrófono Activo';
      socket.emit('player:voice_state', { isMuted: false, isSpeaking: true });
    }
  }
});

// Señalización WebRTC
socket.on('webrtc:signal', async (data) => {
  const { sender, signal } = data;
  let pc = peerConnections[sender];

  if (!pc) {
    pc = createPeerConnection(sender);
  }

  if (signal.type === 'offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(signal));
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }
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
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  peerConnections[targetId] = pc;

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('webrtc:signal', { target: targetId, signal: { candidate: e.candidate } });
    }
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
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }
  if (isCaller) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc:signal', { target: targetId, signal: offer });
  }
}

function closePeerConnection(id) {
  if (peerConnections[id]) {
    peerConnections[id].close();
    delete peerConnections[id];
  }
  if (peerAudioElements[id]) {
    peerAudioElements[id].remove();
    delete peerAudioElements[id];
  }
}

// Cálculo de audio espacial según distancia euclidiana
function updateSpatialAudioVolumes() {
  if (!selfId || !players[selfId]) return;
  const me = players[selfId];
  const maxDistance = 180;

  for (const id in peerAudioElements) {
    const target = players[id];
    const audio = peerAudioElements[id];
    if (!target || !audio) continue;

    // Aislamiento de Sala de Juntas
    if (me.inMeetingRoom !== target.inMeetingRoom) {
      audio.volume = 0;
      continue;
    }

    const dist = Math.hypot(me.x - target.x, me.y - target.y);
    if (dist > maxDistance) {
      audio.volume = 0;
    } else {
      const vol = Math.max(0, 1 - (dist / maxDistance));
      audio.volume = vol;
    }
  }
}

// Checklist y Progreso de Inducción
function renderChecklist() {
  taskList.innerHTML = '';
  officeDesks.forEach(desk => {
    const isDone = visitedDesks.has(desk.id);
    const li = document.createElement('li');
    li.className = `task-item ${isDone ? 'completed' : ''}`;
    li.dataset.desk = desk.id;
    li.innerHTML = `
      <span class="check-box">${isDone ? '✅' : '⬜'}</span>
      <div>
        <strong>${desk.icon || '📌'} ${desk.title}</strong>
        <p>${desk.department} • Pulsa [E] al acercarte.</p>
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

// Admin Form
function populateAdminForm() {
  adminSelectDesk.innerHTML = '';
  officeDesks.forEach(desk => {
    const opt = document.createElement('option');
    opt.value = desk.id;
    opt.textContent = `${desk.icon || '📌'} ${desk.title}`;
    adminSelectDesk.appendChild(opt);
  });
  loadSelectedDeskData();
}

adminSelectDesk.addEventListener('change', loadSelectedDeskData);

function loadSelectedDeskData() {
  const selected = officeDesks.find(d => d.id === adminSelectDesk.value);
  if (selected) {
    adminDeskTitle.value = selected.title;
    adminDeskDept.value = selected.department;
    adminDeskInfo.value = selected.info;
  }
}

adminEditForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = adminSelectDesk.value;
  const title = adminDeskTitle.value.trim();
  const department = adminDeskDept.value.trim();
  const info = adminDeskInfo.value.trim();

  socket.emit('admin:update_desk', { id, title, department, info });
  alert('¡Estación actualizada con éxito! Todos los empleados verán el nuevo contenido al instante.');
});

// Teclado
window.addEventListener('keydown', (e) => {
  if (document.activeElement === chatInput || document.activeElement === adminDeskInfo || document.activeElement === adminDeskTitle) return;
  if (e.key in keys) keys[e.key] = true;

  if ((e.key === 'e' || e.key === 'E') && nearbyDesk && deskModal.classList.contains('hidden')) {
    openDeskModal(nearbyDesk);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) keys[e.key] = false;
});

function openDeskModal(desk) {
  deskTitle.textContent = `${desk.icon || '📌'} ${desk.title}`;
  deskDeptBadge.textContent = desk.department;
  deskInfo.textContent = desk.info;
  deskModal.classList.remove('hidden');

  visitedDesks.add(desk.id);
  renderChecklist();
}

deskCloseBtn.addEventListener('click', () => {
  deskModal.classList.add('hidden');
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

// Game Loop
function gameLoop() {
  updateMovement();
  drawScene();
  requestAnimationFrame(gameLoop);
}

function updateMovement() {
  if (!selfId || !players[selfId]) return;
  const me = players[selfId];
  const speed = 3.6;
  let moved = false;
  let newX = me.x;
  let newY = me.y;

  if (keys.w || keys.ArrowUp) { newY -= speed; me.facing = 'up'; moved = true; }
  if (keys.s || keys.ArrowDown) { newY += speed; me.facing = 'down'; moved = true; }
  if (keys.a || keys.ArrowLeft) { newX -= speed; me.facing = 'left'; moved = true; }
  if (keys.d || keys.ArrowRight) { newX += speed; me.facing = 'right'; moved = true; }

  // Límites
  newX = Math.max(30, Math.min(canvas.width - 30, newX));
  newY = Math.max(30, Math.min(canvas.height - 30, newY));

  // Verificar si entró a la Sala de Juntas
  const inMeeting = meetingRoom && (
    newX >= meetingRoom.x && newX <= meetingRoom.x + meetingRoom.width &&
    newY >= meetingRoom.y && newY <= meetingRoom.y + meetingRoom.height
  );

  if (inMeeting !== me.inMeetingRoom) {
    me.inMeetingRoom = inMeeting;
    moved = true;
    if (inMeeting) {
      meetingAlert.classList.remove('hidden');
    } else {
      meetingAlert.classList.add('hidden');
    }
  }

  if (moved) {
    me.x = newX;
    me.y = newY;
    socket.emit('player:move', { x: me.x, y: me.y, facing: me.facing, inMeetingRoom: me.inMeetingRoom });
    updateSpatialAudioVolumes();
  }

  // Detección de cercanía a escritorios
  nearbyDesk = null;
  for (const desk of officeDesks) {
    const dist = Math.hypot(me.x - (desk.x + desk.width / 2), me.y - (desk.y + desk.height / 2));
    if (dist < 85) {
      nearbyDesk = desk;
      break;
    }
  }

  if (nearbyDesk) {
    interactionPrompt.classList.remove('hidden');
  } else {
    interactionPrompt.classList.add('hidden');
  }
}

// Renderizado de Oficina Profesional
function drawScene() {
  // Suelo general
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cuadrícula arquitectónica sutil
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // 1. Dibujar Sala de Juntas Ejecutiva (Paredes de cristal y mesa de juntas ovalada)
  if (meetingRoom) {
    // Piso especial alfombrado
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(meetingRoom.x, meetingRoom.y, meetingRoom.width, meetingRoom.height);

    // Paredes de cristal con puerta
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.strokeRect(meetingRoom.x, meetingRoom.y, meetingRoom.width, meetingRoom.height);

    // Letrero
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 11px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 ' + meetingRoom.title, meetingRoom.x + meetingRoom.width / 2, meetingRoom.y + 20);

    // Mesa de juntas ovalada
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(meetingRoom.x + meetingRoom.width / 2, meetingRoom.y + meetingRoom.height / 2 + 10, 50, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 2. Dibujar Estaciones de Oficina
  officeDesks.forEach(desk => {
    // Alfombra departamental
    ctx.fillStyle = `${desk.color}18`;
    ctx.beginPath();
    ctx.roundRect(desk.x - 12, desk.y - 12, desk.width + 24, desk.height + 24, 10);
    ctx.fill();
    ctx.strokeStyle = `${desk.color}55`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Escritorio de madera oscura
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(desk.x, desk.y, desk.width, desk.height, 8);
    ctx.fill();

    // Silla ejecutiva
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(desk.x + desk.width / 2, desk.y + desk.height / 2 + 18, 12, 0, Math.PI * 2);
    ctx.fill();

    // Laptop encendida con pantalla de color
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(desk.x + desk.width / 2 - 16, desk.y + 10, 32, 20);
    ctx.fillStyle = desk.color;
    ctx.fillRect(desk.x + desk.width / 2 - 14, desk.y + 12, 28, 16);

    // Icono y Título
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(`${desk.icon || '📌'} ${desk.title}`, desk.x + desk.width / 2, desk.y + desk.height + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Plus Jakarta Sans';
    ctx.fillText(desk.department, desk.x + desk.width / 2, desk.y + desk.height + 34);
  });

  // 3. Decoración: Plantas corporativas en esquinas
  drawPlant(40, 40);
  drawPlant(canvas.width - 40, 40);
  drawPlant(40, canvas.height - 40);
  drawPlant(canvas.width - 40, canvas.height - 40);

  // 4. Radio de audio espacial del jugador
  if (selfId && players[selfId]) {
    const me = players[selfId];
    ctx.save();
    ctx.beginPath();
    ctx.arc(me.x, me.y, 180, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Dibujar Avatares
  for (const id in players) {
    const p = players[id];
    const isMe = id === selfId;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 18, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ondas de voz si está hablando
    if (p.isSpeaking && !p.isMuted) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cuerpo
    ctx.fillStyle = p.color || '#3b82f6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.fill();

    if (isMe) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Ojos
    ctx.fillStyle = '#ffffff';
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    if (p.facing === 'left') eyeOffsetX = -5;
    if (p.facing === 'right') eyeOffsetX = 5;
    if (p.facing === 'up') eyeOffsetY = -5;
    if (p.facing === 'down') eyeOffsetY = 5;

    ctx.beginPath();
    ctx.arc(p.x - 4 + eyeOffsetX, p.y - 2 + eyeOffsetY, 3, 0, Math.PI * 2);
    ctx.arc(p.x + 4 + eyeOffsetX, p.y - 2 + eyeOffsetY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Nombre y Rol
    ctx.fillStyle = isMe ? '#60a5fa' : '#ffffff';
    ctx.font = 'bold 11px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Plus Jakarta Sans';
    ctx.fillText(p.role, p.x, p.y - 38);
  }

  // 6. Burbujas de diálogo
  for (let i = floatingMessages.length - 1; i >= 0; i--) {
    const msg = floatingMessages[i];
    const sender = players[msg.senderId];
    if (sender) {
      drawSpeechBubble(sender.x, sender.y - 56, msg.text);
    }
    msg.timer--;
    if (msg.timer <= 0) floatingMessages.splice(i, 1);
  }
}

function drawPlant(x, y) {
  // Maceta
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(x, y + 4, 12, 0, Math.PI * 2);
  ctx.fill();
  // Hojas verdes
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(x - 6, y - 4, 9, 0, Math.PI * 2);
  ctx.arc(x + 6, y - 4, 9, 0, Math.PI * 2);
  ctx.arc(x, y - 10, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpeechBubble(x, y, text) {
  ctx.save();
  ctx.font = '12px Plus Jakarta Sans';
  const textWidth = ctx.measureText(text).width;
  const padding = 10;
  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = 26;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(x - bubbleWidth / 2, y - bubbleHeight / 2, bubbleWidth, bubbleHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

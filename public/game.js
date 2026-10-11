// Induction - Cliente del Videojuego Corporativo
const socket = io();

// Elementos del DOM
const joinModal = document.getElementById('joinModal');
const joinForm = document.getElementById('joinForm');
const gameContainer = document.getElementById('gameContainer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerCountEl = document.getElementById('playerCount');
const interactionPrompt = document.getElementById('interactionPrompt');
const deskModal = document.getElementById('deskModal');
const deskTitle = document.getElementById('deskTitle');
const deskDeptBadge = document.getElementById('deskDeptBadge');
const deskInfo = document.getElementById('deskInfo');
const deskCloseBtn = document.getElementById('deskCloseBtn');

const tabChatBtn = document.getElementById('tabChatBtn');
const tabTasksBtn = document.getElementById('tabTasksBtn');
const chatView = document.getElementById('chatView');
const tasksView = document.getElementById('tasksView');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');

// Estado local
let selfId = null;
let players = {};
let officeDesks = [];
let nearbyDesk = null;
const visitedDesks = new Set();
const floatingMessages = []; // Burbujas sobre los avatares

// Teclas presionadas
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false
};

// Eventos de tabs laterales
tabChatBtn.addEventListener('click', () => {
  tabChatBtn.classList.add('active');
  tabTasksBtn.classList.remove('active');
  chatView.classList.add('active');
  tasksView.classList.remove('active');
});

tabTasksBtn.addEventListener('click', () => {
  tabTasksBtn.classList.add('active');
  tabChatBtn.classList.remove('active');
  tasksView.classList.add('active');
  chatView.classList.remove('active');
});

// Enviar formulario de ingreso
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const role = document.getElementById('playerRole').value;
  const color = document.querySelector('input[name="avatarColor"]:checked').value;

  socket.emit('player:join', { name, role, color });
  joinModal.classList.add('hidden');
  gameContainer.classList.remove('hidden');
});

// Eventos de Socket.io
socket.on('office:init', (data) => {
  selfId = data.selfId;
  players = data.players;
  officeDesks = data.desks;
  updatePlayerCount();
  requestAnimationFrame(gameLoop);
});

socket.on('player:joined', (player) => {
  players[player.id] = player;
  updatePlayerCount();
  addChatMessage({
    senderName: '🏢 Sistema',
    text: `${player.name} (${player.role}) se ha unido a la oficina.`,
    isSystem: true
  });
});

socket.on('player:moved', (data) => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].y = data.y;
    players[data.id].facing = data.facing;
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
    updatePlayerCount();
  }
});

socket.on('chat:broadcast', (msg) => {
  // Calcular distancia para chat por proximidad
  let isNear = false;
  if (selfId && players[selfId]) {
    const me = players[selfId];
    const dist = Math.hypot(me.x - msg.x, me.y - msg.y);
    if (dist < 180) {
      isNear = true;
    }
  }

  addChatMessage({ ...msg, isNear });

  // Burbuja sobre el avatar
  floatingMessages.push({
    senderId: msg.senderId,
    text: msg.text,
    timer: 240 // ~4 segundos a 60fps
  });
});

function updatePlayerCount() {
  playerCountEl.textContent = Object.keys(players).length;
}

// Capturar controles del teclado
window.addEventListener('keydown', (e) => {
  if (document.activeElement === chatInput) return;

  if (e.key in keys) {
    keys[e.key] = true;
  }

  // Tecla 'E' para interactuar
  if ((e.key === 'e' || e.key === 'E') && nearbyDesk && !deskModal.classList.contains('active')) {
    openDeskModal(nearbyDesk);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
  }
});

// Modal de información de estación
function openDeskModal(desk) {
  deskTitle.textContent = desk.title;
  deskDeptBadge.textContent = desk.department;
  deskInfo.textContent = desk.info;
  deskModal.classList.remove('hidden');

  // Marcar checklist de inducción
  visitedDesks.add(desk.id);
  const taskItem = document.querySelector(`.task-item[data-desk="${desk.id}"]`);
  if (taskItem) {
    taskItem.classList.add('completed');
    taskItem.querySelector('.check-box').textContent = '✅';
  }
}

deskCloseBtn.addEventListener('click', () => {
  deskModal.classList.add('hidden');
});

// Envío de mensajes de chat
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
  el.className = `chat-msg ${msg.isNear ? 'near' : ''}`;
  
  if (msg.isSystem) {
    el.innerHTML = `<small style="color: #94a3b8">${msg.text}</small>`;
  } else {
    el.innerHTML = `
      <div class="chat-msg-header">
        <strong>${escapeHtml(msg.senderName)}</strong>
        <span>${msg.timestamp || ''} ${msg.isNear ? '• (Cerca)' : ''}</span>
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

// Bucle principal del juego (Render & Actualización)
function gameLoop() {
  updateMovement();
  drawScene();
  requestAnimationFrame(gameLoop);
}

function updateMovement() {
  if (!selfId || !players[selfId]) return;
  const me = players[selfId];
  const speed = 3.5;
  let moved = false;
  let newX = me.x;
  let newY = me.y;

  if (keys.w || keys.ArrowUp) { newY -= speed; me.facing = 'up'; moved = true; }
  if (keys.s || keys.ArrowDown) { newY += speed; me.facing = 'down'; moved = true; }
  if (keys.a || keys.ArrowLeft) { newX -= speed; me.facing = 'left'; moved = true; }
  if (keys.d || keys.ArrowRight) { newX += speed; me.facing = 'right'; moved = true; }

  // Límites del mapa
  newX = Math.max(30, Math.min(canvas.width - 30, newX));
  newY = Math.max(30, Math.min(canvas.height - 30, newY));

  if (moved) {
    me.x = newX;
    me.y = newY;
    socket.emit('player:move', { x: me.x, y: me.y, facing: me.facing });
  }

  // Comprobar cercanía a escritorios
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

// Dibujado del Mundo
function drawScene() {
  // Fondo de piso de oficina (patrón de baldosas de madera / vinilo)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cuadrícula estética
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Dibujar alfombras y puestos de trabajo
  officeDesks.forEach(desk => {
    // Alfombra decorativa
    ctx.fillStyle = `${desk.color}22`;
    ctx.fillRect(desk.x - 15, desk.y - 15, desk.width + 30, desk.height + 30);
    ctx.strokeStyle = desk.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(desk.x - 15, desk.y - 15, desk.width + 30, desk.height + 30);

    // Mesa de oficina
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(desk.x, desk.y, desk.width, desk.height, 8);
    ctx.fill();

    // Pantalla / Monitor de laptop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(desk.x + desk.width / 2 - 16, desk.y + 12, 32, 20);
    ctx.fillStyle = desk.color;
    ctx.fillRect(desk.x + desk.width / 2 - 14, desk.y + 14, 28, 16);

    // Texto de estación
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(desk.title, desk.x + desk.width / 2, desk.y + desk.height + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Plus Jakarta Sans';
    ctx.fillText(desk.department, desk.x + desk.width / 2, desk.y + desk.height + 34);
  });

  // Radio de proximidad de voz si es el propio jugador
  if (selfId && players[selfId]) {
    const me = players[selfId];
    ctx.save();
    ctx.beginPath();
    ctx.arc(me.x, me.y, 140, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }

  // Dibujar todos los avatares
  for (const id in players) {
    const p = players[id];
    const isMe = id === selfId;

    // Sombra del avatar
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 16, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo / Avatar redondo estilo videojuego
    ctx.fillStyle = p.color || '#3b82f6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.fill();

    // Borde brillante si es el propio usuario
    if (isMe) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Ojos según dirección
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

    // Nombre y Rol sobre el avatar
    ctx.fillStyle = isMe ? '#60a5fa' : '#ffffff';
    ctx.font = 'bold 11px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Plus Jakarta Sans';
    ctx.fillText(p.role, p.x, p.y - 38);
  }

  // Dibujar burbujas de diálogo flotantes
  for (let i = floatingMessages.length - 1; i >= 0; i--) {
    const msg = floatingMessages[i];
    const sender = players[msg.senderId];
    if (sender) {
      drawSpeechBubble(sender.x, sender.y - 56, msg.text);
    }
    msg.timer--;
    if (msg.timer <= 0) {
      floatingMessages.splice(i, 1);
    }
  }
}

// Dibujar burbuja de texto flotante
function drawSpeechBubble(x, y, text) {
  ctx.save();
  ctx.font = '12px Plus Jakarta Sans';
  const textWidth = ctx.measureText(text).width;
  const padding = 8;
  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = 24;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(x - bubbleWidth / 2, y - bubbleHeight / 2, bubbleWidth, bubbleHeight, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

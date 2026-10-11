const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Estado de la oficina en memoria
const players = {};

// Configuración de las estaciones de inducción corporativa
let officeDesks = [
  {
    id: 'desk-rrhh',
    name: 'Sofía Valenzuela',
    title: 'Sofía Valenzuela',
    role: 'Líder de Recursos Humanos (RRHH)',
    department: 'Talento & Cultura',
    x: -20,
    z: -12,
    color: '#8B5CF6',
    icon: '🤝',
    info: '¡Hola! Qué gusto tenerte en el equipo. Yo gestiono tus vacaciones, seguro médico corporativo y bienestar. Te dejé una copia del manual de convivencia en tu correo institucional.'
  },
  {
    id: 'desk-it',
    name: 'Alex Rivera',
    title: 'Alex Rivera',
    role: 'Especialista en Ciberseguridad TI',
    department: 'Tecnología & Soporte',
    x: 20,
    z: -12,
    color: '#06B6D4',
    icon: '🛡️',
    info: '¡Bienvenido! Regla #1 en la empresa: Todo dispositivo debe tener 2FA activo en 1Password y Google Suite. Nunca compartas credenciales ni entres a la VPN en redes Wi-Fi públicas sin cifrado.'
  },
  {
    id: 'desk-dev',
    name: 'Carlos Mendoza',
    title: 'Carlos Mendoza',
    role: 'Principal Tech Lead',
    department: 'Ingeniería de Software',
    x: -20,
    z: 18,
    color: '#3B82F6',
    icon: '💻',
    info: '¡Qué bueno verte por aquí! Trabajamos con Sprints de 2 semanas. Tenemos Daily Standup a las 9:30 AM en la Sala de Juntas. Revisa nuestro repositorio para desplegar tu entorno local.'
  },
  {
    id: 'desk-cafe',
    name: 'Valeria Gómez',
    title: 'Valeria Gómez',
    role: 'Head of People & Social',
    department: 'Cafetería & Zona Lounge',
    x: 20,
    z: 18,
    color: '#F59E0B',
    icon: '☕',
    info: '¡Tómate un café o té! Este es nuestro espacio para descansar, recargar energía y charlar sin hablar de trabajo. Los viernes a las 4:30 PM jugamos partidas online todos juntos.'
  }
];

// Zonas especiales (como Sala de Juntas con audio/chat privado)
const meetingRoom = {
  id: 'meeting-room',
  title: 'Sala de Juntas Ejecutiva',
  x: 310,
  y: 60,
  width: 180,
  height: 140,
  color: '#EC4899'
};

io.on('connection', (socket) => {
  console.log(`[Induction] Conectado: ${socket.id}`);

  // 1. Registro de jugador
  socket.on('player:join', (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || 'Nuevo Empleado',
      role: data.role || 'Junior Onboarding',
      color: data.color || '#3B82F6',
      x: (Math.random() * 6 - 3),
      y: 0,
      z: (Math.random() * 6 - 3),
      rotationY: 0,
      facing: 'down',
      inMeetingRoom: false,
      isMuted: true,
      isSpeaking: false
    };

    socket.emit('office:init', {
      selfId: socket.id,
      players: players,
      desks: officeDesks,
      meetingRoom: meetingRoom
    });

    socket.broadcast.emit('player:joined', players[socket.id]);
  });

  // 2. Movimiento 3D
  socket.on('player:move', (pos) => {
    if (players[socket.id]) {
      players[socket.id].x = pos.x;
      players[socket.id].y = pos.y || 0;
      players[socket.id].z = pos.z || 0;
      players[socket.id].rotationY = pos.rotationY || 0;
      players[socket.id].inMeetingRoom = pos.inMeetingRoom || false;

      socket.broadcast.emit('player:moved', {
        id: socket.id,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rotationY: pos.rotationY,
        inMeetingRoom: players[socket.id].inMeetingRoom
      });
    }
  });

  // 3. Estado del micrófono / Habla
  socket.on('player:voice_state', (state) => {
    if (players[socket.id]) {
      players[socket.id].isMuted = state.isMuted;
      players[socket.id].isSpeaking = state.isSpeaking;
      socket.broadcast.emit('player:voice_updated', {
        id: socket.id,
        isMuted: state.isMuted,
        isSpeaking: state.isSpeaking
      });
    }
  });

  // 4. WebRTC Signaling para Audio P2P
  socket.on('webrtc:signal', (data) => {
    // Reenviar la oferta, respuesta o candidato ICE al destinatario
    if (data.target && players[data.target]) {
      io.to(data.target).emit('webrtc:signal', {
        sender: socket.id,
        signal: data.signal
      });
    }
  });

  // 5. Chat en tiempo real
  socket.on('player:message', (data) => {
    if (players[socket.id]) {
      const msg = {
        senderId: socket.id,
        senderName: players[socket.id].name,
        senderRole: players[socket.id].role,
        x: players[socket.id].x,
        y: players[socket.id].y,
        inMeetingRoom: players[socket.id].inMeetingRoom,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      io.emit('chat:broadcast', msg);
    }
  });

  // 6. Panel de Administración: Actualizar contenidos de una estación
  socket.on('admin:update_desk', (updatedDesk) => {
    const idx = officeDesks.findIndex(d => d.id === updatedDesk.id);
    if (idx !== -1) {
      officeDesks[idx] = { ...officeDesks[idx], ...updatedDesk };
      io.emit('office:desks_updated', officeDesks);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`[Induction] Desconectado: ${socket.id}`);
    delete players[socket.id];
    io.emit('player:left', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏢 Induction Server Activo en http://localhost:${PORT}`);
  console.log(`===============================================`);
});

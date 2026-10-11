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
    title: 'Recursos Humanos',
    department: 'Talento & Cultura',
    x: 140,
    y: 130,
    width: 100,
    height: 70,
    color: '#8B5CF6',
    icon: '🤝',
    info: '¡Bienvenido al equipo! Aquí gestionamos tus vacaciones, beneficios de salud y políticas laborales. Revisa el manual de convivencia corporativa y tu contrato de bienvenida.'
  },
  {
    id: 'desk-it',
    title: 'TI & Ciberseguridad',
    department: 'Tecnología',
    x: 560,
    y: 130,
    width: 100,
    height: 70,
    color: '#06B6D4',
    icon: '🛡️',
    info: 'Normativa de seguridad: 1) Activar 2FA en todas las cuentas corporativas. 2) Conectarse a la VPN antes de acceder a la base de datos interna. 3) Prohibido compartir credenciales.'
  },
  {
    id: 'desk-dev',
    title: 'Ingeniería & Producto',
    department: 'Desarrollo',
    x: 140,
    y: 420,
    width: 100,
    height: 70,
    color: '#3B82F6',
    icon: '💻',
    info: 'Flujo de trabajo: Trabajamos con Scrum de sprints bisemanales. Daily Standup a las 9:30 AM vía Sala de Juntas. Ramas protegidas en GitHub; todo PR requiere aprobación de un Senior.'
  },
  {
    id: 'desk-cafe',
    title: 'Cafetería & Networking',
    department: 'Zona Social',
    x: 560,
    y: 420,
    width: 100,
    height: 70,
    color: '#F59E0B',
    icon: '☕',
    info: 'Espacio para desconectar y conocer al resto del equipo. Los viernes a las 4:30 PM organizamos dinámicas de integración y juegos online.'
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
      x: 400 + (Math.random() * 30 - 15),
      y: 320 + (Math.random() * 30 - 15),
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

  // 2. Movimiento
  socket.on('player:move', (pos) => {
    if (players[socket.id]) {
      players[socket.id].x = pos.x;
      players[socket.id].y = pos.y;
      players[socket.id].facing = pos.facing || players[socket.id].facing;
      players[socket.id].inMeetingRoom = pos.inMeetingRoom || false;

      socket.broadcast.emit('player:moved', {
        id: socket.id,
        x: pos.x,
        y: pos.y,
        facing: players[socket.id].facing,
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

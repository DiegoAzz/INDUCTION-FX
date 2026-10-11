const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

const PORT = process.env.PORT || 3050;

// Servir la carpeta pública con la interfaz del videojuego
app.use(express.static(path.join(__dirname, 'public')));

// Estado de jugadores conectados
const players = {};

// Información de los puestos / estaciones interactivas de la empresa
const officeDesks = [
  {
    id: 'desk-rrhh',
    title: 'Recursos Humanos (RRHH)',
    department: 'Talento y Cultura',
    x: 180,
    y: 160,
    width: 100,
    height: 70,
    color: '#845EC2',
    info: '¡Bienvenido al equipo! Aquí gestionamos tus vacaciones, beneficios, días de descanso y seguro de salud. Contacto: rrhh@empresa.com'
  },
  {
    id: 'desk-it',
    title: 'Soporte y Ciberseguridad TI',
    department: 'Tecnología',
    x: 520,
    y: 160,
    width: 100,
    height: 70,
    color: '#008F7A',
    info: 'Configuración de 2FA, entrega de credenciales VPN, accesos a repositorios y laptop corporativa. Recuerda nunca compartir contraseñas por chat.'
  },
  {
    id: 'desk-dev',
    title: 'Equipo de Desarrollo / Producto',
    department: 'Ingeniería',
    x: 180,
    y: 380,
    width: 100,
    height: 70,
    color: '#0089BA',
    info: 'Aquí construimos nuestras aplicaciones. Daily meetings a las 9:30 AM. Revisa el README principal del proyecto para tu configuración local.'
  },
  {
    id: 'desk-cafe',
    title: 'Cafetería & Zona Lounge',
    department: 'Descanso y Social',
    x: 520,
    y: 380,
    width: 100,
    height: 70,
    color: '#FF9671',
    info: 'Espacio para tomar un café virtual, charlar libremente con compañeros y despejar la mente. Todos los viernes tenemos juegos a las 4:00 PM.'
  }
];

io.on('connection', (socket) => {
  console.log(`[Induction] Jugador conectado: ${socket.id}`);

  // Recibir registro de jugador
  socket.on('player:join', (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || 'Nuevo Empleado',
      role: data.role || 'Junior Onboarding',
      color: data.color || '#3B82F6',
      x: 390 + (Math.random() * 40 - 20),
      y: 280 + (Math.random() * 40 - 20),
      facing: 'down'
    };

    // Enviar estado inicial del mapa, puestos y lista de jugadores
    socket.emit('office:init', {
      selfId: socket.id,
      players: players,
      desks: officeDesks
    });

    // Notificar a los demás que alguien llegó a la oficina
    socket.broadcast.emit('player:joined', players[socket.id]);
  });

  // Movimiento
  socket.on('player:move', (pos) => {
    if (players[socket.id]) {
      players[socket.id].x = pos.x;
      players[socket.id].y = pos.y;
      players[socket.id].facing = pos.facing || players[socket.id].facing;
      
      socket.broadcast.emit('player:moved', {
        id: socket.id,
        x: pos.x,
        y: pos.y,
        facing: players[socket.id].facing
      });
    }
  });

  // Chat con posición para cálculo de proximidad
  socket.on('player:message', (data) => {
    if (players[socket.id]) {
      const messagePayload = {
        senderId: socket.id,
        senderName: players[socket.id].name,
        senderRole: players[socket.id].role,
        x: players[socket.id].x,
        y: players[socket.id].y,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      io.emit('chat:broadcast', messagePayload);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`[Induction] Jugador desconectado: ${socket.id}`);
    delete players[socket.id];
    io.emit('player:left', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏢 Induction Server activo en http://localhost:${PORT}`);
  console.log(`===============================================`);
});

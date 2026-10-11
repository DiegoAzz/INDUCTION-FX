const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data_companies.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ----------------------------------------------------------------
// PERSISTENCIA DE EMPRESAS Y EMPLEADOS
// ----------------------------------------------------------------
function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error leyendo base de datos, inicializando nueva...', e);
    }
  }

  // Empresa Demo inicial por defecto
  const initialDb = {
    companies: {
      'demo-corp': {
        id: 'demo-corp',
        name: 'TechInnovate HQ',
        adminEmail: 'rrhh@techinnovate.com',
        createdAt: new Date().toISOString(),
        npcs: [
          {
            id: 'npc-rrhh',
            name: 'Sofía Valenzuela',
            role: 'Directora de Talento y Cultura',
            department: 'Recursos Humanos',
            avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
            x: -20,
            z: -12,
            color: '#8B5CF6',
            info: '¡Hola y bienvenido a TechInnovate! Como tu Directora de Talento, te acompañaré durante tu integración. Tu contrato y beneficios ya están en tu buzón corporativo. Recuerda solicitar tus días libres con 1 semana de anticipación.'
          },
          {
            id: 'npc-it',
            name: 'Alex Rivera',
            role: 'Head of Information Security',
            department: 'TI & Ciberseguridad',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
            x: 20,
            z: -12,
            color: '#06B6D4',
            info: '¡Mucho gusto! Aquí velamos por la seguridad de la información. Protocolo obligatorio: 1) Todo acceso requiere autenticador 2FA. 2) Conéctate a la VPN de la empresa antes de hacer consultas a producción. ¡Cuentas con soporte 24/7!'
          },
          {
            id: 'npc-dev',
            name: 'Carlos Mendoza',
            role: 'VP of Engineering',
            department: 'Ingeniería & Producto',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
            x: -20,
            z: 18,
            color: '#3B82F6',
            info: '¡Bienvenido al equipo de ingeniería! Trabajamos con Sprints de 2 semanas y releases continuos. Tenemos Daily Standup a las 9:30 AM en la Sala de Juntas. Pasa por el canal #dev-welcome en Slack para tu onboarding técnico.'
          },
          {
            id: 'npc-cafe',
            name: 'Valeria Gómez',
            role: 'People Experience & Culture Lead',
            department: 'Zona Social & Cafetería',
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
            x: 20,
            z: 18,
            color: '#F59E0B',
            info: '¡Tómate un café o té! Aquí creemos que las mejores ideas nacen de buenas conversaciones. Este espacio es para desconectar de las pantallas. ¡Todos los viernes a las 4:30 PM tenemos tarde de juegos en equipo!'
          }
        ],
        employees: {} // email/id -> { name, role, visitedNPCs: [] }
      }
    }
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
  return initialDb;
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error guardando base de datos:', err);
  }
}

let db = loadDatabase();

// ----------------------------------------------------------------
// API REST: REGISTRO DE EMPRESAS Y EMPLEADOS
// ----------------------------------------------------------------

// Listar empresas disponibles
app.get('/api/companies', (req, res) => {
  const list = Object.values(db.companies).map(c => ({
    id: c.id,
    name: c.name,
    adminEmail: c.adminEmail
  }));
  res.json(list);
});

// Registrar nueva empresa (B2B)
app.post('/api/companies', (req, res) => {
  const { name, adminEmail } = req.body;
  if (!name || !adminEmail) {
    return res.status(400).json({ error: 'Nombre de empresa y correo de administrador requeridos' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'empresa-' + Date.now();
  
  if (db.companies[slug]) {
    return res.status(400).json({ error: 'Ya existe una empresa con ese nombre' });
  }

  // Copiar plantilla de NPCs personalizables
  const defaultNpcs = JSON.parse(JSON.stringify(db.companies['demo-corp'].npcs));

  db.companies[slug] = {
    id: slug,
    name: name.trim(),
    adminEmail: adminEmail.trim(),
    createdAt: new Date().toISOString(),
    npcs: defaultNpcs,
    employees: {}
  };

  saveDatabase(db);
  console.log(`[Induction] Nueva empresa registrada: ${name} (${slug})`);
  res.status(201).json({ success: true, company: db.companies[slug] });
});

// Obtener datos de una empresa específica
app.get('/api/companies/:companyId', (req, res) => {
  const company = db.companies[req.params.companyId];
  if (!company) {
    return res.status(404).json({ error: 'Empresa no encontrada' });
  }
  res.json(company);
});

// ----------------------------------------------------------------
// SOCKET.IO: GESTIÓN DE SALAS POR EMPRESA & MULTIJUGADOR
// ----------------------------------------------------------------
const activePlayers = {}; // socketId -> player object

io.on('connection', (socket) => {
  console.log(`[Socket] Conectado: ${socket.id}`);

  // Registro del empleado en la empresa
  socket.on('player:join', (data) => {
    const companyId = data.companyId || 'demo-corp';
    const company = db.companies[companyId] || db.companies['demo-corp'];

    // Unir el socket a la sala privada de la empresa
    socket.join(companyId);

    // Persistir o actualizar progreso del empleado en la DB
    const empKey = (data.name || 'Invitado').toLowerCase().trim();
    if (!company.employees[empKey]) {
      company.employees[empKey] = {
        name: data.name,
        role: data.role,
        visitedNPCs: [],
        firstLogin: new Date().toISOString()
      };
      saveDatabase(db);
    }

    const savedProgress = company.employees[empKey].visitedNPCs || [];

    activePlayers[socket.id] = {
      id: socket.id,
      companyId: companyId,
      name: data.name || 'Nuevo Empleado',
      role: data.role || 'Junior Onboarding',
      color: data.color || '#3B82F6',
      x: (Math.random() * 6 - 3),
      y: 0,
      z: (Math.random() * 6 - 3),
      rotationY: 0,
      inMeetingRoom: false,
      isMuted: true
    };

    // Enviar al nuevo usuario la lista de jugadores de SU empresa y los NPCs de SU empresa
    const companyPlayers = {};
    for (const sId in activePlayers) {
      if (activePlayers[sId].companyId === companyId) {
        companyPlayers[sId] = activePlayers[sId];
      }
    }

    socket.emit('office:init', {
      selfId: socket.id,
      company: { id: company.id, name: company.name },
      npcs: company.npcs,
      players: companyPlayers,
      savedProgress: savedProgress
    });

    // Notificar sólo a los compañeros de la misma empresa
    socket.to(companyId).emit('player:joined', activePlayers[socket.id]);
  });

  // Movimiento 3D
  socket.on('player:move', (pos) => {
    const player = activePlayers[socket.id];
    if (player) {
      player.x = pos.x;
      player.y = pos.y || 0;
      player.z = pos.z;
      player.rotationY = pos.rotationY || 0;
      player.inMeetingRoom = pos.inMeetingRoom || false;

      socket.to(player.companyId).emit('player:moved', {
        id: socket.id,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rotationY: pos.rotationY,
        inMeetingRoom: player.inMeetingRoom
      });
    }
  });

  // Guardar misión de inducción completada en base de datos
  socket.on('player:complete_task', (npcId) => {
    const player = activePlayers[socket.id];
    if (player && db.companies[player.companyId]) {
      const empKey = (player.name || '').toLowerCase().trim();
      const emp = db.companies[player.companyId].employees[empKey];
      if (emp && !emp.visitedNPCs.includes(npcId)) {
        emp.visitedNPCs.push(npcId);
        saveDatabase(db);
      }
    }
  });

  // Estado de Radio / Walkie-Talkie
  socket.on('player:voice_state', (data) => {
    const player = activePlayers[socket.id];
    if (player) {
      player.isSpeaking = data.isSpeaking;
      socket.to(player.companyId).emit('player:voice_updated', {
        id: socket.id,
        isSpeaking: data.isSpeaking
      });
    }
  });

  // WebRTC Audio Signaling
  socket.on('webrtc:signal', (data) => {
    if (data.target && activePlayers[data.target]) {
      io.to(data.target).emit('webrtc:signal', {
        sender: socket.id,
        signal: data.signal
      });
    }
  });

  // Chat en tiempo real
  socket.on('player:message', (data) => {
    const player = activePlayers[socket.id];
    if (player) {
      const msg = {
        senderId: socket.id,
        senderName: player.name,
        senderRole: player.role,
        x: player.x,
        z: player.z,
        inMeetingRoom: player.inMeetingRoom,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      io.to(player.companyId).emit('chat:broadcast', msg);
    }
  });

  // Admin: Actualizar NPC de la empresa
  socket.on('admin:update_npc', (updatedNpc) => {
    const player = activePlayers[socket.id];
    if (player && db.companies[player.companyId]) {
      const company = db.companies[player.companyId];
      const idx = company.npcs.findIndex(n => n.id === updatedNpc.id);
      if (idx !== -1) {
        company.npcs[idx] = { ...company.npcs[idx], ...updatedNpc };
        saveDatabase(db);
        io.to(player.companyId).emit('office:npcs_updated', company.npcs);
      }
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    const player = activePlayers[socket.id];
    if (player) {
      console.log(`[Socket] Desconectado: ${socket.id}`);
      socket.to(player.companyId).emit('player:left', socket.id);
      delete activePlayers[socket.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏢 Induction Enterprise v2.0 corriendo en puerto ${PORT}`);
  console.log(`===============================================`);
});

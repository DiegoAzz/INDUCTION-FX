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
// GENERADOR DINÁMICO DE OFICINAS 3D (ESTILO ROBLOX / SIMCITY)
// ----------------------------------------------------------------
const AVATAR_POOL = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'
];

const COLOR_PALETTE = ['#8B5CF6', '#06B6D4', '#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#6366F1', '#14B8A6'];

// Calcula coordenadas (x, z) alrededor de la plaza central según el número de dependencias
function generateDepartmentLayout(departments) {
  const npcs = [];
  const radius = 24;
  const count = departments.length;

  departments.forEach((dept, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(Math.cos(angle) * radius);
    const z = Math.round(Math.sin(angle) * radius);
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const avatar = AVATAR_POOL[index % AVATAR_POOL.length];

    npcs.push({
      id: `dept-${index + 1}`,
      name: dept.leaderName || `Líder de ${dept.name}`,
      role: dept.leaderRole || `Director(a) de ${dept.name}`,
      department: dept.name,
      avatarUrl: avatar,
      x: x,
      z: z,
      color: color,
      info: dept.description || `¡Hola! Bienvenido a la dependencia de ${dept.name}. Aquí gestionamos los procesos clave de nuestra área corporativa. Conoce nuestras funciones y políticas.`
    });
  });

  return npcs;
}

// ----------------------------------------------------------------
// PERSISTENCIA DE EMPRESAS Y EMPLEADOS
// ----------------------------------------------------------------
function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error leyendo base de datos...', e);
    }
  }

  // Empresa Demo inicial
  const defaultDepts = [
    { name: 'Recursos Humanos', leaderName: 'Sofía Valenzuela', leaderRole: 'Directora de Talento y Cultura', description: 'Gestión de vacaciones, beneficios, días libres y seguro médico corporativo.' },
    { name: 'Ciberseguridad & TI', leaderName: 'Alex Rivera', leaderRole: 'Head of Information Security', description: 'Protocolos de seguridad, autenticación 2FA obligatoria y credenciales de acceso.' },
    { name: 'Ingeniería & Producto', leaderName: 'Carlos Mendoza', leaderRole: 'VP of Engineering', description: 'Metodología Scrum en Sprints bisemanales y lanzamientos continuos de software.' },
    { name: 'Cafetería & Zona Social', leaderName: 'Valeria Gómez', leaderRole: 'People Experience Lead', description: 'Espacio para desconectar y conocer al resto del equipo. Tardes de integración los viernes.' }
  ];

  const initialDb = {
    companies: {
      'demo-corp': {
        id: 'demo-corp',
        name: 'TechInnovate HQ',
        adminEmail: 'admin@techinnovate.com',
        employeeCountExpected: 25,
        departments: defaultDepts,
        npcs: generateDepartmentLayout(defaultDepts),
        employees: {
          'diego@empresa.com': {
            id: 'emp-1',
            name: 'Diego Zúñiga',
            email: 'diego@empresa.com',
            role: 'Ingeniería de Software',
            department: 'Ingeniería & Producto',
            color: '#3B82F6',
            visitedNPCs: [],
            createdAt: new Date().toISOString()
          }
        }
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

const dbManager = require('./db');

// ----------------------------------------------------------------
// APIS REST
// ----------------------------------------------------------------

// Listar empresas
app.get('/api/companies', async (req, res) => {
  try {
    const list = await dbManager.getCompanies();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar empresas' });
  }
});

// Registrar nueva empresa con sus dependencias y funcionarios (Estilo Roblox)
app.post('/api/companies', async (req, res) => {
  const { name, adminEmail, employeeCountExpected, departmentsList } = req.body;
  if (!name || !adminEmail) {
    return res.status(400).json({ error: 'Nombre de empresa y correo requeridos' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'empresa-' + Date.now();

  let departments = [];
  if (Array.isArray(departmentsList) && departmentsList.length > 0) {
    departments = departmentsList.filter(d => d.trim().length > 0).map(d => ({
      name: d.trim(),
      description: `Área de ${d.trim()}. Aquí gestionamos los procesos y normativas de nuestra dependencia.`
    }));
  } else {
    departments = [
      { name: 'Gerencia General', description: 'Dirección estratégica y objetivos corporativos.' },
      { name: 'Recursos Humanos', description: 'Talento, contratos, beneficios e inducción.' },
      { name: 'Operaciones & TI', description: 'Herramientas tecnológicas, seguridad y logística.' },
      { name: 'Cafetería & Social', description: 'Descanso, bienestar e integración de funcionarios.' }
    ];
  }

  const generatedNpcs = generateDepartmentLayout(departments);

  try {
    const company = await dbManager.createCompany({
      slug,
      name: name.trim(),
      adminEmail: adminEmail.trim(),
      employeeCountExpected: parseInt(employeeCountExpected, 10) || 10,
      departments: departments
    }, generatedNpcs);

    console.log(`[Induction] Empresa guardada en base de datos: ${name} (${slug})`);
    res.status(201).json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: 'Error creando empresa en base de datos' });
  }
});

// Obtener datos y funcionarios de una empresa
app.get('/api/companies/:companyId', async (req, res) => {
  try {
    const company = await dbManager.getCompanyBySlug(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo empresa' });
  }
});

// Registrar un nuevo funcionario en la base de datos de una empresa
app.post('/api/companies/:companyId/employees', async (req, res) => {
  const { companyId } = req.params;
  const { name, email, role, department, color } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y correo requeridos' });
  }

  try {
    const employee = await dbManager.createEmployee(companyId, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'Funcionario',
      department: department || 'General',
      color: color || '#3B82F6'
    });
    res.status(201).json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ error: 'Error registrando funcionario en base de datos' });
  }
});

// Agregar una nueva dependencia a la oficina 3D
app.post('/api/companies/:companyId/departments', async (req, res) => {
  const { companyId } = req.params;
  const { name, description, leaderName, leaderRole, color } = req.body;

  if (!name) return res.status(400).json({ error: 'Nombre de dependencia requerido' });

  try {
    const newDept = await dbManager.addDepartment(companyId, {
      name: name.trim(),
      description: description || `Área de ${name.trim()}`,
      leaderName,
      leaderRole,
      color
    });

    const updatedCompany = await dbManager.getCompanyBySlug(companyId);
    if (updatedCompany) {
      io.to(companyId).emit('office:rebuild_layout', updatedCompany.npcs);
    }

    res.status(201).json({ success: true, department: newDept });
  } catch (err) {
    res.status(500).json({ error: 'Error agregando dependencia' });
  }
});

// Eliminar una dependencia
app.delete('/api/companies/:companyId/departments/:deptId', async (req, res) => {
  const { companyId, deptId } = req.params;
  try {
    await dbManager.deleteDepartment(companyId, deptId);
    const updatedCompany = await dbManager.getCompanyBySlug(companyId);
    if (updatedCompany) {
      io.to(companyId).emit('office:rebuild_layout', updatedCompany.npcs);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando dependencia' });
  }
});

// Eliminar un funcionario
app.delete('/api/companies/:companyId/employees/:email', async (req, res) => {
  const { companyId, email } = req.params;
  try {
    await dbManager.deleteEmployee(companyId, email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando funcionario' });
  }
});

// ----------------------------------------------------------------
// SOCKET.IO SALAS Y MULTIJUGADOR
// ----------------------------------------------------------------
const activePlayers = {};

io.on('connection', (socket) => {
  // Login / Ingreso de funcionario a la oficina 3D
  socket.on('player:join', async (data) => {
    const companyId = data.companyId || 'demo-corp';
    const company = await dbManager.getCompanyBySlug(companyId);
    if (!company) return;

    socket.join(companyId);

    const email = data.email || `${(data.name || 'user').replace(/\s+/g, '.').toLowerCase()}@${company.id}.com`;
    const employee = await dbManager.createEmployee(companyId, {
      name: data.name,
      email: email,
      role: data.role || 'Nuevo Ingreso',
      department: data.department || 'General',
      color: data.color || '#3B82F6'
    });

    activePlayers[socket.id] = {
      id: socket.id,
      companyId: companyId,
      name: data.name,
      email: email,
      role: data.role,
      department: data.department || 'General',
      color: data.color || '#3B82F6',
      x: (Math.random() * 6 - 3),
      y: 0,
      z: (Math.random() * 6 - 3),
      rotationY: 0,
      inMeetingRoom: false,
      isSpeaking: false
    };

    const companyPlayers = {};
    for (const sId in activePlayers) {
      if (activePlayers[sId].companyId === companyId) {
        companyPlayers[sId] = activePlayers[sId];
      }
    }

    socket.emit('office:init', {
      selfId: socket.id,
      company: {
        id: company.id,
        name: company.name,
        employeeCountExpected: company.employeeCountExpected,
        departments: company.departments
      },
      npcs: company.npcs,
      players: companyPlayers,
      savedProgress: []
    });

    socket.to(companyId).emit('player:joined', activePlayers[socket.id]);
  });

  // Movimiento
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

  // Guardar misión completada en la BD
  socket.on('player:complete_task', async (npcId) => {
    const player = activePlayers[socket.id];
    if (player) {
      await dbManager.recordTaskProgress(player.companyId, player.email, npcId);
    }
  });

  // Radio Walkie-Talkie Estado
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

  // Chat
  socket.on('player:message', (data) => {
    const player = activePlayers[socket.id];
    if (player) {
      const msg = {
        senderId: socket.id,
        senderName: player.name,
        senderRole: `${player.role} (${player.department})`,
        x: player.x,
        z: player.z,
        inMeetingRoom: player.inMeetingRoom,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      io.to(player.companyId).emit('chat:broadcast', msg);
    }
  });

  // ----------------------------------------------------
  // SISTEMA DE LLAMADAS PRIVADAS 1 A 1 & CHAT PRIVADO
  // ----------------------------------------------------

  // 1. Enviar solicitud de llamada privada
  socket.on('call:request', (data) => {
    const caller = activePlayers[socket.id];
    const targetSocketId = data.targetId;

    if (caller && activePlayers[targetSocketId]) {
      io.to(targetSocketId).emit('call:incoming', {
        callerId: socket.id,
        callerName: caller.name,
        callerRole: caller.role,
        callerDept: caller.department
      });
    }
  });

  // 2. Aceptar llamada privada
  socket.on('call:accept', (data) => {
    const targetSocketId = data.callerId;
    const receiver = activePlayers[socket.id];

    if (receiver && activePlayers[targetSocketId]) {
      // Notificar a quien llamó que la llamada fue aceptada
      io.to(targetSocketId).emit('call:connected', {
        partnerId: socket.id,
        partnerName: receiver.name
      });

      // Confirmar al receptor
      socket.emit('call:connected', {
        partnerId: targetSocketId,
        partnerName: activePlayers[targetSocketId].name
      });
    }
  });

  // 3. Rechazar llamada
  socket.on('call:reject', (data) => {
    const callerId = data.callerId;
    if (activePlayers[callerId]) {
      io.to(callerId).emit('call:declined', {
        partnerName: activePlayers[socket.id] ? activePlayers[socket.id].name : 'El compañero'
      });
    }
  });

  // 4. Finalizar / Colgar llamada
  socket.on('call:hangup', (data) => {
    const partnerId = data.partnerId;
    if (activePlayers[partnerId]) {
      io.to(partnerId).emit('call:ended');
    }
  });

  // 5. Chat Privado (DM 1 a 1)
  socket.on('chat:private_dm', (data) => {
    const sender = activePlayers[socket.id];
    const targetSocketId = data.targetId;

    if (sender && activePlayers[targetSocketId]) {
      const dmPayload = {
        senderId: socket.id,
        senderName: sender.name,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // Enviar al destinatario y confirmar al emisor
      io.to(targetSocketId).emit('chat:private_receive', dmPayload);
      socket.emit('chat:private_receive', dmPayload);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    const player = activePlayers[socket.id];
    if (player) {
      socket.to(player.companyId).emit('player:left', socket.id);
      delete activePlayers[socket.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`🏢 Induction Engine 3.0 (Roblox Office Builder) activo en http://localhost:${PORT}`);
});

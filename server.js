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

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0
}));
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

  const adminPassword = req.body.adminPassword || 'admin123';

  try {
    const company = await dbManager.createCompany({
      slug,
      name: name.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword: adminPassword.trim(),
      status: 'active',
      employeeCountExpected: parseInt(employeeCountExpected, 10) || 10,
      departments: departments
    }, generatedNpcs);

    console.log(`[Induction] Empresa guardada en base de datos: ${name} (${slug})`);
    res.status(201).json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: 'Error creando empresa en base de datos' });
  }
});

// ----------------------------------------------------------------
// SUPER ADMINISTRADOR SAAS - GESTIÓN MAESTRA DE EMPRESAS CLIENTES
// ----------------------------------------------------------------

// Login de Super Administrador
app.post('/api/superadmin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Credenciales incompletas' });
  }

  const admin = await dbManager.verifySuperAdmin(email.trim(), password.trim());
  if (!admin) {
    return res.status(401).json({ error: 'Credenciales de Super Administrador inválidas' });
  }

  res.json({ success: true, user: admin });
});

// Listado de empresas para Super Administrador (con credenciales y accesos)
app.get('/api/superadmin/companies', async (req, res) => {
  try {
    const companies = await dbManager.getCompanies();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: 'Error listando empresas' });
  }
});

// Crear nueva empresa desde Super Administrador
app.post('/api/superadmin/companies', async (req, res) => {
  const { name, slug: customSlug, adminEmail, adminPassword, employeeCountExpected, departmentsList } = req.body;
  if (!name || !adminEmail) {
    return res.status(400).json({ error: 'Nombre de empresa y correo de administrador requeridos' });
  }

  const slug = (customSlug && customSlug.trim())
    ? customSlug.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
    : name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'empresa-' + Date.now();

  let departments = [];
  if (Array.isArray(departmentsList) && departmentsList.length > 0) {
    departments = departmentsList.filter(d => d.trim().length > 0).map(d => ({
      name: d.trim(),
      description: `Área de ${d.trim()}. Procesos corporativos y normativas de nuestra dependencia.`
    }));
  } else {
    departments = [
      { name: 'Gerencia General', description: 'Dirección estratégica y objetivos corporativos.' },
      { name: 'Recursos Humanos', description: 'Talento humano, contratos, bienestar e inducción.' },
      { name: 'Operaciones & TI', description: 'Sistemas tecnológicos, infraestructura y logística.' },
      { name: 'Cafetería & Bienestar', description: 'Descanso, integración y cultura laboral.' }
    ];
  }

  const generatedNpcs = generateDepartmentLayout(departments);

  try {
    const company = await dbManager.createCompany({
      slug,
      name: name.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword: (adminPassword && adminPassword.trim()) ? adminPassword.trim() : 'admin123',
      status: 'active',
      employeeCountExpected: parseInt(employeeCountExpected, 10) || 25,
      departments: departments
    }, generatedNpcs);

    console.log(`[SuperAdmin] Empresa creada: ${name} (${slug})`);
    res.status(201).json({ success: true, company });
  } catch (err) {
    console.error('[SuperAdmin Error] creando empresa:', err);
    res.status(500).json({ error: 'Error creando empresa en base de datos' });
  }
});

// Cambiar estado de empresa (activar/suspender)
app.patch('/api/superadmin/companies/:companyId/status', async (req, res) => {
  const { companyId } = req.params;
  const { status } = req.body;
  try {
    await dbManager.updateCompanyStatus(companyId, status || 'active');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando estado de empresa' });
  }
});

// Eliminar empresa desde Super Administrador
app.delete('/api/superadmin/companies/:companyId', async (req, res) => {
  const { companyId } = req.params;
  try {
    await dbManager.deleteCompany(companyId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando empresa' });
  }
});

// ----------------------------------------------------------------
// LOGIN PARA ADMINISTRADOR DE EMPRESA (DASHBOARD)
// ----------------------------------------------------------------
app.post('/api/companies/:companyId/admin-login', async (req, res) => {
  const { companyId } = req.params;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const authResult = await dbManager.verifyCompanyAdmin(companyId, email.trim(), password.trim());
  if (!authResult) {
    return res.status(401).json({ error: 'Credenciales inválidas de administrador de empresa' });
  }
  if (authResult.error) {
    return res.status(403).json({ error: authResult.error });
  }

  res.json({ success: true, company: authResult.company });
});

// ----------------------------------------------------------------
// LOGIN PARA FUNCIONARIO / EMPLEADO (SEDE VIRTUAL 3D)
// ----------------------------------------------------------------
app.post('/api/companies/:companyId/employee-login', async (req, res) => {
  const { companyId } = req.params;
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Correo de funcionario requerido' });
  }

  const result = await dbManager.verifyEmployeeLogin(companyId, email.toLowerCase().trim(), (password || '').trim());
  if (!result) {
    return res.status(404).json({ error: 'Funcionario no registrado en esta empresa. Solicita acceso a tu administrador de RRHH.' });
  }
  if (result.error) {
    return res.status(401).json({
      error: result.error,
      terminated: result.terminated || false,
      suspended: result.suspended || false,
      terminationReason: result.terminationReason || null
    });
  }

  res.json({ success: true, employee: result.employee, company: result.company });
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
  const { name, email, role, department, color, password, gender, suitStyle, suitColor, tieColor, avatarStyle } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y correo requeridos' });
  }

  try {
    const employee = await dbManager.createEmployee(companyId, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: (password && password.trim()) ? password.trim() : '123456',
      role: role || 'Funcionario',
      department: department || 'General',
      color: suitColor || color || '#1e3a8a',
      gender: gender || 'male',
      suitStyle: suitStyle || 'formal_suit',
      suitColor: suitColor || color || '#1e3a8a',
      tieColor: tieColor || '#dc2626',
      avatarStyle: avatarStyle || (gender === 'female' ? 'executive_female' : 'executive_male')
    });
    res.status(201).json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ error: 'Error registrando funcionario en base de datos' });
  }
});

// Agregar una nueva dependencia a la oficina 3D
app.post('/api/companies/:companyId/departments', async (req, res) => {
  const { companyId } = req.params;
  const { name, description, leaderName, leaderRole, color, profile, furniture } = req.body;

  if (!name) return res.status(400).json({ error: 'Nombre de dependencia requerido' });

  try {
    const newDept = await dbManager.addDepartment(companyId, {
      name: name.trim(),
      description: description || `Área de ${name.trim()}`,
      leaderName,
      leaderRole,
      color,
      profile,
      furniture
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

// Configurar / Editar qué hace y qué dice el líder de una dependencia, perfil y mobiliario
app.put('/api/companies/:companyId/departments/:deptId', async (req, res) => {
  const { companyId, deptId } = req.params;
  const { name, leaderName, leaderRole, description, color, profile, furniture } = req.body;

  try {
    const updated = await dbManager.updateDepartment(companyId, deptId, {
      name,
      leaderName,
      leaderRole,
      description,
      color,
      profile,
      furniture
    });

    const updatedCompany = await dbManager.getCompanyBySlug(companyId);
    if (updatedCompany) {
      io.to(companyId).emit('office:rebuild_layout', updatedCompany.npcs);
    }

    res.json({ success: true, department: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando dependencia y mobiliario' });
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
// APIS DE RECURSOS HUMANOS Y TRÁMITES CORPORATIVOS (SIMULADOR DE VIDA REAL)
// ----------------------------------------------------------------

// 1. Listar solicitudes formales de la empresa
app.get('/api/companies/:companyId/hr/requests', async (req, res) => {
  const { companyId } = req.params;
  try {
    const requests = await dbManager.getHRRequests(companyId);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo solicitudes de RRHH' });
  }
});

// 2. Crear solicitud formal (Permiso, Vacaciones, Incapacidad, Descargo)
app.post('/api/companies/:companyId/hr/requests', async (req, res) => {
  const { companyId } = req.params;
  const { employeeEmail, type, title, reason, startDate, endDate } = req.body;

  if (!employeeEmail || !type || !title || !reason) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para radicar la solicitud' });
  }

  try {
    const newReq = await dbManager.createHRRequest({
      companySlug: companyId,
      employeeEmail: employeeEmail.trim().toLowerCase(),
      type,
      title,
      reason,
      startDate,
      endDate
    });

    if (!newReq) {
      return res.status(404).json({ error: 'No se encontró el funcionario o la empresa' });
    }

    // Notificar en tiempo real al canal de la empresa
    io.to(companyId).emit('hr:new_request', newReq);

    res.status(201).json({ success: true, request: newReq });
  } catch (err) {
    console.error('Error creando radicado RRHH:', err);
    res.status(500).json({ error: 'Error procesando radicado' });
  }
});

// 3. Resolver solicitud formal (Aprobar o Rechazar con Justificación)
app.patch('/api/companies/:companyId/hr/requests/:requestId', async (req, res) => {
  const { companyId, requestId } = req.params;
  const { status, adminNotes } = req.body;

  if (!status || !['APROBADO', 'RECHAZADO'].includes(status.toUpperCase())) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser APROBADO o RECHAZADO' });
  }

  try {
    const resolved = await dbManager.resolveHRRequest(companyId, requestId, status, adminNotes);
    if (!resolved) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Notificar resolución en tiempo real al empleado y sala
    io.to(companyId).emit('hr:request_resolved', resolved);

    res.json({ success: true, request: resolved });
  } catch (err) {
    console.error('Error resolviendo trámite:', err);
    res.status(500).json({ error: 'Error resolviendo solicitud' });
  }
});

// 4. Listar acciones disciplinarias / legales (Despidos, memorandos, etc.)
app.get('/api/companies/:companyId/hr/actions', async (req, res) => {
  const { companyId } = req.params;
  try {
    const actions = await dbManager.getHRActions(companyId);
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo historial laboral' });
  }
});

// 5. Ejecutar acción disciplinaria formal (Despido, Memorando, Suspensión, Reintegro)
app.post('/api/companies/:companyId/hr/actions', async (req, res) => {
  const { companyId } = req.params;
  const { employeeEmail, type, title, description, createdBy } = req.body;

  if (!employeeEmail || !type || !description) {
    return res.status(400).json({ error: 'Empleado, tipo y motivo requeridos' });
  }

  try {
    const action = await dbManager.executeHRAction({
      companySlug: companyId,
      employeeEmail: employeeEmail.trim().toLowerCase(),
      type,
      title: title || `Resolución de ${type}`,
      description,
      createdBy: createdBy || 'Recursos Humanos'
    });

    if (!action) {
      return res.status(404).json({ error: 'Funcionario no encontrado' });
    }

    // Si es un despido o suspensión, revocar acceso y desconectar de inmediato en el 3D
    if (type.toUpperCase() === 'DESPIDO' || type.toUpperCase() === 'SUSPENSION') {
      for (const sId in activePlayers) {
        if (activePlayers[sId].companyId === companyId && activePlayers[sId].email === employeeEmail.toLowerCase()) {
          io.to(sId).emit('player:expelled', {
            type: type.toUpperCase(),
            reason: description,
            date: new Date().toLocaleDateString('es-CO')
          });
          io.sockets.sockets.get(sId)?.disconnect(true);
          delete activePlayers[sId];
          io.to(companyId).emit('player:leave', sId);
        }
      }
    }

    io.to(companyId).emit('hr:action_executed', action);

    res.status(201).json({ success: true, action });
  } catch (err) {
    console.error('Error ejecutando acción RRHH:', err);
    res.status(500).json({ error: 'Error registrando acción disciplinaria' });
  }
});

// ----------------------------------------------------------------
// SOCKET.IO SALAS Y MULTIJUGADOR
// ----------------------------------------------------------------
const activePlayers = {};

io.on('connection', (socket) => {
  // Login / Ingreso de funcionario a la oficina 3D
  socket.on('player:join', async (data) => {
    let companyId = data.companyId || 'demo-corp';
    let company = await dbManager.getCompanyBySlug(companyId);

    if (!company) {
      const allCompanies = await dbManager.getCompanies();
      if (allCompanies && allCompanies.length > 0) {
        companyId = allCompanies[0].id;
        company = await dbManager.getCompanyBySlug(companyId);
      }
    }

    if (!company) {
      console.warn(`[Induction Warning] No se encontró ninguna empresa para ${data.companyId}`);
      return;
    }

    console.log(`[Induction] Intento de conexión en ${company.name}: ${data.email || data.name}`);

    const email = (data.email || '').toLowerCase().trim();
    const existingEmp = (company.employees && company.employees[email]) || null;

    if (!existingEmp) {
      socket.emit('player:error', {
        error: 'Funcionario no registrado en la nómina de esta empresa. Solicita a RRHH que te registre en el Dashboard.'
      });
      return;
    }

    if (existingEmp.status === 'TERMINATED') {
      socket.emit('player:expelled', {
        type: 'DESPIDO',
        reason: existingEmp.terminationReason || 'Contrato laboral finalizado',
        date: existingEmp.terminationDate || new Date().toLocaleDateString('es-CO')
      });
      return;
    }

    if (existingEmp.status === 'SUSPENDED') {
      socket.emit('player:error', {
        error: 'Tu usuario se encuentra en suspensión temporal. Comunícate con Recursos Humanos.'
      });
      return;
    }

    // Desconectar sesión previa si este mismo empleado ya estaba abierto en otro dispositivo/pestaña
    for (const oldSocketId in activePlayers) {
      const p = activePlayers[oldSocketId];
      if (p.companyId === companyId && p.email === email && oldSocketId !== socket.id) {
        console.log(`[Induction] Reemplazando sesión previa de ${email} (Socket ${oldSocketId})`);
        io.to(oldSocketId).emit('player:session_replaced', {
          message: 'Se ha iniciado sesión con tu cuenta desde otro dispositivo.'
        });
        socket.to(companyId).emit('player:left', oldSocketId);
        const oldSock = io.sockets.sockets.get(oldSocketId);
        if (oldSock) oldSock.leave(companyId);
        delete activePlayers[oldSocketId];
      }
    }

    socket.join(companyId);

    const empName = existingEmp.name;
    const empRole = existingEmp.role || 'Funcionario';
    const empDept = existingEmp.department || 'General';
    const empSuitColor = existingEmp.suitColor || existingEmp.color || '#1e3a8a';
    const empTieColor = existingEmp.tieColor || '#dc2626';
    const empGender = existingEmp.gender || ((existingEmp.avatarStyle === 'executive_female' || empName.toLowerCase().endsWith('a')) ? 'female' : 'male');
    const empAvatarStyle = existingEmp.avatarStyle || (empGender === 'female' ? 'executive_female' : 'executive_male');

    activePlayers[socket.id] = {
      id: socket.id,
      companyId: companyId,
      name: empName,
      email: email,
      role: empRole,
      department: empDept,
      color: empSuitColor,
      suitColor: empSuitColor,
      tieColor: empTieColor,
      gender: empGender,
      avatarStyle: empAvatarStyle,
      x: 0,
      y: 0,
      z: 5,
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
      // Marcar estado de llamada privada en el servidor
      receiver.inPrivateCall = targetSocketId;
      activePlayers[targetSocketId].inPrivateCall = socket.id;

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

      // Notificar al resto de la oficina para aislar su audio
      io.to(receiver.companyId).emit('player:call_state', { id: socket.id, inPrivateCall: true });
      io.to(receiver.companyId).emit('player:call_state', { id: targetSocketId, inPrivateCall: true });
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
    const player = activePlayers[socket.id];
    if (player) player.inPrivateCall = null;
    if (activePlayers[partnerId]) {
      activePlayers[partnerId].inPrivateCall = null;
      io.to(partnerId).emit('call:ended');
    }
    if (player) {
      io.to(player.companyId).emit('player:call_state', { id: socket.id, inPrivateCall: false });
      if (partnerId) io.to(player.companyId).emit('player:call_state', { id: partnerId, inPrivateCall: false });
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

// Induction - Dashboard Corporativo B2B & Módulo de Recursos Humanos (Simulador de Vida Real)
const companySelectDash = document.getElementById('companySelectDash');
const dashCompanyNameTitle = document.getElementById('dashCompanyNameTitle');
const metricEmployeesCount = document.getElementById('metricEmployeesCount');
const metricDeptsCount = document.getElementById('metricDeptsCount');
const metricExpectedCount = document.getElementById('metricExpectedCount');
const btnCopyEmployeeInvite = document.getElementById('btnCopyEmployeeInvite');
const btnAdminLogout = document.getElementById('btnAdminLogout');
const linkEnter3d = document.getElementById('linkEnter3d');

// Tabs
const tabBtnDepts = document.getElementById('tabBtnDepts');
const tabBtnEmployees = document.getElementById('tabBtnEmployees');
const tabBtnHR = document.getElementById('tabBtnHR');
const sectionDepts = document.getElementById('sectionDepts');
const sectionEmployees = document.getElementById('sectionEmployees');
const sectionHR = document.getElementById('sectionHR');
const hrPendingBadge = document.getElementById('hrPendingBadge');

// Grids y Tablas
const departmentsGrid = document.getElementById('departmentsGrid');
const employeesTableBody = document.getElementById('employeesTableBody');
const hrRequestsTableBody = document.getElementById('hrRequestsTableBody');
const hrActionsTableBody = document.getElementById('hrActionsTableBody');

// Modales Principales
const modalNewDept = document.getElementById('modalNewDept');
const openNewDeptModalBtn = document.getElementById('openNewDeptModalBtn');
const closeNewDeptBtn = document.getElementById('closeNewDeptBtn');
const formNewDept = document.getElementById('formNewDept');

const modalNewEmp = document.getElementById('modalNewEmp');
const openNewEmpModalBtn = document.getElementById('openNewEmpModalBtn');
const closeNewEmpBtn = document.getElementById('closeNewEmpBtn');
const formNewEmp = document.getElementById('formNewEmp');
const newEmpDeptSelect = document.getElementById('newEmpDeptSelect');

// Modal Login Admin Empresa
const companyAdminLoginModal = document.getElementById('companyAdminLoginModal');
const loginModalCompanyName = document.getElementById('loginModalCompanyName');
const formCompanyAdminLogin = document.getElementById('formCompanyAdminLogin');
const compLoginEmail = document.getElementById('compLoginEmail');
const compLoginPass = document.getElementById('compLoginPass');

// Modales de RRHH (Trámites y Acciones Disciplinarias)
const modalResolveRequest = document.getElementById('modalResolveRequest');
const closeResolveModalBtn = document.getElementById('closeResolveModalBtn');
const resolveModalTitle = document.getElementById('resolveModalTitle');
const resolveEmployeeName = document.getElementById('resolveEmployeeName');
const resolveEmployeeEmail = document.getElementById('resolveEmployeeEmail');
const resolveType = document.getElementById('resolveType');
const resolvePeriod = document.getElementById('resolvePeriod');
const resolveReason = document.getElementById('resolveReason');
const resolveRequestId = document.getElementById('resolveRequestId');
const resolveAdminNotes = document.getElementById('resolveAdminNotes');
const btnApproveRequest = document.getElementById('btnApproveRequest');
const btnRejectRequest = document.getElementById('btnRejectRequest');

const modalHRAction = document.getElementById('modalHRAction');
const openHRActionModalBtn = document.getElementById('openHRActionModalBtn');
const closeHRActionModalBtn = document.getElementById('closeHRActionModalBtn');
const formHRAction = document.getElementById('formHRAction');
const actionEmployeeSelect = document.getElementById('actionEmployeeSelect');
const actionTypeSelect = document.getElementById('actionTypeSelect');
const actionTitle = document.getElementById('actionTitle');
const actionDescription = document.getElementById('actionDescription');

let currentCompanyId = null;
let currentCompanyData = null;
let currentRequests = [];

// Obtener slug de la URL (?company=slug)
const urlParams = new URLSearchParams(window.location.search);
const requestedSlug = urlParams.get('company');

// 1. Manejo de Pestañas
function switchTab(target) {
  tabBtnDepts.classList.remove('active');
  tabBtnEmployees.classList.remove('active');
  tabBtnHR.classList.remove('active');

  sectionDepts.classList.add('hidden');
  sectionEmployees.classList.add('hidden');
  sectionHR.classList.add('hidden');

  if (target === 'depts') {
    tabBtnDepts.classList.add('active');
    sectionDepts.classList.remove('hidden');
  } else if (target === 'employees') {
    tabBtnEmployees.classList.add('active');
    sectionEmployees.classList.remove('hidden');
  } else if (target === 'hr') {
    tabBtnHR.classList.add('active');
    sectionHR.classList.remove('hidden');
    loadHRData(currentCompanyId);
  }
}

tabBtnDepts.addEventListener('click', () => switchTab('depts'));
tabBtnEmployees.addEventListener('click', () => switchTab('employees'));
tabBtnHR.addEventListener('click', () => switchTab('hr'));

// 2. Inicializar Dashboard
async function initDashboard() {
  try {
    const res = await fetch('/api/companies');
    const companies = await res.json();
    companySelectDash.innerHTML = '';

    companies.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.departmentCount || 0} dep.)`;
      companySelectDash.appendChild(opt);
    });

    if (requestedSlug && companies.some(c => c.id === requestedSlug)) {
      currentCompanyId = requestedSlug;
      companySelectDash.value = requestedSlug;
    } else if (companies.length > 0) {
      currentCompanyId = companies[0].id;
    }

    if (currentCompanyId) {
      checkCompanyAuthAndLoad(currentCompanyId);
    }
  } catch (err) {
    console.error('Error inicializando dashboard:', err);
  }
}

// 3. Comprobar Autenticación del Administrador
function checkCompanyAuthAndLoad(companyId) {
  const authKey = 'comp_auth_' + companyId;
  const isAuth = sessionStorage.getItem(authKey);

  if (isAuth === 'true') {
    companyAdminLoginModal.classList.add('hidden');
    loadDashboardData(companyId);
  } else {
    loginModalCompanyName.textContent = `Acceso a ${companyId.toUpperCase()}`;
    companyAdminLoginModal.classList.remove('hidden');
  }
}

// 4. Login de Administrador de Empresa
formCompanyAdminLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = compLoginEmail.value.trim();
  const password = compLoginPass.value.trim();

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('comp_auth_' + currentCompanyId, 'true');
      companyAdminLoginModal.classList.add('hidden');
      formCompanyAdminLogin.reset();
      loadDashboardData(currentCompanyId);
    } else {
      alert(data.error || 'Credenciales de empresa incorrectas.');
    }
  } catch (err) {
    alert('Error conectando con el servidor.');
  }
});

// Logout de Empresa
btnAdminLogout.addEventListener('click', () => {
  sessionStorage.removeItem('comp_auth_' + currentCompanyId);
  location.reload();
});

companySelectDash.addEventListener('change', () => {
  currentCompanyId = companySelectDash.value;
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('company', currentCompanyId);
  window.history.pushState({}, '', newUrl);
  checkCompanyAuthAndLoad(currentCompanyId);
});

// 5. Cargar Datos Generales de la Empresa
async function loadDashboardData(companyId) {
  try {
    const res = await fetch(`/api/companies/${companyId}`);
    const company = await res.json();
    if (!company) return;

    currentCompanyData = company;
    dashCompanyNameTitle.textContent = company.name;
    linkEnter3d.href = `/?company=${company.id}`;

    const employees = Object.values(company.employees || {});
    const npcs = company.npcs || [];

    // Métricas
    metricEmployeesCount.textContent = employees.length;
    metricDeptsCount.textContent = npcs.length;
    metricExpectedCount.textContent = company.employeeCountExpected || 25;

    // Render Dependencias 3D
    departmentsGrid.innerHTML = '';
    npcs.forEach(dept => {
      const card = document.createElement('div');
      card.className = 'dept-card-item';
      card.style.setProperty('--dept-color', dept.color || '#3b82f6');
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h4>${dept.department}</h4>
          <button class="btn-delete" onclick="deleteDept('${dept.id}')">Eliminar</button>
        </div>
        <p>${dept.info || 'Sin descripción'}</p>
        <div class="dept-card-meta">
          <span>👤 ${dept.name}</span>
          <span style="color: var(--text-muted);">${dept.role}</span>
        </div>
      `;
      departmentsGrid.appendChild(card);
    });

    // Select de dependencias para nuevo empleado
    newEmpDeptSelect.innerHTML = '';
    npcs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.department;
      opt.textContent = d.department;
      newEmpDeptSelect.appendChild(opt);
    });

    // Select de empleados para acciones disciplinarias
    actionEmployeeSelect.innerHTML = '';
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.email;
      opt.textContent = `${emp.name} (${emp.email}) - ${emp.role}`;
      actionEmployeeSelect.appendChild(opt);
    });

    // Render Tabla de Funcionarios con Estado Laboral de Vida Real
    renderEmployeesTable(employees);

    // Cargar datos de RRHH
    loadHRData(companyId);

  } catch (err) {
    console.error('Error cargando datos de empresa:', err);
  }
}

// Render Tabla de Empleados
function renderEmployeesTable(employees) {
  employeesTableBody.innerHTML = '';
  if (employees.length === 0) {
    employeesTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
          No hay funcionarios registrados aún. Haz clic en "+ Registrar Funcionario".
        </td>
      </tr>
    `;
    return;
  }

  employees.forEach(emp => {
    const tr = document.createElement('tr');

    // Estado laboral badge
    let statusBadge = '<span class="badge-status badge-status-active">🟢 Activo</span>';
    if (emp.status === 'VACATION') {
      statusBadge = '<span class="badge-status badge-status-vacation">🏖️ Vacaciones</span>';
    } else if (emp.status === 'ON_LEAVE') {
      statusBadge = '<span class="badge-status badge-status-leave">🟡 De Permiso</span>';
    } else if (emp.status === 'TERMINATED') {
      statusBadge = '<span class="badge-status badge-status-terminated">🛑 Despedido</span>';
    } else if (emp.status === 'SUSPENDED') {
      statusBadge = '<span class="badge-status badge-status-suspended">⏸️ Suspendido</span>';
    }

    const isTerminated = emp.status === 'TERMINATED';
    const isFemale = (emp.gender === 'female' || emp.avatarStyle === 'executive_female' || (emp.name && (emp.name.toLowerCase().includes('yenis') || emp.name.toLowerCase().includes('maria') || emp.name.toLowerCase().endsWith('a'))));
    const avatarIcon = isFemale ? '👩‍💼' : '👨‍💼';
    const suitDesc = isFemale ? 'Ejecutiva Formal' : 'Ejecutivo Formal';

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">${avatarIcon}</span>
          <div>
            <strong>${emp.name}</strong>
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; margin-top: 2px;">
              <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${emp.color || '#1e3a8a'};"></span>
              <span>${suitDesc}</span>
            </div>
          </div>
        </div>
      </td>
      <td><span style="color: #93c5fd;">${emp.email}</span></td>
      <td><code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: #34d399;">${emp.password || '123456'}</code></td>
      <td>${emp.role}</td>
      <td><span class="badge" style="font-size: 11px;">${emp.department || 'General'}</span></td>
      <td>${statusBadge}</td>
      <td>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn-goto-3d" style="padding: 4px 8px; font-size: 11px; background: #3b82f6;" onclick="copyEmployeeCard('${emp.name}', '${emp.email}', '${emp.password || '123456'}')">
            📋 Copiar Acceso
          </button>
          ${isTerminated ? `
            <button class="btn-goto-3d" style="padding: 4px 8px; font-size: 11px; background: #10b981;" onclick="openRehireModal('${emp.email}')">
              ✅ Reintegrar
            </button>
          ` : `
            <button class="btn-delete" style="padding: 4px 8px; font-size: 11px; border-color: #f59e0b; color: #fcd34d; background: rgba(245, 158, 11, 0.15);" onclick="openSanctionModal('${emp.email}')">
              ⚖️ Sancionar / Despedir
            </button>
          `}
          <button class="btn-delete" style="padding: 4px 8px; font-size: 11px;" onclick="deleteEmployee('${emp.email}')">Eliminar</button>
        </div>
      </td>
    `;
    employeesTableBody.appendChild(tr);
  });
}

// 6. Cargar Módulo de Recursos Humanos & Trámites
async function loadHRData(companyId) {
  try {
    // 1. Solicitudes y Radicados
    const reqRes = await fetch(`/api/companies/${companyId}/hr/requests`);
    const requests = await reqRes.json();
    currentRequests = Array.isArray(requests) ? requests : [];

    const pendingCount = currentRequests.filter(r => r.status === 'PENDIENTE').length;
    hrPendingBadge.textContent = pendingCount;
    hrPendingBadge.style.background = pendingCount > 0 ? '#ef4444' : 'rgba(255,255,255,0.2)';

    renderHRRequestsTable(currentRequests);

    // 2. Historial de Decisiones Laborales y Despidos
    const actRes = await fetch(`/api/companies/${companyId}/hr/actions`);
    const actions = await actRes.json();
    renderHRActionsTable(Array.isArray(actions) ? actions : []);

  } catch (err) {
    console.error('Error cargando trámites de RRHH:', err);
  }
}

// Render Tabla de Solicitudes y Radicados
function renderHRRequestsTable(requests) {
  hrRequestsTableBody.innerHTML = '';
  if (requests.length === 0) {
    hrRequestsTableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">
          No hay solicitudes o radicados radicados por los funcionarios actualmente.
        </td>
      </tr>
    `;
    return;
  }

  requests.forEach(r => {
    const tr = document.createElement('tr');
    const createdDate = new Date(r.createdAt).toLocaleDateString('es-CO');

    let datesText = 'N/A';
    if (r.startDate && r.endDate) {
      datesText = `${new Date(r.startDate).toLocaleDateString('es-CO')} al ${new Date(r.endDate).toLocaleDateString('es-CO')}`;
    } else if (r.startDate) {
      datesText = `Desde ${new Date(r.startDate).toLocaleDateString('es-CO')}`;
    }

    let statusBadge = '<span class="badge-status badge-pending">🟡 PENDIENTE</span>';
    if (r.status === 'APROBADO') {
      statusBadge = '<span class="badge-status badge-approved">🟢 APROBADO</span>';
    } else if (r.status === 'RECHAZADO') {
      statusBadge = '<span class="badge-status badge-rejected">🔴 RECHAZADO</span>';
    }

    const empName = r.employee?.name || r.employeeId;
    const empEmail = r.employee?.email || '';

    tr.innerHTML = `
      <td><span class="radicado-tag">${r.radicado}</span></td>
      <td style="font-size: 12px; color: var(--text-muted);">${createdDate}</td>
      <td><strong>${empName}</strong><br><small style="color: var(--text-muted); font-size: 11px;">${empEmail}</small></td>
      <td><span class="badge" style="font-size: 11px;">${r.type}</span></td>
      <td style="font-size: 12px;">${datesText}</td>
      <td style="max-width: 200px; font-size: 13px;">${r.reason}</td>
      <td>${statusBadge}</td>
      <td style="font-size: 12px; color: #94a3b8; max-width: 180px;">${r.adminNotes || '<em>Pendiente por dictamen</em>'}</td>
      <td>
        ${r.status === 'PENDIENTE' ? `
          <button class="btn-primary" style="padding: 6px 10px; font-size: 12px; background: #3b82f6;" onclick="openResolveModal('${r.id}')">
            Revisar & Resolver ⚖️
          </button>
        ` : `
          <button class="btn-goto-3d" style="padding: 4px 8px; font-size: 11px; background: rgba(255,255,255,0.08);" onclick="openResolveModal('${r.id}')">
            Ver Dictamen 📄
          </button>
        `}
      </td>
    `;
    hrRequestsTableBody.appendChild(tr);
  });
}

// Render Historial de Acciones Disciplinarias
function renderHRActionsTable(actions) {
  hrActionsTableBody.innerHTML = '';
  if (actions.length === 0) {
    hrActionsTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
          No se registran llamados de atención, memorandos o despidos en la base de datos.
        </td>
      </tr>
    `;
    return;
  }

  actions.forEach(a => {
    const tr = document.createElement('tr');
    const dateStr = new Date(a.createdAt || a.effectiveDate).toLocaleDateString('es-CO');

    let typeBadge = `<span class="badge-status badge-status-leave">${a.type}</span>`;
    if (a.type === 'DESPIDO') {
      typeBadge = `<span class="badge-status badge-status-terminated">🛑 DESPIDO</span>`;
    } else if (a.type === 'MEMORANDO') {
      typeBadge = `<span class="badge-status badge-pending">⚠️ MEMORANDO</span>`;
    } else if (a.type === 'REINTEGRO') {
      typeBadge = `<span class="badge-status badge-approved">✅ REINTEGRO</span>`;
    }

    const empName = a.employee?.name || a.employeeName || a.employeeEmail || a.employeeId;

    tr.innerHTML = `
      <td style="font-size: 12px; color: var(--text-muted);">${dateStr}</td>
      <td><strong>${empName}</strong></td>
      <td>${typeBadge}</td>
      <td>
        <strong>${a.title}</strong>
        <p style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">${a.description}</p>
      </td>
      <td style="font-size: 12px; color: var(--text-muted);">${a.createdBy || 'Recursos Humanos'}</td>
    `;
    hrActionsTableBody.appendChild(tr);
  });
}

// 7. Modal de Resolución de Solicitud (Aprobar o Rechazar)
window.openResolveModal = function(requestId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  resolveRequestId.value = req.id;
  resolveModalTitle.textContent = `Radicado: ${req.radicado}`;
  resolveEmployeeName.textContent = req.employee?.name || req.employeeId;
  resolveEmployeeEmail.textContent = req.employee?.email || '';
  resolveType.textContent = req.type;
  resolveReason.textContent = req.reason;

  let datesText = 'No aplica rango específico';
  if (req.startDate && req.endDate) {
    datesText = `${new Date(req.startDate).toLocaleDateString('es-CO')} al ${new Date(req.endDate).toLocaleDateString('es-CO')}`;
  } else if (req.startDate) {
    datesText = `Desde ${new Date(req.startDate).toLocaleDateString('es-CO')}`;
  }
  resolvePeriod.textContent = datesText;

  resolveAdminNotes.value = req.adminNotes || '';
  modalResolveRequest.classList.remove('hidden');
};

closeResolveModalBtn.addEventListener('click', () => modalResolveRequest.classList.add('hidden'));

async function resolveRequestSubmit(status) {
  const id = resolveRequestId.value;
  const notes = resolveAdminNotes.value.trim();

  if (!notes) {
    alert('Por favor escribe un dictamen u observación oficial de RRHH para sustentar la decisión.');
    return;
  }

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/hr/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes: notes })
    });

    const data = await res.json();
    if (data.success) {
      modalResolveRequest.classList.add('hidden');
      alert(`¡Solicitud ${status} con éxito!\nDictamen registrado oficialmente en la base de datos.`);
      await loadDashboardData(currentCompanyId);
    } else {
      alert(data.error || 'Error resolviendo la solicitud');
    }
  } catch (err) {
    alert('Error conectando con el servidor');
  }
}

btnApproveRequest.addEventListener('click', () => resolveRequestSubmit('APROBADO'));
btnRejectRequest.addEventListener('click', () => resolveRequestSubmit('RECHAZADO'));

// 8. Modal de Acciones Disciplinarias (Despidos, Memorandos, Suspensiones)
openHRActionModalBtn.addEventListener('click', () => {
  formHRAction.reset();
  modalHRAction.classList.remove('hidden');
});

closeHRActionModalBtn.addEventListener('click', () => modalHRAction.classList.add('hidden'));

window.openSanctionModal = function(email) {
  formHRAction.reset();
  actionEmployeeSelect.value = email;
  actionTypeSelect.value = 'DESPIDO';
  modalHRAction.classList.remove('hidden');
};

window.openRehireModal = function(email) {
  formHRAction.reset();
  actionEmployeeSelect.value = email;
  actionTypeSelect.value = 'REINTEGRO';
  actionTitle.value = 'Reincorporación Laboral y Restablecimiento de Credenciales';
  actionDescription.value = 'El funcionario es reintegrado formalmente a sus funciones con acceso pleno a la sede virtual 3D.';
  modalHRAction.classList.remove('hidden');
};

formHRAction.addEventListener('submit', async (e) => {
  e.preventDefault();
  const employeeEmail = actionEmployeeSelect.value;
  const type = actionTypeSelect.value;
  const title = actionTitle.value.trim();
  const description = actionDescription.value.trim();

  if (type === 'DESPIDO') {
    const confirmFire = confirm(`⚠️ ¿CONFIRMAS EL DESPIDO DE ${employeeEmail}?\n\nAl ejecutar esta acción:\n1. El funcionario quedará marcado como DESPEDIDO en PostgreSQL.\n2. Su carné de acceso será revocado.\n3. Si está conectado en la oficina 3D, será expulsado inmediatamente.`);
    if (!confirmFire) return;
  }

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/hr/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeEmail,
        type,
        title,
        description,
        createdBy: 'Recursos Humanos'
      })
    });

    const data = await res.json();
    if (data.success) {
      modalHRAction.classList.add('hidden');
      formHRAction.reset();
      alert(`¡Resolución de ${type} ejecutada y notificada exitosamente!`);
      await loadDashboardData(currentCompanyId);
    } else {
      alert(data.error || 'Error ejecutando resolución');
    }
  } catch (err) {
    alert('Error conectando con el servidor');
  }
});

// 9. Acciones Generales: Copiar accesos, Crear Dependencias, etc.
btnCopyEmployeeInvite.addEventListener('click', () => {
  if (!currentCompanyId) return;
  const inviteLink = `${window.location.origin}/?company=${currentCompanyId}`;
  navigator.clipboard.writeText(inviteLink).then(() => {
    alert(`¡Link de acceso para empleados copiado!\n\n${inviteLink}\n\nComparte este enlace con tus funcionarios para que entren a su sede 3D.`);
  });
});

window.copyEmployeeCard = function(empName, empEmail, empPass) {
  const companyName = currentCompanyData ? currentCompanyData.name : 'tu empresa';
  const accessLink = `${window.location.origin}/?company=${currentCompanyId}`;

  const message = `👋 ¡Hola ${empName}!
Bienvenido(a) a la Sede Virtual 3D de *${companyName}*.

Aquí tienes tus credenciales para ingresar a tu oficina:
👉 *Link de la Sede 3D:* ${accessLink}
👤 *Usuario:* ${empEmail}
🔒 *Contraseña:* ${empPass}

Ingresa, elige el color de tu avatar y conéctate con tus compañeros. 🚀`;

  navigator.clipboard.writeText(message).then(() => {
    alert(`¡Credenciales de ${empName} copiadas al portapapeles!\nPuedes enviárselas directamente por chat o correo.`);
  });
};

openNewDeptModalBtn.addEventListener('click', () => modalNewDept.classList.remove('hidden'));
closeNewDeptBtn.addEventListener('click', () => modalNewDept.classList.add('hidden'));

openNewEmpModalBtn.addEventListener('click', () => modalNewEmp.classList.remove('hidden'));
closeNewEmpBtn.addEventListener('click', () => modalNewEmp.classList.add('hidden'));

// Crear Dependencia
formNewDept.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('newDeptName').value.trim();
  const leaderName = document.getElementById('newDeptLeader').value.trim();
  const leaderRole = document.getElementById('newDeptRole').value.trim();
  const description = document.getElementById('newDeptDesc').value.trim();
  const color = document.getElementById('newDeptColor').value;

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, leaderName, leaderRole, description, color })
    });
    const data = await res.json();
    if (data.success) {
      modalNewDept.classList.add('hidden');
      formNewDept.reset();
      await loadDashboardData(currentCompanyId);
      alert('¡Dependencia construida en el mundo 3D!');
    }
  } catch (err) {
    alert('Error creando dependencia');
  }
});

// Eliminar Dependencia
window.deleteDept = async function(deptId) {
  if (!confirm('¿Seguro que deseas eliminar esta dependencia y su oficina 3D?')) return;
  try {
    await fetch(`/api/companies/${currentCompanyId}/departments/${deptId}`, { method: 'DELETE' });
    await loadDashboardData(currentCompanyId);
  } catch (err) {
    alert('Error eliminando dependencia');
  }
};

// Manejo interactivo de selección de género en el modal
const pillGenderMale = document.getElementById('pillGenderMale');
const pillGenderFemale = document.getElementById('pillGenderFemale');
if (pillGenderMale && pillGenderFemale) {
  pillGenderMale.addEventListener('click', () => {
    pillGenderMale.classList.add('active');
    pillGenderMale.style.background = 'rgba(59, 130, 246, 0.2)';
    pillGenderMale.style.borderColor = '#3b82f6';
    pillGenderFemale.classList.remove('active');
    pillGenderFemale.style.background = 'rgba(30, 41, 59, 0.4)';
    pillGenderFemale.style.borderColor = 'rgba(255,255,255,0.1)';
    const radio = pillGenderMale.querySelector('input');
    if (radio) radio.checked = true;
  });

  pillGenderFemale.addEventListener('click', () => {
    pillGenderFemale.classList.add('active');
    pillGenderFemale.style.background = 'rgba(236, 72, 153, 0.2)';
    pillGenderFemale.style.borderColor = '#ec4899';
    pillGenderMale.classList.remove('active');
    pillGenderMale.style.background = 'rgba(30, 41, 59, 0.4)';
    pillGenderMale.style.borderColor = 'rgba(255,255,255,0.1)';
    const radio = pillGenderFemale.querySelector('input');
    if (radio) radio.checked = true;
  });
}

// Registrar Funcionario con Personaje y Ropa Ejecutiva
formNewEmp.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('newEmpName').value.trim();
  const email = document.getElementById('newEmpEmail').value.trim();
  const password = document.getElementById('newEmpPassword').value.trim();
  const department = newEmpDeptSelect.value;
  const role = document.getElementById('newEmpRole').value.trim();

  // Opciones de Personaje Ejecutivo
  const genderRadio = document.querySelector('input[name="newEmpGender"]:checked');
  const gender = genderRadio ? genderRadio.value : 'male';
  const suitStyleEl = document.getElementById('newEmpSuitStyle');
  const suitStyle = suitStyleEl ? suitStyleEl.value : 'formal_suit';
  const suitColorRadio = document.querySelector('input[name="newEmpSuitColor"]:checked');
  const suitColor = suitColorRadio ? suitColorRadio.value : '#1e3a8a';
  const tieColorEl = document.getElementById('newEmpTieColor');
  const tieColor = tieColorEl ? tieColorEl.value : '#dc2626';

  const avatarStyle = gender === 'female' ? 'executive_female' : 'executive_male';

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        department,
        role,
        color: suitColor,
        suitColor,
        tieColor,
        gender,
        suitStyle,
        avatarStyle
      })
    });
    const data = await res.json();
    if (data.success) {
      modalNewEmp.classList.add('hidden');
      formNewEmp.reset();
      await loadDashboardData(currentCompanyId);
      alert(`¡Funcionario "${name}" registrado exitosamente con su atuendo ejecutivo corporativo!`);
    } else {
      alert(data.error || 'Error al registrar funcionario');
    }
  } catch (err) {
    alert('Error registrando funcionario');
  }
});

// Eliminar Funcionario
window.deleteEmployee = async function(email) {
  if (!confirm(`¿Deseas dar de baja al funcionario con correo ${email}?`)) return;
  try {
    await fetch(`/api/companies/${currentCompanyId}/employees/${encodeURIComponent(email)}`, { method: 'DELETE' });
    await loadDashboardData(currentCompanyId);
  } catch (err) {
    alert('Error eliminando funcionario');
  }
};

// Iniciar
initDashboard();

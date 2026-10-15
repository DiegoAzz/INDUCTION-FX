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
      const profileBadge = getProfileBadge(dept.profile || 'gerencia');
      const furnitureCount = Array.isArray(dept.furniture) ? dept.furniture.length : 0;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <h4 style="margin-bottom: 4px;">${escapeHtml(dept.department)}</h4>
            ${profileBadge}
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
            <button class="btn-primary" style="padding: 4px 10px; font-size: 11px; background: #8b5cf6;" onclick="openOfficeBuilderModal('${escapeHtml(dept.id)}')">🛠️ Armar Oficina</button>
            <button class="btn-primary" style="padding: 4px 10px; font-size: 11px; background: #3b82f6;" onclick="openEditDeptModal('${escapeHtml(dept.id)}')">⚙️ Configurar</button>
            <button class="btn-delete" style="padding: 4px 10px; font-size: 11px;" onclick="deleteDept('${escapeHtml(dept.id)}')">Eliminar</button>
          </div>
        </div>
        <p style="font-size: 12px; margin: 8px 0; color: #cbd5e1; line-height: 1.4;">
          <strong>💬 Diálogo 3D:</strong> "${escapeHtml(dept.info || 'Sin diálogo')}"
        </p>
        <div class="dept-card-meta">
          <span>👤 <strong>${escapeHtml(dept.name)}</strong></span>
          <span style="color: var(--text-muted); font-size: 11px;">${escapeHtml(dept.role)}</span>
          <span style="font-size: 11px; color: #c084fc; font-weight: 600;">🪑 ${furnitureCount} muebles instalados</span>
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
  const profile = document.getElementById('newDeptProfile') ? document.getElementById('newDeptProfile').value : 'gerencia';
  const color = document.getElementById('newDeptColor').value;

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, leaderName, leaderRole, description, color, profile })
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

// Modal Configurar / Editar Funcionario Líder y Diálogo
const modalEditDept = document.getElementById('modalEditDept');
const formEditDept = document.getElementById('formEditDept');
const closeEditDeptBtn = document.getElementById('closeEditDeptBtn');
const editDeptId = document.getElementById('editDeptId');
const editDeptName = document.getElementById('editDeptName');
const editDeptLeader = document.getElementById('editDeptLeader');
const editDeptRole = document.getElementById('editDeptRole');
const editDeptDesc = document.getElementById('editDeptDesc');
const editDeptProfile = document.getElementById('editDeptProfile');
const editDeptColor = document.getElementById('editDeptColor');

if (closeEditDeptBtn) {
  closeEditDeptBtn.addEventListener('click', () => modalEditDept.classList.add('hidden'));
}

window.openEditDeptModal = function(deptId) {
  if (!currentCompanyData || !currentCompanyData.npcs) return;
  const target = currentCompanyData.npcs.find(n => n.id === deptId);
  if (!target) return;

  editDeptId.value = target.id;
  editDeptName.value = target.department || '';
  editDeptLeader.value = target.name || '';
  editDeptRole.value = target.role || '';
  editDeptDesc.value = target.info || '';
  if (editDeptProfile) editDeptProfile.value = target.profile || 'gerencia';
  editDeptColor.value = target.color || '#3B82F6';

  modalEditDept.classList.remove('hidden');
};

if (formEditDept) {
  formEditDept.addEventListener('submit', async (e) => {
    e.preventDefault();
    const deptId = editDeptId.value;
    const name = editDeptName.value.trim();
    const leaderName = editDeptLeader.value.trim();
    const leaderRole = editDeptRole.value.trim();
    const description = editDeptDesc.value.trim();
    const profile = editDeptProfile ? editDeptProfile.value : 'gerencia';
    const color = editDeptColor.value;

    try {
      const res = await fetch(`/api/companies/${currentCompanyId}/departments/${deptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, leaderName, leaderRole, description, color, profile })
      });
      const data = await res.json();
      if (data.success) {
        modalEditDept.classList.add('hidden');
        await loadDashboardData(currentCompanyId);
        alert('¡Configuración de funcionario y diálogo 3D guardados con éxito!');
      } else {
        alert(data.error || 'Error al actualizar funcionario');
      }
    } catch (err) {
      alert('Error de conexión al actualizar funcionario');
    }
  });
}

// ----------------------------------------------------
// SISTEMA DE ESTUDIO DE DISEÑO Y DECORACIÓN DE OFICINAS 3D (OFFICE BUILDER)
// ----------------------------------------------------

const FURNITURE_CATALOG = {
  // Puestos & Mesas
  executive_desk: { id: 'executive_desk', cat: 'desks', name: 'Escritorio Caoba Ejecutivo', icon: '💼', w: 6, d: 3, color: '#78350f', desc: 'Madera oscura noble con detalles dorados y cuero' },
  tech_desk: { id: 'tech_desk', cat: 'desks', name: 'Workstation Tech / Dev', icon: '💻', w: 5, d: 2, color: '#334155', desc: 'Mesa ergonómica moderna con pasacables' },
  creative_table: { id: 'creative_table', cat: 'desks', name: 'Mesa Creativa & Diseño', icon: '🎨', w: 5, d: 3, color: '#d97706', desc: 'Mesa amplia de dibujo con tapete y portalápices' },
  reception_counter: { id: 'reception_counter', cat: 'desks', name: 'Mostrador de Recepción', icon: '🛎️', w: 7, d: 2, color: '#b45309', desc: 'Mostrador curvo frontal con panel LED' },
  meeting_table: { id: 'meeting_table', cat: 'desks', name: 'Mesa de Juntas Redonda', icon: '⭕', w: 3, d: 3, color: '#1e293b', desc: 'Mesa circular para reuniones rápidas' },

  // Asientos
  executive_chair: { id: 'executive_chair', cat: 'chairs', name: 'Sillón Presidencial Cuero', icon: '💺', w: 1, d: 1, color: '#0f172a', desc: 'Cuero negro acolchado de alto espaldar' },
  mesh_chair: { id: 'mesh_chair', cat: 'chairs', name: 'Silla Ergonómica Mesh', icon: '🪑', w: 1, d: 1, color: '#1e3a8a', desc: 'Malla transpirable con soporte lumbar' },
  guest_chairs: { id: 'guest_chairs', cat: 'chairs', name: '2 Sillas Confidenciales Visita', icon: '👥', w: 3, d: 1, color: '#1e293b', desc: 'Par de asientos para clientes o descargos' },
  lounge_sofa: { id: 'lounge_sofa', cat: 'chairs', name: 'Sofá Ejecutivo 2 Plazas', icon: '🛋️', w: 3, d: 1, color: '#f8fafc', desc: 'Cuero blanco de espera y descanso' },
  visitor_armchair: { id: 'visitor_armchair', cat: 'chairs', name: 'Sillón Club Individual', icon: '🛋️', w: 1, d: 1, color: '#475569', desc: 'Sillón individual acolchado' },

  // Hardware y Tecnología
  ultrawide_monitor: { id: 'ultrawide_monitor', cat: 'tech', name: 'Monitor Curvo Ultrawide 49"', icon: '🖥️', w: 3, d: 1, color: '#06b6d4', desc: 'Pantalla curva con métricas y código' },
  dual_monitor: { id: 'dual_monitor', cat: 'tech', name: 'Setup Dual Monitor Tech', icon: '🖥️', w: 3, d: 1, color: '#3b82f6', desc: 'Dos monitores articulados en ángulo' },
  executive_laptop_screen: { id: 'executive_laptop_screen', cat: 'tech', name: 'Monitor 4K + Laptop Ejecutiva', icon: '💻', w: 2, d: 1, color: '#8b5cf6', desc: 'Pantalla ultra-slim con portátil abierto' },
  server_rack: { id: 'server_rack', cat: 'tech', name: 'Servidor Rack TI / Cloud', icon: '🖲️', w: 1, d: 1, color: '#09090b', desc: 'Torre con LEDs parpadeantes de red' },
  smart_tv: { id: 'smart_tv', cat: 'tech', name: 'Smart TV / Dashboard Pared', icon: '📺', w: 4, d: 1, color: '#1e293b', desc: 'Pantalla corporativa para KPIs' },

  // Archivo y Organización
  file_cabinet: { id: 'file_cabinet', cat: 'storage', name: 'Archivador Metálico Legal', icon: '🗄️', w: 1, d: 2, color: '#475569', desc: 'Expedientes confidenciales con cerradura' },
  bookshelf: { id: 'bookshelf', cat: 'storage', name: 'Biblioteca Ejecutiva & Trofeo', icon: '📚', w: 3, d: 1, color: '#78350f', desc: 'Estantería de caoba con libros y copa' },
  whiteboard: { id: 'whiteboard', cat: 'storage', name: 'Pizarra Kanban / Scrum', icon: '📋', w: 4, d: 1, color: '#f8fafc', desc: 'Pizarra con notas Post-It de colores' },
  safe_box: { id: 'safe_box', cat: 'storage', name: 'Caja Fuerte de Seguridad', icon: '🔒', w: 1, d: 1, color: '#0f172a', desc: 'Caja blindada con cerradura electrónica' },

  // Bienestar y Confort
  water_cooler: { id: 'water_cooler', cat: 'decor', name: 'Dispensador de Agua', icon: '💧', w: 1, d: 1, color: '#38bdf8', desc: 'Botellón de agua fresca y caliente' },
  coffee_station: { id: 'coffee_station', cat: 'decor', name: 'Estación de Café & Té', icon: '☕', w: 2, d: 1, color: '#92400e', desc: 'Cafetera espresso y tazas' },
  office_plant: { id: 'office_plant', cat: 'decor', name: 'Planta Tropical Ficus', icon: '🌿', w: 1, d: 1, color: '#16a34a', desc: 'Maceta cerámica con follaje vivo' },
  diploma_wall: { id: 'diploma_wall', cat: 'decor', name: 'Certificados & Cuadro Arte', icon: '🖼️', w: 2, d: 1, color: '#f59e0b', desc: 'Cuadros corporativos para mampara' }
};

const PROFILE_TEMPLATES = {
  gerencia: [
    { id: 'f-1', type: 'executive_desk', x: 0, z: 0, rot: 0 },
    { id: 'f-2', type: 'executive_chair', x: 0, z: -1.8, rot: 0 },
    { id: 'f-3', type: 'executive_laptop_screen', x: 0, z: -0.4, rot: 0 },
    { id: 'f-4', type: 'guest_chairs', x: 0, z: 1.8, rot: 180 },
    { id: 'f-5', type: 'bookshelf', x: -3.4, z: -3.2, rot: 0 },
    { id: 'f-6', type: 'office_plant', x: 3.8, z: -3.2, rot: 0 },
    { id: 'f-7', type: 'visitor_armchair', x: 3.6, z: 2.2, rot: 270 }
  ],
  desarrollo: [
    { id: 'f-1', type: 'tech_desk', x: 0, z: 0, rot: 0 },
    { id: 'f-2', type: 'mesh_chair', x: 0, z: -1.8, rot: 0 },
    { id: 'f-3', type: 'dual_monitor', x: 0, z: -0.4, rot: 0 },
    { id: 'f-4', type: 'server_rack', x: -3.6, z: -3.0, rot: 0 },
    { id: 'f-5', type: 'whiteboard', x: 3.8, z: -1.2, rot: 270 },
    { id: 'f-6', type: 'coffee_station', x: -3.6, z: 2.2, rot: 90 },
    { id: 'f-7', type: 'office_plant', x: 3.8, z: 2.8, rot: 0 }
  ],
  rrhh: [
    { id: 'f-1', type: 'executive_desk', x: 0, z: 0, rot: 0 },
    { id: 'f-2', type: 'executive_chair', x: 0, z: -1.8, rot: 0 },
    { id: 'f-3', type: 'guest_chairs', x: 0, z: 1.8, rot: 180 },
    { id: 'f-4', type: 'file_cabinet', x: -3.6, z: -3.0, rot: 0 },
    { id: 'f-5', type: 'file_cabinet', x: -3.6, z: -1.2, rot: 0 },
    { id: 'f-6', type: 'bookshelf', x: 3.4, z: -3.2, rot: 0 },
    { id: 'f-7', type: 'water_cooler', x: 3.8, z: 2.4, rot: 0 }
  ],
  marketing: [
    { id: 'f-1', type: 'creative_table', x: 0, z: 0, rot: 0 },
    { id: 'f-2', type: 'mesh_chair', x: 0, z: -1.8, rot: 0 },
    { id: 'f-3', type: 'ultrawide_monitor', x: 0, z: -0.4, rot: 0 },
    { id: 'f-4', type: 'whiteboard', x: -3.8, z: -1.5, rot: 90 },
    { id: 'f-5', type: 'lounge_sofa', x: 2.6, z: 2.0, rot: 270 },
    { id: 'f-6', type: 'coffee_station', x: 3.6, z: -3.0, rot: 0 },
    { id: 'f-7', type: 'office_plant', x: -3.8, z: 2.8, rot: 0 }
  ],
  finanzas: [
    { id: 'f-1', type: 'tech_desk', x: 0, z: 0, rot: 0 },
    { id: 'f-2', type: 'executive_chair', x: 0, z: -1.8, rot: 0 },
    { id: 'f-3', type: 'dual_monitor', x: 0, z: -0.4, rot: 0 },
    { id: 'f-4', type: 'safe_box', x: -3.6, z: -3.2, rot: 0 },
    { id: 'f-5', type: 'file_cabinet', x: -3.6, z: -1.2, rot: 0 },
    { id: 'f-6', type: 'guest_chairs', x: 0, z: 1.8, rot: 180 },
    { id: 'f-7', type: 'bookshelf', x: 3.4, z: -3.2, rot: 0 },
    { id: 'f-8', type: 'water_cooler', x: 3.8, z: 2.4, rot: 0 }
  ],
  recepcion: [
    { id: 'f-1', type: 'reception_counter', x: 0, z: 0.4, rot: 0 },
    { id: 'f-2', type: 'mesh_chair', x: 0, z: -1.2, rot: 0 },
    { id: 'f-3', type: 'lounge_sofa', x: -2.6, z: 2.6, rot: 0 },
    { id: 'f-4', type: 'coffee_station', x: 3.4, z: -2.8, rot: 0 },
    { id: 'f-5', type: 'water_cooler', x: 3.6, z: 2.4, rot: 0 },
    { id: 'f-6', type: 'office_plant', x: -3.8, z: -3.0, rot: 0 },
    { id: 'f-7', type: 'office_plant', x: 3.8, z: 0, rot: 0 }
  ]
};

function getProfileBadge(profile) {
  const map = {
    gerencia: { label: '💼 Alta Dirección', color: '#8b5cf6' },
    desarrollo: { label: '💻 Desarrollo & TI', color: '#06b6d4' },
    rrhh: { label: '⚖️ Talento Humano & Legal', color: '#3b82f6' },
    marketing: { label: '🎨 Marketing & Creatividad', color: '#f59e0b' },
    finanzas: { label: '📊 Finanzas & Auditoría', color: '#10b981' },
    recepcion: { label: '☕ Recepción & Bienestar', color: '#14b8a6' }
  };
  const item = map[profile] || map.gerencia;
  return `<span class="badge" style="background: rgba(255,255,255,0.08); color: ${item.color}; border-color: ${item.color}; font-size: 10px; padding: 2px 7px;">${item.label}</span>`;
}

// Variables de Estado del Constructor
const modalOfficeBuilder = document.getElementById('modalOfficeBuilder');
const closeOfficeBuilderBtn = document.getElementById('closeOfficeBuilderBtn');
const builderOfficeTitle = document.getElementById('builderOfficeTitle');
const builderDeptName = document.getElementById('builderDeptName');
const builderDeptSubtitle = document.getElementById('builderDeptSubtitle');
const builderLeaderName = document.getElementById('builderLeaderName');
const builderLeaderRole = document.getElementById('builderLeaderRole');
const builderProfileSelect = document.getElementById('builderProfileSelect');
const builderAutoEquipBtn = document.getElementById('builderAutoEquipBtn');
const builderClearBtn = document.getElementById('builderClearBtn');
const builderSaveBtn = document.getElementById('builderSaveBtn');
const furnitureCatalogList = document.getElementById('furnitureCatalogList');
const paletteActiveBadge = document.getElementById('paletteActiveBadge');
const builderStatusNotice = document.getElementById('builderStatusNotice');
const officeGridBlueprint = document.getElementById('officeGridBlueprint');
const gridCoordsDisplay = document.getElementById('gridCoordsDisplay');
const placedCount = document.getElementById('placedCount');
const placedFurnitureList = document.getElementById('placedFurnitureList');
const inspectItemName = document.getElementById('inspectItemName');
const inspectItemX = document.getElementById('inspectItemX');
const inspectItemZ = document.getElementById('inspectItemZ');
const inspectItemRot = document.getElementById('inspectItemRot');
const inspectRotateBtn = document.getElementById('inspectRotateBtn');
const inspectDeleteBtn = document.getElementById('inspectDeleteBtn');
const toolRotateSelected = document.getElementById('toolRotateSelected');
const toolDeleteSelected = document.getElementById('toolDeleteSelected');

let builderActiveDept = null;
let builderCurrentFurniture = [];
let builderActivePaletteKey = null;
let builderSelectedPlacedIndex = null;
let builderActiveCategory = 'all';

// Abrir el Estudio de Diseño de Oficina
window.openOfficeBuilderModal = function(deptId) {
  if (!currentCompanyData || !currentCompanyData.npcs) return;
  const target = currentCompanyData.npcs.find(n => n.id === deptId);
  if (!target) return;

  builderActiveDept = target;
  builderDeptName.textContent = target.department || 'Oficina';
  builderLeaderName.textContent = target.name || 'Líder';
  builderLeaderRole.textContent = target.role || 'Cargo';

  const initialProfile = target.profile || 'gerencia';
  builderProfileSelect.value = initialProfile;

  // Si ya tiene muebles guardados, cargarlos. Si está vacía, pre-cargar el template del perfil
  if (Array.isArray(target.furniture) && target.furniture.length > 0) {
    builderCurrentFurniture = JSON.parse(JSON.stringify(target.furniture));
  } else {
    builderCurrentFurniture = JSON.parse(JSON.stringify(PROFILE_TEMPLATES[initialProfile] || PROFILE_TEMPLATES.gerencia));
  }

  builderActivePaletteKey = null;
  builderSelectedPlacedIndex = null;
  builderActiveCategory = 'all';

  // Renderizar componentes
  renderCategoryPills();
  renderFurnitureCatalog();
  renderBlueprintGrid();
  renderPlacedInventory();
  updateInspector();

  modalOfficeBuilder.classList.remove('hidden');
};

if (closeOfficeBuilderBtn) {
  closeOfficeBuilderBtn.addEventListener('click', () => {
    modalOfficeBuilder.classList.add('hidden');
    builderActiveDept = null;
  });
}

// Filtro de categorías del catálogo
function renderCategoryPills() {
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.cat === builderActiveCategory);
    pill.onclick = () => {
      builderActiveCategory = pill.dataset.cat;
      pills.forEach(p => p.classList.toggle('active', p === pill));
      renderFurnitureCatalog();
    };
  });
}

// Renderizar tarjetas del catálogo
function renderFurnitureCatalog() {
  if (!furnitureCatalogList) return;
  furnitureCatalogList.innerHTML = '';

  const items = Object.values(FURNITURE_CATALOG).filter(f => {
    return builderActiveCategory === 'all' || f.cat === builderActiveCategory;
  });

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `furniture-catalog-card ${builderActivePaletteKey === item.id ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="furniture-icon-badge">${item.icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 12px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
        <div style="font-size: 10px; color: var(--text-muted); line-height: 1.2;">${item.desc}</div>
        <div style="font-size: 9px; color: #38bdf8; margin-top: 2px;">📐 Tamaño: ${item.w}m × ${item.d}m</div>
      </div>
    `;

    card.addEventListener('click', () => {
      if (builderActivePaletteKey === item.id) {
        builderActivePaletteKey = null;
        paletteActiveBadge.textContent = 'Selecciona para colocar';
        paletteActiveBadge.style.background = '#3b82f6';
        builderStatusNotice.textContent = 'Haz clic en un mueble colocado para rotarlo o moverlo';
      } else {
        builderActivePaletteKey = item.id;
        builderSelectedPlacedIndex = null;
        paletteActiveBadge.textContent = `Colocando: ${item.icon} ${item.name}`;
        paletteActiveBadge.style.background = '#8b5cf6';
        builderStatusNotice.textContent = `Haz clic en cualquier celda del plano para colocar "${item.name}"`;
      }
      renderFurnitureCatalog();
      renderBlueprintGrid();
      updateInspector();
    });

    furnitureCatalogList.appendChild(card);
  });
}

// Renderizar cuadrícula 10x8 y tokens colocados
function renderBlueprintGrid() {
  if (!officeGridBlueprint) return;
  officeGridBlueprint.innerHTML = '';

  const deptColor = builderActiveDept ? (builderActiveDept.color || '#3b82f6') : '#3b82f6';
  officeGridBlueprint.style.borderColor = deptColor;
  officeGridBlueprint.style.boxShadow = `0 0 24px ${deptColor}44`;

  // Crear las 80 celdas
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 10; col++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.col = col;
      cell.dataset.row = row;

      const relX = (col - 4.5);
      const relZ = (row - 3.5);

      cell.addEventListener('mouseenter', () => {
        gridCoordsDisplay.textContent = `Coordenadas: X: ${relX.toFixed(1)}m, Z: ${relZ.toFixed(1)}m (Celda ${col}, ${row})`;
      });

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCellClick(col, row, relX, relZ);
      });

      officeGridBlueprint.appendChild(cell);
    }
  }

  // Renderizar avatares/muebles colocados como tokens superpuestos
  builderCurrentFurniture.forEach((furn, index) => {
    const catItem = FURNITURE_CATALOG[furn.type] || { name: furn.type, icon: '📦', w: 2, d: 2, color: '#3b82f6' };
    const col = Math.max(0, Math.min(9, Math.round(furn.x + 4.5)));
    const row = Math.max(0, Math.min(7, Math.round(furn.z + 3.5)));

    const rot = furn.rot || 0;
    const isRotated = (rot === 90 || rot === 270);
    const effW = isRotated ? catItem.d : catItem.w;
    const effD = isRotated ? catItem.w : catItem.d;

    // Calcular dimensiones en porcentaje dentro de la grilla de 10 cols x 8 rows
    const widthPct = Math.min(100, (effW / 10) * 100);
    const heightPct = Math.min(100, (effD / 8) * 100);

    // Centro del item alineado con col y row
    const centerXPct = ((col + 0.5) / 10) * 100;
    const centerZPct = ((row + 0.5) / 8) * 100;

    const leftPct = centerXPct - (widthPct / 2);
    const topPct = centerZPct - (heightPct / 2);

    const token = document.createElement('div');
    token.className = `placed-item-token ${builderSelectedPlacedIndex === index ? 'selected' : ''}`;
    token.style.left = `${Math.max(1, Math.min(99 - widthPct, leftPct))}%`;
    token.style.top = `${Math.max(1, Math.min(99 - heightPct, topPct))}%`;
    token.style.width = `${Math.max(8, widthPct)}%`;
    token.style.height = `${Math.max(10, heightPct)}%`;
    token.style.backgroundColor = `${catItem.color}cc`;
    token.style.borderColor = builderSelectedPlacedIndex === index ? '#f59e0b' : `${catItem.color}`;

    token.innerHTML = `
      <div class="token-rot-indicator">${rot}°</div>
      <div style="font-size: 14px; pointer-events: none;">${catItem.icon}</div>
      <div style="font-size: 9px; line-height: 1; margin-top: 2px; text-shadow: 0 1px 2px #000; pointer-events: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90%;">${catItem.name}</div>
    `;

    token.addEventListener('click', (e) => {
      e.stopPropagation();
      builderSelectedPlacedIndex = index;
      builderActivePaletteKey = null;
      renderFurnitureCatalog();
      renderBlueprintGrid();
      renderPlacedInventory();
      updateInspector();
      builderStatusNotice.textContent = `Seleccionado "${catItem.name}". Usa los controles para rotar o haz clic en otra celda para moverlo.`;
    });

    officeGridBlueprint.appendChild(token);
  });
}

// Clic en una celda de la cuadrícula
function handleCellClick(col, row, relX, relZ) {
  // Caso 1: Colocar un nuevo mueble del catálogo
  if (builderActivePaletteKey) {
    const newFurn = {
      id: 'f-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      type: builderActivePaletteKey,
      x: relX,
      z: relZ,
      rot: 0
    };
    builderCurrentFurniture.push(newFurn);
    builderSelectedPlacedIndex = builderCurrentFurniture.length - 1;
    renderBlueprintGrid();
    renderPlacedInventory();
    updateInspector();
    return;
  }

  // Caso 2: Si hay un mueble ya seleccionado, moverlo a esta nueva celda
  if (builderSelectedPlacedIndex !== null && builderCurrentFurniture[builderSelectedPlacedIndex]) {
    builderCurrentFurniture[builderSelectedPlacedIndex].x = relX;
    builderCurrentFurniture[builderSelectedPlacedIndex].z = relZ;
    renderBlueprintGrid();
    renderPlacedInventory();
    updateInspector();
    builderStatusNotice.textContent = `Mueble reubicado a X: ${relX}m, Z: ${relZ}m.`;
    return;
  }

  builderSelectedPlacedIndex = null;
  renderBlueprintGrid();
  renderPlacedInventory();
  updateInspector();
}

// Renderizar lista de inventario instalado a la derecha
function renderPlacedInventory() {
  if (!placedFurnitureList || !placedCount) return;
  placedCount.textContent = builderCurrentFurniture.length;
  placedFurnitureList.innerHTML = '';

  if (builderCurrentFurniture.length === 0) {
    placedFurnitureList.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 16px; font-size: 11px;">
        Esta oficina no tiene muebles instalados.<br>Haz clic en "⚡ Auto-Equipar" o selecciona muebles del catálogo.
      </div>
    `;
    return;
  }

  builderCurrentFurniture.forEach((item, idx) => {
    const cat = FURNITURE_CATALOG[item.type] || { name: item.type, icon: '📦' };
    const row = document.createElement('div');
    row.className = `placed-list-row ${builderSelectedPlacedIndex === idx ? 'selected' : ''}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
        <span>${cat.icon}</span>
        <div style="min-width: 0;">
          <div style="font-weight: bold; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cat.name}</div>
          <div style="font-size: 9px; color: var(--text-muted);">X: ${item.x}m, Z: ${item.z}m | Rot: ${item.rot || 0}°</div>
        </div>
      </div>
      <button class="btn-delete" style="padding: 2px 6px; font-size: 10px;" title="Quitar este mueble">✕</button>
    `;

    // Clic en la fila para seleccionar
    row.addEventListener('click', () => {
      builderSelectedPlacedIndex = idx;
      builderActivePaletteKey = null;
      renderFurnitureCatalog();
      renderBlueprintGrid();
      renderPlacedInventory();
      updateInspector();
    });

    // Botón eliminar
    const delBtn = row.querySelector('.btn-delete');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePlacedItem(idx);
    });

    placedFurnitureList.appendChild(row);
  });
}

// Actualizar panel inspector
function updateInspector() {
  if (builderSelectedPlacedIndex !== null && builderCurrentFurniture[builderSelectedPlacedIndex]) {
    const item = builderCurrentFurniture[builderSelectedPlacedIndex];
    const cat = FURNITURE_CATALOG[item.type] || { name: item.type, icon: '📦' };
    inspectItemName.innerHTML = `${cat.icon} ${cat.name}`;
    inspectItemX.textContent = item.x;
    inspectItemZ.textContent = item.z;
    inspectItemRot.textContent = `${item.rot || 0}°`;
    inspectRotateBtn.disabled = false;
    inspectDeleteBtn.disabled = false;
    toolRotateSelected.disabled = false;
    toolDeleteSelected.disabled = false;
  } else {
    inspectItemName.textContent = 'Ninguno';
    inspectItemX.textContent = '0';
    inspectItemZ.textContent = '0';
    inspectItemRot.textContent = '0°';
    inspectRotateBtn.disabled = true;
    inspectDeleteBtn.disabled = true;
    toolRotateSelected.disabled = true;
    toolDeleteSelected.disabled = true;
  }
}

// Rotar elemento seleccionado
function rotateSelectedItem() {
  if (builderSelectedPlacedIndex !== null && builderCurrentFurniture[builderSelectedPlacedIndex]) {
    const currentRot = builderCurrentFurniture[builderSelectedPlacedIndex].rot || 0;
    builderCurrentFurniture[builderSelectedPlacedIndex].rot = (currentRot + 90) % 360;
    renderBlueprintGrid();
    renderPlacedInventory();
    updateInspector();
  }
}

// Eliminar elemento de la cuadrícula
function deletePlacedItem(index) {
  if (index >= 0 && index < builderCurrentFurniture.length) {
    builderCurrentFurniture.splice(index, 1);
    if (builderSelectedPlacedIndex === index) {
      builderSelectedPlacedIndex = null;
    } else if (builderSelectedPlacedIndex > index) {
      builderSelectedPlacedIndex--;
    }
    renderBlueprintGrid();
    renderPlacedInventory();
    updateInspector();
  }
}

// Eventos de botones de control
if (inspectRotateBtn) inspectRotateBtn.addEventListener('click', rotateSelectedItem);
if (toolRotateSelected) toolRotateSelected.addEventListener('click', rotateSelectedItem);

if (inspectDeleteBtn) inspectDeleteBtn.addEventListener('click', () => {
  if (builderSelectedPlacedIndex !== null) deletePlacedItem(builderSelectedPlacedIndex);
});
if (toolDeleteSelected) toolDeleteSelected.addEventListener('click', () => {
  if (builderSelectedPlacedIndex !== null) deletePlacedItem(builderSelectedPlacedIndex);
});

// Limpiar oficina
if (builderClearBtn) {
  builderClearBtn.addEventListener('click', () => {
    if (!confirm('¿Deseas quitar todos los muebles de esta oficina?')) return;
    builderCurrentFurniture = [];
    builderSelectedPlacedIndex = null;
    renderBlueprintGrid();
    renderPlacedInventory();
    updateInspector();
  });
}

// Auto-Equipar según Perfil Seleccionado
if (builderAutoEquipBtn) {
  builderAutoEquipBtn.addEventListener('click', () => {
    const prof = builderProfileSelect.value || 'gerencia';
    const template = PROFILE_TEMPLATES[prof] || PROFILE_TEMPLATES.gerencia;
    builderCurrentFurniture = JSON.parse(JSON.stringify(template));
    builderSelectedPlacedIndex = null;
    renderBlueprintGrid();
    renderPlacedInventory();
    updateInspector();
    alert(`⚡ ¡Oficina auto-equipada según el perfil de ${prof.toUpperCase()}! Puedes ajustar o mover cualquier mueble.`);
  });
}

// Cambio de perfil en el select del builder
if (builderProfileSelect) {
  builderProfileSelect.addEventListener('change', () => {
    const prof = builderProfileSelect.value;
    builderStatusNotice.textContent = `Perfil cambiado a ${prof.toUpperCase()}. Haz clic en "⚡ Auto-Equipar" si deseas cargar la configuración recomendada.`;
  });
}

// Guardar y Aplicar en 3D en tiempo real
if (builderSaveBtn) {
  builderSaveBtn.addEventListener('click', async () => {
    if (!currentCompanyId || !builderActiveDept) return;

    builderSaveBtn.disabled = true;
    builderSaveBtn.textContent = 'Guardando en 3D... ⏳';

    try {
      const res = await fetch(`/api/companies/${currentCompanyId}/departments/${builderActiveDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: builderProfileSelect.value,
          furniture: builderCurrentFurniture
        })
      });

      const data = await res.json();
      if (data.success) {
        modalOfficeBuilder.classList.add('hidden');
        await loadDashboardData(currentCompanyId);
        alert('🎉 ¡Oficina armada y decorada exitosamente!\nLos cambios se sincronizaron en tiempo real en la sede virtual 3D.');
      } else {
        alert(data.error || 'Error al guardar mobiliario');
      }
    } catch (err) {
      alert('Error de conexión al guardar oficina');
    } finally {
      builderSaveBtn.disabled = false;
      builderSaveBtn.textContent = '💾 Guardar y Aplicar 3D';
    }
  });
}

// Teclas de acceso rápido (R: rotar, Supr: borrar)
document.addEventListener('keydown', (e) => {
  if (modalOfficeBuilder.classList.contains('hidden')) return;
  if (e.key === 'r' || e.key === 'R') {
    rotateSelectedItem();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (builderSelectedPlacedIndex !== null) {
      deletePlacedItem(builderSelectedPlacedIndex);
    }
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

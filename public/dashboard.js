// Induction - Dashboard Corporativo B2B
const companySelectDash = document.getElementById('companySelectDash');
const dashCompanyNameTitle = document.getElementById('dashCompanyNameTitle');
const metricEmployeesCount = document.getElementById('metricEmployeesCount');
const metricDeptsCount = document.getElementById('metricDeptsCount');
const metricExpectedCount = document.getElementById('metricExpectedCount');
const btnCopyEmployeeInvite = document.getElementById('btnCopyEmployeeInvite');
const btnAdminLogout = document.getElementById('btnAdminLogout');
const linkEnter3d = document.getElementById('linkEnter3d');

const departmentsGrid = document.getElementById('departmentsGrid');
const employeesTableBody = document.getElementById('employeesTableBody');

// Modales
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

let currentCompanyId = null;
let currentCompanyData = null;

// Obtener slug de la URL si existe (?company=sysnet)
const urlParams = new URLSearchParams(window.location.search);
const requestedSlug = urlParams.get('company');

// 1. Inicializar Dashboard
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

// 2. Comprobar Autenticación del Administrador de la Empresa
function checkCompanyAuthAndLoad(companyId) {
  const authKey = 'comp_auth_' + companyId;
  const isAuth = sessionStorage.getItem(authKey);

  // Si ya se autenticó previamente en esta pestaña, cargar directo
  if (isAuth === 'true') {
    companyAdminLoginModal.classList.add('hidden');
    loadDashboardData(companyId);
  } else {
    // Solicitar login
    loginModalCompanyName.textContent = `Acceso a ${companyId.toUpperCase()}`;
    companyAdminLoginModal.classList.remove('hidden');
  }
}

// 3. Login de Administrador de Empresa
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
  // Actualizar URL
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('company', currentCompanyId);
  window.history.pushState({}, '', newUrl);

  checkCompanyAuthAndLoad(currentCompanyId);
});

// 4. Cargar detalles de la empresa
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

    // Actualizar select de dependencias en modal empleado
    newEmpDeptSelect.innerHTML = '';
    npcs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.department;
      opt.textContent = d.department;
      newEmpDeptSelect.appendChild(opt);
    });

    // Render Tabla de Funcionarios
    employeesTableBody.innerHTML = '';
    if (employees.length === 0) {
      employeesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
            No hay funcionarios registrados aún. Haz clic en "+ Registrar Funcionario".
          </td>
        </tr>
      `;
    } else {
      employees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${emp.name}</strong></td>
          <td><span style="color: #93c5fd;">${emp.email}</span></td>
          <td><code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: #34d399;">${emp.password || '123456'}</code></td>
          <td>${emp.role}</td>
          <td><span class="badge" style="font-size: 11px;">${emp.department}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn-goto-3d" style="padding: 4px 8px; font-size: 11px; background: #3b82f6;" onclick="copyEmployeeCard('${emp.name}', '${emp.email}', '${emp.password || '123456'}')">
                📋 Copiar Acceso
              </button>
              <button class="btn-delete" onclick="deleteEmployee('${emp.email}')">Eliminar</button>
            </div>
          </td>
        `;
        employeesTableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Error cargando datos de empresa:', err);
  }
}

// 5. Copiar link general para empleados
btnCopyEmployeeInvite.addEventListener('click', () => {
  if (!currentCompanyId) return;
  const inviteLink = `${window.location.origin}/?company=${currentCompanyId}`;
  navigator.clipboard.writeText(inviteLink).then(() => {
    alert(`¡Link de acceso para empleados copiado!\n\n${inviteLink}\n\nComparte este enlace con tus funcionarios para que entren a su sede 3D.`);
  });
});

// Copiar ficha de acceso de un empleado individual
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

// 6. ACCIONES MODALES: DEPENDENCIAS & EMPLEADOS
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

// Registrar Funcionario
formNewEmp.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('newEmpName').value.trim();
  const email = document.getElementById('newEmpEmail').value.trim();
  const password = document.getElementById('newEmpPassword').value.trim();
  const department = newEmpDeptSelect.value;
  const role = document.getElementById('newEmpRole').value.trim();

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, department, role, color: '#3B82F6' })
    });
    const data = await res.json();
    if (data.success) {
      modalNewEmp.classList.add('hidden');
      formNewEmp.reset();
      await loadDashboardData(currentCompanyId);
      alert(`¡Funcionario "${name}" registrado exitosamente en la nómina!`);
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

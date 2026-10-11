// Induction - Dashboard Corporativo B2B
const companySelectDash = document.getElementById('companySelectDash');
const dashCompanyNameTitle = document.getElementById('dashCompanyNameTitle');
const metricEmployeesCount = document.getElementById('metricEmployeesCount');
const metricDeptsCount = document.getElementById('metricDeptsCount');
const metricExpectedCount = document.getElementById('metricExpectedCount');

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

let currentCompanyId = null;

// Cargar lista de empresas
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

    if (companies.length > 0) {
      currentCompanyId = companies[0].id;
      await loadDashboardData(currentCompanyId);
    }
  } catch (err) {
    console.error('Error inicializando dashboard:', err);
  }
}

companySelectDash.addEventListener('change', () => {
  currentCompanyId = companySelectDash.value;
  loadDashboardData(currentCompanyId);
});

// Cargar detalles de la empresa seleccionada
async function loadDashboardData(companyId) {
  try {
    const res = await fetch(`/api/companies/${companyId}`);
    const company = await res.json();
    if (!company) return;

    dashCompanyNameTitle.textContent = company.name;
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
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
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
          <td>${emp.role}</td>
          <td><span class="badge" style="font-size: 11px;">${emp.department}</span></td>
          <td>
            <button class="btn-delete" onclick="deleteEmployee('${emp.email}')">Eliminar</button>
          </td>
        `;
        employeesTableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Error cargando datos de empresa:', err);
  }
}

// ----------------------------------------------------
// ACCIONES MODALES: DEPENDENCIAS & EMPLEADOS
// ----------------------------------------------------
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
  const department = newEmpDeptSelect.value;
  const role = document.getElementById('newEmpRole').value.trim();

  try {
    const res = await fetch(`/api/companies/${currentCompanyId}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, department, role })
    });
    const data = await res.json();
    if (data.success) {
      modalNewEmp.classList.add('hidden');
      formNewEmp.reset();
      await loadDashboardData(currentCompanyId);
      alert('¡Funcionario registrado exitosamente en la base de datos!');
    }
  } catch (err) {
    alert('Error guardando funcionario');
  }
});

// Eliminar Funcionario
window.deleteEmployee = async function(email) {
  if (!confirm(`¿Eliminar al funcionario ${email} de la base de datos?`)) return;
  try {
    await fetch(`/api/companies/${currentCompanyId}/employees/${encodeURIComponent(email)}`, { method: 'DELETE' });
    await loadDashboardData(currentCompanyId);
  } catch (err) {
    alert('Error eliminando funcionario');
  }
};

initDashboard();

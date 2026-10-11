// Induction SaaS - Controlador Super Administrador
const superAdminLoginView = document.getElementById('superAdminLoginView');
const superAdminDashboardView = document.getElementById('superAdminDashboardView');
const superAdminLoginForm = document.getElementById('superAdminLoginForm');
const saEmail = document.getElementById('saEmail');
const saPass = document.getElementById('saPass');
const saLogoutBtn = document.getElementById('saLogoutBtn');

// Métricas
const metricTotalCompanies = document.getElementById('metricTotalCompanies');
const metricTotalEmployees = document.getElementById('metricTotalEmployees');
const metricTotalDepts = document.getElementById('metricTotalDepts');
const companiesTableBody = document.getElementById('companiesTableBody');

// Modal Alta Empresa
const modalNewCompany = document.getElementById('modalNewCompany');
const btnOpenNewCompanyModal = document.getElementById('btnOpenNewCompanyModal');
const btnCloseCompanyModal = document.getElementById('btnCloseCompanyModal');
const formNewCompanyModal = document.getElementById('formNewCompanyModal');
const modalCompName = document.getElementById('modalCompName');
const modalCompSlug = document.getElementById('modalCompSlug');
const modalCompEmail = document.getElementById('modalCompEmail');
const modalCompPass = document.getElementById('modalCompPass');
const modalCompEmployees = document.getElementById('modalCompEmployees');
const btnGenPass = document.getElementById('btnGenPass');
const inputNewDeptTag = document.getElementById('inputNewDeptTag');
const btnAddDeptTag = document.getElementById('btnAddDeptTag');
const deptTagsContainerModal = document.getElementById('deptTagsContainerModal');

let currentHost = window.location.origin;

// 1. Verificación de Sesión Super Admin
function checkSuperAdminAuth() {
  const isAuth = sessionStorage.getItem('sa_auth');
  if (isAuth === 'true') {
    superAdminLoginView.classList.add('hidden');
    superAdminDashboardView.classList.remove('hidden');
    loadCompaniesMaster();
  } else {
    superAdminLoginView.classList.remove('hidden');
    superAdminDashboardView.classList.add('hidden');
  }
}

// 2. Login Super Admin
superAdminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = saEmail.value.trim();
  const password = saPass.value.trim();

  try {
    const res = await fetch('/api/superadmin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('sa_auth', 'true');
      sessionStorage.setItem('sa_user', data.user.name);
      checkSuperAdminAuth();
    } else {
      alert(data.error || 'Credenciales maestras incorrectas');
    }
  } catch (err) {
    alert('Error conectando con el servidor maestro');
  }
});

// Logout
saLogoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('sa_auth');
  sessionStorage.removeItem('sa_user');
  checkSuperAdminAuth();
});

// 3. Cargar Empresas y Métricas
async function loadCompaniesMaster() {
  try {
    const res = await fetch('/api/superadmin/companies');
    const companies = await res.json();

    let totalEmps = 0;
    let totalDepts = 0;

    companiesTableBody.innerHTML = '';

    if (companies.length === 0) {
      companiesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: #94a3b8;">
            No hay empresas registradas aún. Haz clic en "➕ Dar de Alta Nueva Empresa".
          </td>
        </tr>
      `;
    }

    companies.forEach(c => {
      totalEmps += (c.employeeCount || 0);
      totalDepts += (c.departmentCount || 0);

      const employeeLink = `${currentHost}/?company=${c.slug}`;
      const dashboardLink = `${currentHost}/dashboard.html?company=${c.slug}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong style="font-size: 15px; color: #f8fafc;">${c.name}</strong>
          <br>
          <code style="font-size: 11px; color: #818cf8;">slug: ${c.slug}</code>
        </td>
        <td>
          <div style="font-size: 13px;">
            <span style="color: #94a3b8;">Admin:</span> <strong>${c.adminEmail}</strong>
          </div>
          <div style="font-size: 13px; margin-top: 2px;">
            <span style="color: #94a3b8;">Clave:</span> <code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: #34d399;">${c.adminPassword || 'admin123'}</code>
          </div>
          <div style="margin-top: 6px;">
            <button class="btn-copy-link" onclick="copyToClipboard('${dashboardLink}', 'Link de Dashboard copiado')">
              🔗 Link Dashboard
            </button>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <code style="font-size: 11px; word-break: break-all; color: #93c5fd;">${employeeLink}</code>
            <button class="btn-copy-link" onclick="copyToClipboard('${employeeLink}', 'Link de empleados copiado')">
              📋 Copiar Link Empleados
            </button>
          </div>
        </td>
        <td>
          <span style="font-weight: 700; color: #38bdf8;">${c.employeeCount || 0}</span> / ${c.employeeCountExpected || 25}
          <div style="color: #94a3b8; font-size: 11px;">${c.departmentCount || 0} dependencias</div>
        </td>
        <td>
          <span class="status-badge ${c.status === 'suspended' ? 'status-suspended' : 'status-active'}">
            ${c.status === 'suspended' ? '⛔ Suspendida' : '✅ Activa'}
          </span>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button class="btn-copy-packet" onclick="copyClientPacket('${c.name}', '${c.slug}', '${c.adminEmail}', '${c.adminPassword || 'admin123'}')">
              📦 Ficha para Cliente
            </button>
            <div style="display: flex; gap: 4px;">
              <button class="btn-copy-link" style="color: ${c.status === 'suspended' ? '#10b981' : '#f59e0b'};" onclick="toggleStatus('${c.slug}', '${c.status === 'suspended' ? 'active' : 'suspended'}')">
                ${c.status === 'suspended' ? 'Activar' : 'Suspender'}
              </button>
              <button class="btn-delete" style="padding: 4px 8px; font-size: 11px;" onclick="deleteCompanyMaster('${c.slug}')">
                Eliminar
              </button>
            </div>
          </div>
        </td>
      `;
      companiesTableBody.appendChild(tr);
    });

    metricTotalCompanies.textContent = companies.length;
    metricTotalEmployees.textContent = totalEmps;
    metricTotalDepts.textContent = totalDepts;

  } catch (err) {
    console.error('Error cargando empresas:', err);
  }
}

// 4. Copiar al Portapapeles
window.copyToClipboard = function(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    alert(successMsg || 'Copiado al portapapeles');
  });
};

// 5. Copiar Ficha de Entrega Completa (WhatsApp / Email)
window.copyClientPacket = function(name, slug, adminEmail, adminPass) {
  const dashLink = `${currentHost}/dashboard.html?company=${slug}`;
  const gameLink = `${currentHost}/?company=${slug}`;

  const message = `🏢 *¡BIENVENIDO A TU SEDE VIRTUAL 3D - ${name.toUpperCase()}!*

Aquí tienes los accesos exclusivos para tu empresa:

🔑 *1. PANEL DE ADMINISTRACIÓN Y RRHH:*
Entra aquí para configurar dependencias y dar de alta a tus empleados:
👉 URL: ${dashLink}
👤 Usuario: ${adminEmail}
🔒 Contraseña: ${adminPass}

👥 *2. LINK DE INGRESO PARA TUS FUNCIONARIOS / EMPLEADOS:*
Comparte este enlace con tus empleados para que ingresen a su oficina 3D:
👉 ${gameLink}

¡Plataforma lista para comenzar la inducción y trabajo virtual! 🚀`;

  navigator.clipboard.writeText(message).then(() => {
    alert(`¡Ficha de entrega copiada con éxito!\n\nPuedes pegarla directamente en WhatsApp o enviarla por correo al cliente.`);
  });
};

// 6. Cambiar Estado
window.toggleStatus = async function(slug, newStatus) {
  try {
    await fetch(`/api/superadmin/companies/${slug}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    loadCompaniesMaster();
  } catch (e) {
    alert('Error cambiando estado');
  }
};

// 7. Eliminar Empresa
window.deleteCompanyMaster = async function(slug) {
  if (!confirm(`¿Estás SEGURO de eliminar por completo la empresa "${slug}" y todos sus empleados/oficinas 3D? Esta acción no se puede deshacer.`)) return;

  try {
    await fetch(`/api/superadmin/companies/${slug}`, { method: 'DELETE' });
    loadCompaniesMaster();
  } catch (e) {
    alert('Error eliminando empresa');
  }
};

// 8. Auto-slug al escribir nombre de empresa
modalCompName.addEventListener('input', () => {
  modalCompSlug.value = modalCompName.value
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
});

// Generar contraseña aleatoria
btnGenPass.addEventListener('click', () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#*';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  modalCompPass.value = pass;
});

// Modal Actions
btnOpenNewCompanyModal.addEventListener('click', () => modalNewCompany.classList.remove('hidden'));
btnCloseCompanyModal.addEventListener('click', () => modalNewCompany.classList.add('hidden'));

// Agregar tag de departamento
function addDeptTag(name) {
  if (!name.trim()) return;
  const span = document.createElement('span');
  span.className = 'dept-tag';
  span.dataset.name = name.trim();
  span.innerHTML = `${name.trim()} <button type="button" class="remove-tag">×</button>`;
  span.querySelector('.remove-tag').addEventListener('click', () => span.remove());
  deptTagsContainerModal.appendChild(span);
}

btnAddDeptTag.addEventListener('click', () => {
  addDeptTag(inputNewDeptTag.value);
  inputNewDeptTag.value = '';
});

inputNewDeptTag.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addDeptTag(inputNewDeptTag.value);
    inputNewDeptTag.value = '';
  }
});

// Tags remover existentes
document.querySelectorAll('#deptTagsContainerModal .remove-tag').forEach(b => {
  b.addEventListener('click', (e) => e.target.closest('.dept-tag').remove());
});

// 9. Submit: Crear Empresa
formNewCompanyModal.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = modalCompName.value.trim();
  const slug = modalCompSlug.value.trim();
  const adminEmail = modalCompEmail.value.trim();
  const adminPassword = modalCompPass.value.trim();
  const employeeCountExpected = parseInt(modalCompEmployees.value, 10) || 25;

  const tags = Array.from(deptTagsContainerModal.querySelectorAll('.dept-tag'))
    .map(t => t.dataset.name);

  try {
    const res = await fetch('/api/superadmin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug,
        adminEmail,
        adminPassword,
        employeeCountExpected,
        departmentsList: tags
      })
    });

    const data = await res.json();
    if (data.success) {
      modalNewCompany.classList.add('hidden');
      formNewCompanyModal.reset();
      await loadCompaniesMaster();

      // Ofrecer copiar ficha inmediatamente
      if (confirm(`¡Empresa "${name}" creada exitosamente!\n\n¿Deseas copiar la Ficha de Entrega con los links y contraseñas para enviársela al cliente?`)) {
        copyClientPacket(name, slug, adminEmail, adminPassword);
      }
    } else {
      alert(data.error || 'Error creando empresa');
    }
  } catch (err) {
    alert('Error conectando con el servidor maestro');
  }
});

// Inicializar
checkSuperAdminAuth();

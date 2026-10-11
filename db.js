// Capa de Abstracción de Base de Datos (PostgreSQL via Prisma con Fallback Resiliente)
const fs = require('fs');
const path = require('path');

let prisma = null;
let usePostgres = false;

if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = require('@prisma/client');
    // Normalizar protocolo de postgres:// a postgresql:// para Prisma
    if (process.env.DATABASE_URL.startsWith('postgres://')) {
      process.env.DATABASE_URL = process.env.DATABASE_URL.replace('postgres://', 'postgresql://');
    }
    prisma = new PrismaClient();
    usePostgres = true;
    console.log('[Database] 🐘 Conectado exitosamente a PostgreSQL via Prisma.');
  } catch (err) {
    console.warn('[Database] Error inicializando Prisma, usando almacenamiento fallback:', err);
    usePostgres = false;
  }
} else {
  console.log('[Database] DATABASE_URL no detectada, operando con almacenamiento local.');
}

const FALLBACK_FILE = path.join(__dirname, 'data_companies.json');

function loadFallbackData() {
  if (fs.existsSync(FALLBACK_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf-8'));
    } catch (e) { }
  }
  return { companies: {} };
}

function saveFallbackData(data) {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2));
  } catch (e) { }
}

const dbManager = {
  // 1. Listar todas las empresas
  async getCompanies() {
    if (usePostgres) {
      try {
        const companies = await prisma.company.findMany({
          include: {
            departments: true,
            employees: true
          },
          orderBy: { createdAt: 'desc' }
        });
        return companies.map(c => ({
          id: c.slug,
          slug: c.slug,
          uuid: c.id,
          name: c.name,
          adminEmail: c.adminEmail,
          adminPassword: c.adminPassword || 'admin123',
          status: c.status || 'active',
          departmentCount: c.departments.length,
          employeeCount: c.employees.length,
          employeeCountExpected: c.employeeCountExpected,
          createdAt: c.createdAt
        }));
      } catch (err) {
        console.error('[DB Error] getCompanies postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    return Object.values(fallback.companies || {}).map(c => ({
      id: c.id,
      slug: c.id,
      name: c.name,
      adminEmail: c.adminEmail,
      adminPassword: c.adminPassword || 'admin123',
      status: c.status || 'active',
      departmentCount: (c.departments || []).length,
      employeeCount: Object.keys(c.employees || {}).length,
      employeeCountExpected: c.employeeCountExpected || 10,
      createdAt: c.createdAt || new Date().toISOString()
    }));
  },

  // 2. Obtener detalle de una empresa
  async getCompanyBySlug(slug) {
    if (usePostgres) {
      try {
        const c = await prisma.company.findFirst({
          where: {
            OR: [
              { slug: slug },
              { id: slug }
            ]
          },
          include: {
            departments: true,
            employees: true
          }
        });
        if (c) {
          const empMap = {};
          c.employees.forEach(e => {
            empMap[e.email] = {
              id: e.id,
              name: e.name,
              email: e.email,
              password: e.password || '123456',
              role: e.role,
              department: c.departments.find(d => d.id === e.departmentId)?.name || 'General',
              color: e.color || '#3B82F6'
            };
          });

          const deptCount = c.departments.length || 1;
          const radius = 22;

          return {
            id: c.slug,
            slug: c.slug,
            uuid: c.id,
            name: c.name,
            adminEmail: c.adminEmail,
            adminPassword: c.adminPassword || 'admin123',
            status: c.status || 'active',
            employeeCountExpected: c.employeeCountExpected,
            departments: c.departments,
            npcs: c.departments.map((d, idx) => {
              const angle = (idx / deptCount) * Math.PI * 2 - Math.PI / 2;
              const calcX = Math.round(Math.cos(angle) * radius);
              const calcZ = Math.round(Math.sin(angle) * radius);

              return {
                id: d.id,
                name: d.leaderName || `Líder de ${d.name}`,
                role: d.leaderRole || `Director(a) de ${d.name}`,
                department: d.name,
                avatarUrl: d.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
                x: (typeof d.posX === 'number' && !isNaN(d.posX) && d.posX !== 0) ? d.posX : calcX,
                z: (typeof d.posZ === 'number' && !isNaN(d.posZ) && d.posZ !== 0) ? d.posZ : calcZ,
                color: d.color || '#3B82F6',
                info: d.description || `Área de ${d.name}. Conoce los procesos corporativos de nuestra dependencia.`
              };
            }),
            employees: empMap
          };
        }
      } catch (err) {
        console.error('[DB Error] getCompanyBySlug postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    return fallback.companies[slug] || null;
  },

  // 3. Crear Empresa con Dependencias
  async createCompany(data, generatedNpcs) {
    const slug = data.slug;
    const adminPassword = data.adminPassword || 'admin123';
    const status = data.status || 'active';

    if (usePostgres) {
      try {
        const created = await prisma.company.create({
          data: {
            slug: slug,
            name: data.name,
            adminEmail: data.adminEmail,
            adminPassword: adminPassword,
            status: status,
            employeeCountExpected: data.employeeCountExpected || 25,
            departments: {
              create: generatedNpcs.map(npc => ({
                name: npc.department,
                description: npc.info,
                leaderName: npc.name,
                leaderRole: npc.role,
                avatarUrl: npc.avatarUrl,
                color: npc.color,
                posX: npc.x,
                posZ: npc.z
              }))
            }
          },
          include: { departments: true }
        });
        return created;
      } catch (err) {
        console.error('[DB Error] createCompany postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    fallback.companies[slug] = {
      id: slug,
      slug: slug,
      name: data.name,
      adminEmail: data.adminEmail,
      adminPassword: adminPassword,
      status: status,
      employeeCountExpected: data.employeeCountExpected || 25,
      departments: data.departments,
      npcs: generatedNpcs,
      employees: {},
      createdAt: new Date().toISOString()
    };
    saveFallbackData(fallback);
    return fallback.companies[slug];
  },

  // 4. Registrar Funcionario en la Empresa
  async createEmployee(companySlug, empData) {
    const password = empData.password || '123456';

    if (usePostgres) {
      try {
        const company = await prisma.company.findFirst({
          where: { OR: [{ slug: companySlug }, { id: companySlug }] },
          include: { departments: true }
        });
        if (company) {
          const dept = company.departments.find(d => d.name === empData.department);
          const emp = await prisma.employee.upsert({
            where: {
              companyId_email: {
                companyId: company.id,
                email: empData.email
              }
            },
            update: {
              name: empData.name,
              role: empData.role,
              departmentId: dept?.id,
              color: empData.color,
              password: password
            },
            create: {
              companyId: company.id,
              departmentId: dept?.id,
              name: empData.name,
              email: empData.email,
              role: empData.role,
              color: empData.color,
              password: password
            }
          });
          return emp;
        }
      } catch (err) {
        console.error('[DB Error] createEmployee postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    const company = fallback.companies[companySlug];
    if (company) {
      company.employees[empData.email] = {
        ...empData,
        password: password,
        visitedNPCs: []
      };
      saveFallbackData(fallback);
      return company.employees[empData.email];
    }
  },

  // Eliminar funcionario
  async deleteEmployee(companySlug, employeeEmail) {
    if (usePostgres) {
      try {
        const company = await prisma.company.findUnique({ where: { slug: companySlug } });
        if (company) {
          await prisma.employee.delete({
            where: {
              companyId_email: {
                companyId: company.id,
                email: employeeEmail
              }
            }
          });
          return true;
        }
      } catch (err) {
        console.error('[DB Error] deleteEmployee postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    const company = fallback.companies[companySlug];
    if (company && company.employees[employeeEmail]) {
      delete company.employees[employeeEmail];
      saveFallbackData(fallback);
      return true;
    }
    return false;
  },

  // Agregar Dependencia a la empresa
  async addDepartment(companySlug, deptData) {
    if (usePostgres) {
      try {
        const company = await prisma.company.findUnique({
          where: { slug: companySlug },
          include: { departments: true }
        });
        if (company) {
          const index = company.departments.length;
          const radius = 24;
          const angle = (index / (index + 1)) * Math.PI * 2 - Math.PI / 2;
          const posX = Math.round(Math.cos(angle) * radius);
          const posZ = Math.round(Math.sin(angle) * radius);

          const newDept = await prisma.department.create({
            data: {
              companyId: company.id,
              name: deptData.name,
              description: deptData.description || `Área de ${deptData.name}`,
              leaderName: deptData.leaderName || `Líder de ${deptData.name}`,
              leaderRole: deptData.leaderRole || `Director(a) de ${deptData.name}`,
              avatarUrl: deptData.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
              color: deptData.color || '#3B82F6',
              posX: posX,
              posZ: posZ
            }
          });
          return newDept;
        }
      } catch (err) {
        console.error('[DB Error] addDepartment postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    const company = fallback.companies[companySlug];
    if (company) {
      const index = (company.departments || []).length;
      const radius = 24;
      const angle = (index / (index + 1)) * Math.PI * 2 - Math.PI / 2;
      const newNpc = {
        id: `dept-${Date.now()}`,
        name: deptData.leaderName || `Líder de ${deptData.name}`,
        role: deptData.leaderRole || `Director(a) de ${deptData.name}`,
        department: deptData.name,
        avatarUrl: deptData.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        x: Math.round(Math.cos(angle) * radius),
        z: Math.round(Math.sin(angle) * radius),
        color: deptData.color || '#3B82F6',
        info: deptData.description || `Área de ${deptData.name}`
      };
      company.departments.push({ name: deptData.name, description: deptData.description });
      company.npcs.push(newNpc);
      saveFallbackData(fallback);
      return newNpc;
    }
  },

  // Eliminar Dependencia
  async deleteDepartment(companySlug, departmentId) {
    if (usePostgres) {
      try {
        await prisma.department.delete({ where: { id: departmentId } });
        return true;
      } catch (err) {
        console.error('[DB Error] deleteDepartment postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    const company = fallback.companies[companySlug];
    if (company) {
      company.npcs = company.npcs.filter(n => n.id !== departmentId);
      saveFallbackData(fallback);
      return true;
    }
    return false;
  },

  // 5. Guardar Tarea de Inducción Completada
  async recordTaskProgress(companySlug, employeeEmail, npcId) {
    if (usePostgres) {
      try {
        const company = await prisma.company.findUnique({ where: { slug: companySlug } });
        if (company) {
          const emp = await prisma.employee.findUnique({
            where: { companyId_email: { companyId: company.id, email: employeeEmail } }
          });
          if (emp) {
            // Verificar si npcId es un uuid de departamento
            await prisma.onboardingProgress.upsert({
              where: {
                employeeId_departmentId: {
                  employeeId: emp.id,
                  departmentId: npcId
                }
              },
              update: {},
              create: {
                employeeId: emp.id,
                departmentId: npcId
              }
            });
            return;
          }
        }
      } catch (err) {
        // En caso de que npcId sea un id sintético
      }
    }

    const fallback = loadFallbackData();
    const company = fallback.companies[companySlug];
    if (company && company.employees[employeeEmail]) {
      const emp = company.employees[employeeEmail];
      if (!emp.visitedNPCs.includes(npcId)) {
        emp.visitedNPCs.push(npcId);
        saveFallbackData(fallback);
      }
    }
  },

  // 6. Super Admin Verificación
  async verifySuperAdmin(email, password) {
    const defaultMasterEmail = process.env.SUPERADMIN_EMAIL || 'admin@induction.com';
    const defaultMasterPass = process.env.SUPERADMIN_PASS || 'Induction2026!*';

    if (email === defaultMasterEmail && password === defaultMasterPass) {
      return { email: defaultMasterEmail, name: 'Super Admin Master' };
    }

    if (usePostgres) {
      try {
        const sa = await prisma.superAdmin.findUnique({ where: { email } });
        if (sa && sa.password === password) {
          return { email: sa.email, name: sa.name };
        }
      } catch (e) { }
    }
    return null;
  },

  // 7. Eliminar Empresa
  async deleteCompany(companySlug) {
    if (usePostgres) {
      try {
        const comp = await prisma.company.findFirst({
          where: { OR: [{ slug: companySlug }, { id: companySlug }] }
        });
        if (comp) {
          await prisma.company.delete({ where: { id: comp.id } });
          return true;
        }
      } catch (err) {
        console.error('[DB Error] deleteCompany postgres:', err);
      }
    }
    const fallback = loadFallbackData();
    if (fallback.companies[companySlug]) {
      delete fallback.companies[companySlug];
      saveFallbackData(fallback);
      return true;
    }
    return false;
  },

  // 8. Cambiar estado de empresa (active / suspended)
  async updateCompanyStatus(companySlug, status) {
    if (usePostgres) {
      try {
        const comp = await prisma.company.findFirst({
          where: { OR: [{ slug: companySlug }, { id: companySlug }] }
        });
        if (comp) {
          await prisma.company.update({
            where: { id: comp.id },
            data: { status }
          });
          return true;
        }
      } catch (err) {
        console.error('[DB Error] updateCompanyStatus postgres:', err);
      }
    }
    const fallback = loadFallbackData();
    if (fallback.companies[companySlug]) {
      fallback.companies[companySlug].status = status;
      saveFallbackData(fallback);
      return true;
    }
    return false;
  },

  // 9. Verificar Login de Administrador de Empresa
  async verifyCompanyAdmin(companySlug, email, password) {
    const comp = await this.getCompanyBySlug(companySlug);
    if (!comp) return null;
    if (comp.status === 'suspended') {
      return { error: 'Empresa suspendida. Comuníquese con administración general.' };
    }
    if (comp.adminEmail.toLowerCase() === email.toLowerCase() && comp.adminPassword === password) {
      return { success: true, company: comp };
    }
    return null;
  },

  // 10. Verificar Login de Empleado
  async verifyEmployeeLogin(companySlug, email, password) {
    const comp = await this.getCompanyBySlug(companySlug);
    if (!comp) return null;
    if (comp.status === 'suspended') {
      return { error: 'La sede virtual de esta empresa se encuentra inactiva o suspendida.' };
    }
    const employee = comp.employees[email];
    if (!employee) return null;

    if (employee.password && employee.password !== password) {
      return { error: 'Contraseña incorrecta de funcionario' };
    }

    return { success: true, employee, company: comp };
  }
};

module.exports = dbManager;

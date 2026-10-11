// Capa de Abstracción de Base de Datos (PostgreSQL via Prisma con Fallback Resiliente)
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

let prisma = null;
let usePostgres = false;

if (process.env.DATABASE_URL) {
  try {
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
          uuid: c.id,
          name: c.name,
          adminEmail: c.adminEmail,
          departmentCount: c.departments.length,
          employeeCount: c.employees.length,
          employeeCountExpected: c.employeeCountExpected
        }));
      } catch (err) {
        console.error('[DB Error] getCompanies postgres:', err);
      }
    }

    const fallback = loadFallbackData();
    return Object.values(fallback.companies || {}).map(c => ({
      id: c.id,
      name: c.name,
      adminEmail: c.adminEmail,
      departmentCount: (c.departments || []).length,
      employeeCount: Object.keys(c.employees || {}).length,
      employeeCountExpected: c.employeeCountExpected || 10
    }));
  },

  // 2. Obtener detalle de una empresa
  async getCompanyBySlug(slug) {
    if (usePostgres) {
      try {
        const c = await prisma.company.findUnique({
          where: { slug: slug },
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
              role: e.role,
              department: c.departments.find(d => d.id === e.departmentId)?.name || 'General',
              color: e.color
            };
          });

          return {
            id: c.slug,
            uuid: c.id,
            name: c.name,
            adminEmail: c.adminEmail,
            employeeCountExpected: c.employeeCountExpected,
            departments: c.departments,
            npcs: c.departments.map(d => ({
              id: d.id,
              name: d.leaderName || `Líder de ${d.name}`,
              role: d.leaderRole || `Director(a) de ${d.name}`,
              department: d.name,
              avatarUrl: d.avatarUrl,
              x: d.posX,
              z: d.posZ,
              color: d.color,
              info: d.description
            })),
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

    if (usePostgres) {
      try {
        const created = await prisma.company.create({
          data: {
            slug: slug,
            name: data.name,
            adminEmail: data.adminEmail,
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
      name: data.name,
      adminEmail: data.adminEmail,
      employeeCountExpected: data.employeeCountExpected || 25,
      departments: data.departments,
      npcs: generatedNpcs,
      employees: {}
    };
    saveFallbackData(fallback);
    return fallback.companies[slug];
  },

  // 4. Registrar Funcionario en la Empresa
  async createEmployee(companySlug, empData) {
    if (usePostgres) {
      try {
        const company = await prisma.company.findUnique({
          where: { slug: companySlug },
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
              color: empData.color
            },
            create: {
              companyId: company.id,
              departmentId: dept?.id,
              name: empData.name,
              email: empData.email,
              role: empData.role,
              color: empData.color
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
        visitedNPCs: []
      };
      saveFallbackData(fallback);
      return company.employees[empData.email];
    }
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
  }
};

module.exports = dbManager;

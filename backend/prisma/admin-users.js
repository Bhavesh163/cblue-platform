const fs = require('fs');
const path = require('path');
const { PrismaClient, UserRole } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), 'backend/.env'));
loadEnvFile(path.resolve(process.cwd(), '../.env'));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to seed admin users');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ADMIN_USERS = [
  {
    email: 'suppadesh@hotmail.com',
    name: 'Suppadesh Fungprasertsuk',
    phone: '+66819852846',
  },
  {
    email: 'bhaveshfung@gmail.com',
    name: 'Bhavesh Fungprasertsuk',
    phone: '+66821056357',
  },
];

async function ensureAdminUser(adminUser) {
  const email = adminUser.email.trim().toLowerCase();
  const phone = adminUser.phone.trim();

  const matches = await prisma.user.findMany({
    where: {
      OR: [{ email }, { phone }],
    },
    select: { id: true, email: true, phone: true },
    take: 2,
  });

  if (matches.length > 1) {
    throw new Error(
      `Cannot promote ${email}: email and phone are attached to different users. Merge them manually first.`,
    );
  }

  const existing = matches[0];
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        phone,
        name: adminUser.name,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: { id: true, email: true, phone: true, name: true, role: true },
    });
  }

  return prisma.user.create({
    data: {
      email,
      phone,
      name: adminUser.name,
      role: UserRole.ADMIN,
      isActive: true,
    },
    select: { id: true, email: true, phone: true, name: true, role: true },
  });
}

async function main() {
  for (const adminUser of ADMIN_USERS) {
    const user = await ensureAdminUser(adminUser);
    console.log(`ADMIN ready: ${user.name} <${user.email}> ${user.phone} (${user.id})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Based on the IDs found in the data, create placeholder company names
// The user can update these in the app settings later
const COMPANIES = [
  { id: '06173ce1', nombre: 'Empresa 06173ce1' },
  { id: '17b8ab1a', nombre: 'Empresa 17b8ab1a' },
  { id: '6cbebb82', nombre: 'Empresa 6cbebb82' },
  { id: '905bd9ea', nombre: 'Empresa 905bd9ea' },
  { id: 'f9520842', nombre: 'Empresa f9520842' },
];

async function main() {
  for (const c of COMPANIES) {
    await prisma.configWhatsapp.upsert({
      where: { clave: `COMPANY_${c.id}` },
      update: { valor: c.nombre },
      create: { clave: `COMPANY_${c.id}`, valor: c.nombre }
    });
  }
  console.log('Company placeholders created. Update them via the app settings.');
}

main().finally(() => prisma.$disconnect());

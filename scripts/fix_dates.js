require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

// Convert Excel serial date to ISO string
function excelDateToISO(serial) {
  if (!serial || isNaN(parseFloat(serial))) return null;
  const num = parseFloat(serial);
  // Excel epoch starts 1900-01-01 but has a leap year bug (treats 1900 as leap year)
  const date = new Date((num - 25569) * 86400 * 1000);
  return date.toISOString();
}

async function main() {
  console.log('Fixing Excel dates in Solicitudes...');
  const allTickets = await prisma.solicitud.findMany();
  let fixed = 0;
  for (const t of allTickets) {
    if (t.fecha && !isNaN(parseFloat(t.fecha)) && parseFloat(t.fecha) > 1000) {
      const isoDate = excelDateToISO(t.fecha);
      await prisma.solicitud.update({
        where: { id: t.id },
        data: { fecha: isoDate }
      });
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} dates.`);

  // Fix Pasajero nacimiento dates
  console.log('Fixing passenger birth dates...');
  const allPax = await prisma.pasajero.findMany();
  let fixedPax = 0;
  for (const p of allPax) {
    if (p.nacimiento && !isNaN(parseFloat(p.nacimiento)) && parseFloat(p.nacimiento) > 1000) {
      const isoDate = excelDateToISO(p.nacimiento);
      await prisma.pasajero.update({
        where: { id: p.id },
        data: { nacimiento: isoDate ? isoDate.split('T')[0] : null }
      });
      fixedPax++;
    }
  }
  console.log(`Fixed ${fixedPax} passenger dates.`);

  // Now import Companies from the xlsx if available
  console.log('Looking for Companies data...');
  try {
    const workbook = xlsx.readFile('/Users/alejandro/Viajes Boocle.xlsx');
    // not likely to be there
  } catch(e) {}
  
  // Try reading the Companies sheet from the Boocle file
  try {
    const workbook = xlsx.readFile('/Users/alejandro/Viajes RM/Viajes Boocle.xlsx');
    if (workbook.SheetNames.includes('Companies')) {
      const data = xlsx.utils.sheet_to_json(workbook.Sheets['Companies']);
      for (const row of data) {
        if (row.ID && row.Nombre) {
          // store in ConfigWhatsapp table as company mapping
          await prisma.configWhatsapp.upsert({
            where: { clave: `COMPANY_${row.ID}` },
            update: { valor: row.Nombre },
            create: { clave: `COMPANY_${row.ID}`, valor: row.Nombre }
          });
        }
      }
      console.log('Imported Companies sheet.');
    } else {
      console.log('No Companies sheet found. Available:', workbook.SheetNames.join(', '));
    }
  } catch(e) {
    console.log('Companies import error:', e.message);
  }

  console.log('Done!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

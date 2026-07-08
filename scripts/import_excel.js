require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  const workbook = xlsx.readFile('/Users/alejandro/Viajes RM/Viajes Boocle.xlsx');
  
  // Helper to map keys
  const mapKeys = (row, mapping) => {
    const obj = {};
    for (const [excelKey, prismaKey] of Object.entries(mapping)) {
      if (row[excelKey] !== undefined) {
        obj[prismaKey] = String(row[excelKey]);
      }
    }
    return obj;
  };

  // 1. ConfigWhatsapp
  if (workbook.SheetNames.includes('Config_Whatsapp')) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['Config_Whatsapp']);
    for (const row of data) {
      if (row.Clave) {
        await prisma.configWhatsapp.upsert({
          where: { clave: String(row.Clave) },
          update: { valor: row.Valor ? String(row.Valor) : null },
          create: { clave: String(row.Clave), valor: row.Valor ? String(row.Valor) : null }
        });
      }
    }
    console.log(`Imported Config_Whatsapp`);
  }

  // 2. Usuarios
  if (workbook.SheetNames.includes('Usuarios')) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['Usuarios']);
    for (const row of data) {
      if (row.Usuario) {
        await prisma.user.upsert({
          where: { usuario: String(row.Usuario) },
          update: {
            passwordHash: row.Password_Hash ? String(row.Password_Hash) : null,
            rol: row.Rol ? String(row.Rol) : null,
            empresa: row.Empresa ? String(row.Empresa) : null,
            correo: row.Correo ? String(row.Correo) : null,
            telefono: row.Telefono ? String(row.Telefono) : null,
            otpTemp: row.OTP_Temp ? String(row.OTP_Temp) : null,
          },
          create: {
            usuario: String(row.Usuario),
            passwordHash: row.Password_Hash ? String(row.Password_Hash) : null,
            rol: row.Rol ? String(row.Rol) : null,
            empresa: row.Empresa ? String(row.Empresa) : null,
            correo: row.Correo ? String(row.Correo) : null,
            telefono: row.Telefono ? String(row.Telefono) : null,
            otpTemp: row.OTP_Temp ? String(row.OTP_Temp) : null,
          }
        });
      }
    }
    console.log(`Imported Usuarios`);
  }

  // 3. Solicitudes (Tickets)
  if (workbook.SheetNames.includes('Solicitudes')) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['Solicitudes']);
    for (const row of data) {
      if (row.ID_Ticket) {
        await prisma.solicitud.upsert({
          where: { idTicket: String(row.ID_Ticket) },
          update: {
            fecha: row.Fecha ? String(row.Fecha) : null,
            solicitante: row.Solicitante ? String(row.Solicitante) : null,
            empresa: row.Empresa ? String(row.Empresa) : null,
            estado: row.Estado ? String(row.Estado) : null,
            notas: row.Notas ? String(row.Notas) : null,
            politicaAplicada: row.Politica_Aplicada ? String(row.Politica_Aplicada) : null,
            responsable: row.Responsable ? String(row.Responsable) : null,
            evento: row.Evento ? String(row.Evento) : null,
          },
          create: {
            idTicket: String(row.ID_Ticket),
            fecha: row.Fecha ? String(row.Fecha) : null,
            solicitante: row.Solicitante ? String(row.Solicitante) : null,
            empresa: row.Empresa ? String(row.Empresa) : null,
            estado: row.Estado ? String(row.Estado) : null,
            notas: row.Notas ? String(row.Notas) : null,
            politicaAplicada: row.Politica_Aplicada ? String(row.Politica_Aplicada) : null,
            responsable: row.Responsable ? String(row.Responsable) : null,
            evento: row.Evento ? String(row.Evento) : null,
          }
        });
      }
    }
    console.log(`Imported Solicitudes`);
  }

  // 4. Servicios_Detalle
  if (workbook.SheetNames.includes('Servicios_Detalle')) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['Servicios_Detalle']);
    for (const row of data) {
      if (row.ID_Ticket) {
        // Only insert if Solicitud exists
        const sol = await prisma.solicitud.findUnique({ where: { idTicket: String(row.ID_Ticket) } });
        if (sol) {
          await prisma.serviciosDetalle.create({
            data: {
              idTicket: String(row.ID_Ticket),
              tipo: row.Tipo ? String(row.Tipo) : null,
              origenHotel: row.Origen_Hotel ? String(row.Origen_Hotel) : null,
              destinoCiudad: row.Destino_Ciudad ? String(row.Destino_Ciudad) : null,
              fechaIn: row.Fecha_In ? String(row.Fecha_In) : null,
              fechaOut: row.Fecha_Out ? String(row.Fecha_Out) : null,
              detallesTecnicos: row.Detalles_Tecnicos ? String(row.Detalles_Tecnicos) : null,
            }
          });
        }
      }
    }
    console.log(`Imported Servicios_Detalle`);
  }

  // 5. Pasajeros
  if (workbook.SheetNames.includes('Pasajeros')) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['Pasajeros']);
    for (const row of data) {
      if (row.ID_Ticket) {
        const sol = await prisma.solicitud.findUnique({ where: { idTicket: String(row.ID_Ticket) } });
        if (sol) {
          await prisma.pasajero.create({
            data: {
              idTicket: String(row.ID_Ticket),
              nombre: row.Nombre ? String(row.Nombre) : null,
              nacimiento: row.Nacimiento ? String(row.Nacimiento) : null,
              asientoCama: row.Asiento_Cama ? String(row.Asiento_Cama) : null,
              maletas: row.Maletas ? String(row.Maletas) : null,
              linkIdDrive: row.Link_ID_Drive ? String(row.Link_ID_Drive) : null,
            }
          });
        }
      }
    }
    console.log(`Imported Pasajeros`);
  }

  // 6. Opciones_Cotizacion
  if (workbook.SheetNames.includes('Opciones_Cotizacion')) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['Opciones_Cotizacion']);
    for (const row of data) {
      if (row.ID_Ticket) {
        const sol = await prisma.solicitud.findUnique({ where: { idTicket: String(row.ID_Ticket) } });
        if (sol) {
          await prisma.opcionesCotizacion.create({
            data: {
              idTicket: String(row.ID_Ticket),
              idOpcion: row.ID_Opcion ? String(row.ID_Opcion) : null,
              descripcion: row.Descripcion ? String(row.Descripcion) : null,
              costo: row.Costo ? parseFloat(row.Costo) : null,
              fee: row.Fee ? parseFloat(row.Fee) : null,
              totalIva: row.Total_IVA ? parseFloat(row.Total_IVA) : null,
              estadoOpcion: row.Estado_Opcion ? String(row.Estado_Opcion) : null,
              linkVoucherFinal: row.Link_Voucher_Final ? String(row.Link_Voucher_Final) : null,
            }
          });
        }
      }
    }
    console.log(`Imported Opciones_Cotizacion`);
  }

  console.log("Import completed successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

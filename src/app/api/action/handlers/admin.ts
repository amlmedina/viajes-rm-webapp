import { getSheetData, updateCell, updateRow, appendRow, getCompaniesMap } from '@/lib/sheets';
import { createHash } from 'crypto';

function hashPassword(pass: string): string {
    return createHash('sha256').update(pass).digest('hex');
}

export async function handleGetUsuarios(auth: any) {
  const users = await getSheetData('Usuarios');
  const companiesMap = await getCompaniesMap();
  
  const formattedUsers = users.map(u => {
    const out = [...u];
    while(out.length < 11) out.push('');
    
    const empCSV = String(u[3] || '').trim();
    let empName = empCSV;
    if (empCSV) {
      const ids = empCSV.split(',').map(s => s.trim());
      empName = ids.map(id => companiesMap[id] || id).join(', ');
    }
    out[9] = empName;
    out[10] = String(u[7] || '').toUpperCase() === 'VACACIONES';
    
    return out;
  });
  
  return { status: 'success', data: formattedUsers };
}

export async function handleGetUsuarioDetalle(auth: any, body: any) {
  const { usuarioLogin } = body;
  const users = await getSheetData('Usuarios');
  const user = users.find(u => String(u[0] || '').toLowerCase() === String(usuarioLogin).toLowerCase());
  
  if (!user) return { status: 'error', message: 'Usuario no encontrado' };
  
  const empresas = String(user[3] || '').split(',').map(e => e.trim()).filter(Boolean);
  
  return { 
    status: 'success', 
    data: {
      login: user[0],
      rol: user[2],
      empresas: empresas,
      correo: user[4] || '',
      telefono: user[5] || ''
    } 
  };
}

export async function handleToggleVacaciones(auth: any, body: any) {
  const { usuario } = body;
  const users = await getSheetData('Usuarios');
  
  const rowIndex = users.findIndex(u => String(u[0] || '').toLowerCase() === String(usuario).toLowerCase());
  if (rowIndex === -1) return { status: 'error', message: 'Usuario no encontrado' };
  
  const sheetRow = rowIndex + 2; 
  const currentVacaciones = String(users[rowIndex][7] || '').toUpperCase() === 'VACACIONES';
  const newValue = currentVacaciones ? '' : 'VACACIONES';
  
  await updateCell('Usuarios', sheetRow, 8, newValue);
  
  return { status: 'success', data: { vacaciones: !currentVacaciones } };
}

export async function handleSaveUser(auth: any, body: any) {
  const { isNew, oldLogin, login, pass, rol, empresaIds, correo, telefono } = body;
  const users = await getSheetData('Usuarios');
  const empCSV = (empresaIds || []).join(', ');
  
  if (isNew) {
    if (users.find(u => String(u[0]).toLowerCase() === String(login).toLowerCase())) {
      return { status: 'error', message: 'El usuario ya existe' };
    }
    
    const hash = hashPassword(pass);
    await appendRow('Usuarios', [
      login, hash, rol, empCSV, correo, telefono, '', ''
    ]);
    return { status: 'success', message: 'Usuario creado' };
  } else {
    const rowIndex = users.findIndex(u => String(u[0]).toLowerCase() === String(oldLogin).toLowerCase());
    if (rowIndex === -1) return { status: 'error', message: 'Usuario no encontrado' };
    
    const userRow = users[rowIndex];
    const newHash = pass ? hashPassword(pass) : userRow[1];
    const sheetRow = rowIndex + 2;
    
    const newRow = [
      login, 
      newHash, 
      rol, 
      empCSV, 
      correo, 
      telefono, 
      userRow[6] || '', 
      userRow[7] || ''
    ];
    
    await updateRow('Usuarios', sheetRow, 1, newRow);
    return { status: 'success', message: 'Usuario actualizado' };
  }
}

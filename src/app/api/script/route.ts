import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gasDir = path.join(process.cwd(), 'gas');
  
  // The modules exactly as defined in Router.gs (matching spellings)
  const modules = [
    'Scripts_core', 
    'Scripts_auth', 
    'Scripts_init',
    'Scripts_nav',
    'Scripts_dashboard',
    'Scripts_detalles', 
    'Scripts_cotizar',
    'Scripts_acciones', 
    'Scripts_edit', 
    'Scripts_admin'
  ];
  
  let jsContent = '';
  
  for (const mod of modules) {
    // Check possible filenames
    const possibleNames = [`${mod}.html`];
    if (mod === 'Scripts_auth') possibleNames.push('Scripts_Auth.html');
    if (mod === 'Scripts_dashboard') possibleNames.push('Scripts_dashboards.html');
    if (mod === 'Scripts_init') possibleNames.push('Scipts_init.html');
    
    let fileContent: string | null = null;
    
    for (const name of possibleNames) {
      const filePath = path.join(gasDir, name);
      if (fs.existsSync(filePath)) {
        fileContent = fs.readFileSync(filePath, 'utf-8');
        break;
      }
    }
    
    if (fileContent !== null) {
      try {
        // Remove <script> and </script> tags
        let raw = fileContent.replace(/^<script>\s*/i, '').replace(/\s*<\/script>\s*$/i, '');
        
        // Dynamic SCRIPT_URL replacement inside the script
        raw = raw.replace(
          /const SCRIPT_URL = ['"`](.*?)['"`];/g,
          "const SCRIPT_URL = '/api/action';"
        );
        
        jsContent += `\n// ── ${mod} ──\n${raw}\n`;
      } catch (err: any) {
        jsContent += `\nconsole.error("[ERROR] No se pudo procesar: ${mod} - ${err.message}");\n`;
      }
    } else {
      jsContent += `\nconsole.error("[ERROR] No se encontró el archivo local: ${mod} (probamos: ${possibleNames.join(', ')})");\n`;
    }
  }
  
  return new Response(jsContent, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8'
    }
  });
}

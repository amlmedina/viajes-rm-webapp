import fs from 'fs';
import path from 'path';

function resolveIncludes(content: string, baseDir: string): string {
  const includeRegex = /<\?!=?\s*include\(['"]([^'"]+)['"]\);?\s*\?>/g;
  
  return content.replace(includeRegex, (match, filename) => {
    const ext = filename.endsWith('.html') ? '' : '.html';
    const filePath = path.join(baseDir, filename + ext);
    
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return resolveIncludes(fileContent, baseDir);
    }
    
    console.warn(`Include not found: ${filePath}`);
    return `<!-- Include failed: ${filename} -->`;
  });
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseDir = path.join(process.cwd(), 'gas');
  const indexHtmlPath = path.join(baseDir, 'Index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    return new Response(`Index.html not found in ${baseDir}`, { status: 404 });
  }
  
  let htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
  htmlContent = resolveIncludes(htmlContent, baseDir);
  
  // DYNAMIC REPLACEMENT: Change SCRIPT_URL to our local API endpoint
  htmlContent = htmlContent.replace(
    /const SCRIPT_URL = ['"`](.*?)['"`];/g,
    "const SCRIPT_URL = '/api/action';"
  );
  
  // DYNAMIC REPLACEMENT: Route the Apps Script script bundle request to our local Next.js script API
  htmlContent = htmlContent.replace(
    /<\?= ScriptApp\.getService\(\)\.getUrl\(\) \?>\?action=script/g,
    '/api/script'
  );
  
  return new Response(htmlContent, {
    headers: { 'Content-Type': 'text/html' }
  });
}

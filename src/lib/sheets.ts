/**
 * Google Sheets API wrapper
 * Replaces SpreadsheetApp.getActiveSpreadsheet() from Apps Script
 * Includes singleton clients and an in-memory TTL cache with auto-invalidation on write.
 */
import { google, sheets_v4, drive_v3 } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const COMPANIES_SS_ID = process.env.COMPANIES_SS_ID || process.env.SPREADSHEET_ID!;

export const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1SalfWTHMSUVHuaemuyCdY2iUsqAsq4Q2';

// ─── Singletons ─────────────────────────────────────────────────────────────
let cachedAuth: any = null;
let cachedSheets: sheets_v4.Sheets | null = null;
let cachedDrive: drive_v3.Drive | null = null;

function getAuth() {
  if (cachedAuth) return cachedAuth;
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env variable is not set.');
  const credentials = JSON.parse(keyRaw);
  cachedAuth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  return cachedAuth;
}

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (cachedSheets) return cachedSheets;
  const auth = getAuth();
  cachedSheets = google.sheets({ version: 'v4', auth });
  return cachedSheets;
}

export async function getDriveClient(): Promise<drive_v3.Drive> {
  if (cachedDrive) return cachedDrive;
  const auth = getAuth();
  cachedDrive = google.drive({ version: 'v3', auth });
  return cachedDrive;
}

// ─── Cache Layer ────────────────────────────────────────────────────────────
interface CacheEntry {
  timestamp: number;
  data: any[][];
}

const sheetCache = new Map<string, CacheEntry>();
let cachedCompaniesMap: { timestamp: number; map: Record<string, string> } | null = null;

// TTLs per category
const STATIC_TTL = 5 * 60 * 1000;       // 5 minutes for config/users/companies/policies
const OPERATIONAL_TTL = 30 * 1000;      // 30 seconds for live tickets/services/passengers

const STATIC_SHEETS = new Set([
  'Companies',
  'Usuarios',
  'Config_Whatsapp',
  'Politica',
  'Config_Migracion',
  'Catalogos',
]);

function getTTLForSheet(sheetName: string): number {
  return STATIC_SHEETS.has(sheetName) ? STATIC_TTL : OPERATIONAL_TTL;
}

function getCacheKey(sheetName: string, spreadsheetId: string): string {
  return `${spreadsheetId}:${sheetName}`;
}

/**
 * Invalidate cache for a specific sheet or all sheets.
 * Automatically called on appendRow, updateCell, updateRow, deleteRow.
 */
export function invalidateSheetCache(sheetName?: string, spreadsheetId = SPREADSHEET_ID): void {
  if (!sheetName) {
    sheetCache.clear();
    cachedCompaniesMap = null;
    return;
  }
  const key = getCacheKey(sheetName, spreadsheetId);
  sheetCache.delete(key);
  if (sheetName === 'Companies') {
    cachedCompaniesMap = null;
  }
}

/**
 * Equivalent of getSheetData(sheetName) in Utils.gs
 * Returns all rows EXCEPT the header row (row 0).
 * Uses in-memory cache with TTL and auto-invalidation on write.
 */
export async function getSheetData(
  sheetName: string,
  spreadsheetId = SPREADSHEET_ID,
  skipCache = false
): Promise<any[][]> {
  const cacheKey = getCacheKey(sheetName, spreadsheetId);
  const ttl = getTTLForSheet(sheetName);
  const now = Date.now();

  if (!skipCache) {
    const cached = sheetCache.get(cacheKey);
    if (cached && (now - cached.timestamp < ttl)) {
      // Return a defensive shallow copy of rows
      return cached.data.map(row => (Array.isArray(row) ? [...row] : []));
    }
  }

  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  const rows = res.data.values || [];
  const dataRows = rows.slice(1); // Skip header row

  // Cache fetched data
  sheetCache.set(cacheKey, {
    timestamp: now,
    data: dataRows,
  });

  return dataRows.map(row => (Array.isArray(row) ? [...row] : []));
}

/**
 * Append a new row to a sheet.
 * Equivalent of sheet.appendRow([...]) in Apps Script.
 * Automatically invalidates the cache for the target sheet.
 */
export async function appendRow(sheetName: string, row: any[], spreadsheetId = SPREADSHEET_ID): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  invalidateSheetCache(sheetName, spreadsheetId);
}

/**
 * Update a single cell in a sheet.
 * rowIndex is 1-based (row 1 = header, row 2 = first data row).
 * colIndex is 1-based.
 * Automatically invalidates the cache for the target sheet.
 */
export async function updateCell(
  sheetName: string,
  rowIndex: number,
  colIndex: number,
  value: any,
  spreadsheetId = SPREADSHEET_ID
): Promise<void> {
  const sheets = await getSheetsClient();
  const col = colIndexToLetter(colIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${col}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
  invalidateSheetCache(sheetName, spreadsheetId);
}

/**
 * Update a range of cells in a row.
 * rowIndex is 1-based. startCol is 1-based.
 * Automatically invalidates the cache for the target sheet.
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  startCol: number,
  values: any[],
  spreadsheetId = SPREADSHEET_ID
): Promise<void> {
  const sheets = await getSheetsClient();
  const startColLetter = colIndexToLetter(startCol);
  const endColLetter = colIndexToLetter(startCol + values.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${startColLetter}${rowIndex}:${endColLetter}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
  invalidateSheetCache(sheetName, spreadsheetId);
}

/**
 * Delete a row by its 1-based row index (includes header row).
 * Row 1 = header, Row 2 = first data row.
 * Automatically invalidates the cache for the target sheet.
 */
export async function deleteRow(sheetName: string, rowIndex: number, spreadsheetId = SPREADSHEET_ID): Promise<void> {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
  const sheetId = sheet.properties?.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          }
        }
      }]
    }
  });
  invalidateSheetCache(sheetName, spreadsheetId);
}

/**
 * Build a companies map: { [empresaId]: empresaNombre }
 * Equivalent of getCompaniesMap() in Config.gs
 * Cached with 5-minute TTL or until Companies sheet is updated.
 */
export async function getCompaniesMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCompaniesMap && (now - cachedCompaniesMap.timestamp < STATIC_TTL)) {
    return { ...cachedCompaniesMap.map };
  }

  try {
    const rows = await getSheetData('Companies', COMPANIES_SS_ID);
    const map: Record<string, string> = {};
    for (const row of rows) {
      const id     = String(row[0] || '').trim(); // Column A = empresa ID (stored in Solicitudes)
      const nombre = String(row[1] || '').trim(); // Column B = display name
      if (id) map[id] = nombre || id;
    }
    cachedCompaniesMap = { timestamp: now, map };
    return { ...map };
  } catch {
    return cachedCompaniesMap ? { ...cachedCompaniesMap.map } : {};
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

export function colIndexToLetter(col: number): string {
  let result = '';
  while (col > 0) {
    col--;
    result = String.fromCharCode(65 + (col % 26)) + result;
    col = Math.floor(col / 26);
  }
  return result;
}

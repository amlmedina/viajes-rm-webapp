/**
 * Google Sheets API wrapper
 * Replaces SpreadsheetApp.getActiveSpreadsheet() from Apps Script
 */
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const COMPANIES_SS_ID = process.env.COMPANIES_SS_ID || process.env.SPREADSHEET_ID!;

export const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1SalfWTHMSUVHuaemuyCdY2iUsqAsq4Q2';

function getAuth() {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env variable is not set.');
  const credentials = JSON.parse(keyRaw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function getDriveClient() {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * Equivalent of getSheetData(sheetName) in Utils.gs
 * Returns all rows EXCEPT the header row (row 0)
 */
export async function getSheetData(sheetName: string, spreadsheetId = SPREADSHEET_ID): Promise<any[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  const rows = res.data.values || [];
  return rows.slice(1); // Skip header row
}

/**
 * Append a new row to a sheet.
 * Equivalent of sheet.appendRow([...]) in Apps Script
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
}

/**
 * Update a single cell in a sheet.
 * rowIndex is 1-based (row 1 = header, row 2 = first data row).
 * colIndex is 1-based.
 */
export async function updateCell(sheetName: string, rowIndex: number, colIndex: number, value: any, spreadsheetId = SPREADSHEET_ID): Promise<void> {
  const sheets = await getSheetsClient();
  const col = colIndexToLetter(colIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${col}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

/**
 * Update a range of cells in a row.
 * rowIndex is 1-based. startCol is 1-based.
 */
export async function updateRow(sheetName: string, rowIndex: number, startCol: number, values: any[], spreadsheetId = SPREADSHEET_ID): Promise<void> {
  const sheets = await getSheetsClient();
  const startColLetter = colIndexToLetter(startCol);
  const endColLetter = colIndexToLetter(startCol + values.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${startColLetter}${rowIndex}:${endColLetter}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/**
 * Delete a row by its 1-based row index (includes header row).
 * Row 1 = header, Row 2 = first data row.
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
}

/**
 * Build a companies map: { [empresaId]: empresaNombre }
 * Equivalent of getCompaniesMap() in Config.gs
 */
export async function getCompaniesMap(): Promise<Record<string, string>> {
  try {
    const rows = await getSheetData('Companies', COMPANIES_SS_ID);
    const map: Record<string, string> = {};
    for (const row of rows) {
      const id     = String(row[0] || '').trim(); // Column A = empresa ID (stored in Solicitudes)
      const nombre = String(row[1] || '').trim(); // Column B = display name
      if (id) map[id] = nombre || id;
    }
    return map;
  } catch {
    return {};
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

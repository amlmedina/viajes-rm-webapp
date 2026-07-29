require('dotenv').config();
const { google } = require('googleapis');

async function test() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LEGACY_SS_ID;
  
  const resViajes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Viajes!A1:A',
  });
  console.log("Viajes non-empty rows in column A:", resViajes.data.values ? resViajes.data.values.length : 0);

  const resReservas = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Reservas!A1:A',
  });
  console.log("Reservas non-empty rows in column A:", resReservas.data.values ? resReservas.data.values.length : 0);
  
}
test();

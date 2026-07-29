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
  
  try {
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Reservas!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['TEST_DUMMY_ROW_PLEASE_IGNORE']] }
    });
    console.log("Appended to Reservas:", res.data.tableRange, "->", res.data.updates.updatedRange);
    
    // Clean it up
    const updatedRange = res.data.updates.updatedRange;
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: updatedRange,
    });
  } catch(e) {
    console.log("Error append Reservas:", e.message);
  }
}
test();

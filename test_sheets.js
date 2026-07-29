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
  console.log("Using SS_ID:", spreadsheetId);
  try {
    const info = await sheets.spreadsheets.get({ spreadsheetId });
    console.log("Success! Sheets found:");
    info.data.sheets.forEach(s => console.log(s.properties.title));
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();

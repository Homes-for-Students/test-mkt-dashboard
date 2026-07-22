import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../../google-credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '15Fm6vheTN3X52JAaLL29bO02C_GzYYdVEfiEFtQDWao',
    range: 'A:Z',
  });
  
  const rows = response.data.values;
  
  let headerRowIndex = -1;
  let headers = [];
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowStrs = rows[i].map(h => String(h).trim().toLowerCase());
    if (rowStrs.includes('property') && rowStrs.includes('stock')) {
      headerRowIndex = i;
      headers = rowStrs;
      break;
    }
  }

  const propIdx = headers.indexOf('property');
  const sheetProperties = new Set<string>();
  
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const propName = String(row[propIdx] || '').trim();
    if (propName) {
      sheetProperties.add(propName);
    }
  }

  const dbPath = path.join(__dirname, '../config/propertiesDb.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  const results = [];

  for (const dbProp of dbData) {
    const targetName = dbProp.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (targetName.length <= 3) continue;

    const matches = [];
    for (const sheetProp of sheetProperties) {
      const rowProp = sheetProp.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (rowProp.includes(targetName) || targetName.includes(rowProp)) {
        matches.push(sheetProp);
      }
    }

    if (matches.length > 1) {
      results.push({
        dashboardName: dbProp.name,
        sheetMatches: matches
      });
    }
  }

  if (results.length > 0) {
    console.log("=== MULTIPLE MATCHES FOUND ===");
    results.forEach(res => {
      console.log(`\nDashboard Property: "${res.dashboardName}"`);
      console.log(`Matched Rows in Sheet:`);
      res.sheetMatches.forEach(m => console.log(`  - ${m}`));
    });
  } else {
    console.log("No properties matched multiple rows.");
  }
}

checkSheet().catch(console.error);

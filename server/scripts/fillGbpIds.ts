import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../../../GBP IDs - Sheet1.csv');
const dbPath = path.join(__dirname, '../config/propertiesDb.json');

function run() {
  if (!fs.existsSync(csvPath)) {
    console.log('CSV file not found at:', csvPath);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  const gbpMap: Record<string, { gbpId: string, placeId: string }> = {};
  
  // Parse CSV
  // Header: Location name,Account ID,Location ID,Account name,Google Maps URL,Google Maps place ID
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split carefully by comma considering quotes
    const parts = line.split(',');
    if (parts.length >= 6) {
      // Sometimes "Location name" is quoted, e.g., "Clay Wembley - Alto, Montana & Dakota"
      let locationName = '';
      let accountId = '';
      let locationId = '';
      let placeId = '';

      if (line.startsWith('"')) {
         const endQuote = line.indexOf('"', 1);
         locationName = line.substring(1, endQuote);
         const rest = line.substring(endQuote + 2).split(',');
         accountId = rest[0];
         locationId = rest[1];
         placeId = rest[4]; // 5th item after location name
      } else {
         locationName = parts[0];
         accountId = parts[1];
         locationId = parts[2];
         placeId = parts[5];
      }

      gbpMap[locationName.toLowerCase()] = {
         gbpId: `accounts/${accountId}/locations/${locationId}`,
         placeId: placeId
      };
    }
  }

  // Update propertiesDb.json
  const properties = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  let updatedCount = 0;

  for (const prop of properties) {
    const nameKey = prop.name.toLowerCase();
    
    // Try to find exact match or close match
    let matchData = gbpMap[nameKey];
    if (!matchData) {
      // Try finding without spaces or special characters
      const cleanKey = nameKey.replace(/[^a-z0-9]/g, '');
      const matchKey = Object.keys(gbpMap).find(k => {
         const cleanK = k.replace(/[^a-z0-9]/g, '');
         return cleanK.includes(cleanKey) || cleanKey.includes(cleanK) && cleanK.length > 5;
      });
      if (matchKey) matchData = gbpMap[matchKey];
    }

    if (matchData) {
      prop.googleBusinessProfileId = matchData.gbpId;
      prop.googleMapsPlaceId = matchData.placeId;
      updatedCount++;
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(properties, null, 2), 'utf8');
  console.log(`Successfully updated ${updatedCount} properties with googleBusinessProfileId and googleMapsPlaceId.`);
}

run();

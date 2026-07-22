import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../../../property - Client-level.csv');
const dbPath = path.join(__dirname, '../config/propertiesDb.json');

function run() {
  if (!fs.existsSync(csvPath)) {
    console.log('CSV file not found at:', csvPath);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  const clientMap: Record<string, string> = {};
  
  // Parse CSV
  // Header: Property,City,URL SLUG,Client
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 4) {
      let propertyName = '';
      let clientName = '';

      if (line.startsWith('"')) {
         const endQuote = line.indexOf('"', 1);
         propertyName = line.substring(1, endQuote);
         const rest = line.substring(endQuote + 2).split(',');
         clientName = rest[rest.length - 1].trim(); 
      } else {
         propertyName = parts[0];
         clientName = parts[parts.length - 1].trim();
      }

      clientMap[propertyName.toLowerCase()] = clientName;
    }
  }

  // Update propertiesDb.json
  const properties = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  let updatedCount = 0;

  for (const prop of properties) {
    const nameKey = prop.name.toLowerCase();
    
    let matchClient = clientMap[nameKey];
    if (!matchClient) {
      // Fuzzy match
      const cleanKey = nameKey.replace(/[^a-z0-9]/g, '');
      const matchKey = Object.keys(clientMap).find(k => {
         const cleanK = k.replace(/[^a-z0-9]/g, '');
         return cleanK.includes(cleanKey) || cleanKey.includes(cleanK);
      });
      if (matchKey) matchClient = clientMap[matchKey];
    }

    if (matchClient) {
      prop.client = matchClient;
      updatedCount++;
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(properties, null, 2), 'utf8');
  console.log(`Successfully updated ${updatedCount} properties with client.`);
}

run();

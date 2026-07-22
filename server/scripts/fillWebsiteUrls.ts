import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../../../property - Sheet1.csv');
const dbPath = path.join(__dirname, '../config/propertiesDb.json');

function run() {
  if (!fs.existsSync(csvPath)) {
    console.log('CSV file not found at:', csvPath);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  const urlMap: Record<string, string> = {};
  
  // Parse CSV
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple split by comma (assuming no commas in the property names)
    const parts = line.split(',');
    if (parts.length >= 3) {
      const propertyName = parts[1].trim();
      const url = parts.slice(2).join(',').trim();
      urlMap[propertyName.toLowerCase()] = url;
    }
  }

  // Update propertiesDb.json
  const properties = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  let updatedCount = 0;

  for (const prop of properties) {
    const nameKey = prop.name.toLowerCase();
    
    // Try to find exact match or close match
    let matchUrl = urlMap[nameKey];
    if (!matchUrl) {
      // Try finding without spaces or special characters
      const cleanKey = nameKey.replace(/[^a-z0-9]/g, '');
      const match = Object.keys(urlMap).find(k => k.replace(/[^a-z0-9]/g, '') === cleanKey);
      if (match) matchUrl = urlMap[match];
    }

    if (matchUrl) {
      prop.websiteUrl = matchUrl;
      try {
        const urlObj = new URL(matchUrl);
        prop.ga4PagePath = urlObj.pathname;
      } catch (e) {
        prop.ga4PagePath = '';
      }
      updatedCount++;
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(properties, null, 2), 'utf8');
  console.log(`Successfully updated ${updatedCount} properties with websiteUrl and ga4PagePath.`);
}

run();

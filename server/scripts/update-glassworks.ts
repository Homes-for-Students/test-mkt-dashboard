import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../config/propertiesDb.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const mappings: Record<string, string[]> = {
  "Glassworks": ["Glassworks"],
  "The Glassworks Newcastle": ["The Glassworks"],
  "The Glassworks Leicester": ["The Glassworks Leicester"]
};

for (const prop of dbData) {
  if (mappings[prop.name]) {
    prop.googleSheetNames = mappings[prop.name];
  }
}

fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
console.log("Updated propertiesDb.json with Glassworks mappings");

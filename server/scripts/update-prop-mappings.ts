import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../config/propertiesDb.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const mappings: Record<string, string[]> = {
  "The Green": ["The Green Village", "Townhouses at The Green"],
  "Hassells Bridge Apartments": ["Hassell's Bridge"],
  "Spring Garden": ["Spring Gardens"],
  "St Gabriels": ["St Gabriels Court"],
  "The Printworks": ["The Printworks Exeter"],
  "WAK Derby": ["HMO Derby"],
  "WAK Lancaster": ["HMO Lancaster"],
  "WAK Leicester": ["HMO Leicester"],
  "WAK Lincoln": ["HMO Lincoln"],
  "WAK Liverpool": ["HMO Liverpool"],
  "WAK Manchester": ["HMO Manchester"],
  "WAK Preston": ["HMO Preston"],
  "WAK Salford": ["HMO Salford"],
  "WAK Sheffield": ["HMO Sheffield"]
};

for (const prop of dbData) {
  if (mappings[prop.name]) {
    prop.googleSheetNames = mappings[prop.name];
  }
}

fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
console.log("Updated propertiesDb.json with explicit googleSheetNames");

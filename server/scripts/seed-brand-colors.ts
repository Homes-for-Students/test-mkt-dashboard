import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../config/brandColorsDb.json');

const defaultColors = {
  "city living": { brand: "City Living", backgroundColor: "#0b5f62", textColor: "#ffffff" },
  "gradpad": { brand: "GradPad", backgroundColor: "#8B0000", textColor: "#ffffff" },
  "esl": { brand: "ESL", backgroundColor: "#00ccbb", textColor: "#ffffff" },
  "evo": { brand: "EVO", backgroundColor: "#1d1d1d", textColor: "#d6a62c" },
  "usl": { brand: "USL", backgroundColor: "#870043", textColor: "#ffffff" },
  "uvsl": { brand: "UVSL", backgroundColor: "#3196b8", textColor: "#ffffff" },
  "hfs": { brand: "HFS", backgroundColor: "#f58524", textColor: "#ffffff" },
  "psl": { brand: "PSL", backgroundColor: "#532c3d", textColor: "#ffffff" }
};

fs.writeFileSync(DB_PATH, JSON.stringify(defaultColors, null, 2));
console.log("Brand colors successfully seeded to", DB_PATH);

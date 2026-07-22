import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_PATH = path.join(__dirname, '../config/propertiesDb.json');

async function autoMatchStudentCrowd() {
  const apiKey = process.env.STUDENT_CROWD_API_KEY;
  if (!apiKey) {
    console.error('No STUDENT_CROWD_API_KEY found');
    return;
  }

  let properties: any[] = [];
  try {
    properties = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('Could not load DB', e);
    return;
  }

  console.log(`Loaded ${properties.length} properties. Fetching StudentCrowd halls...`);

  let allHalls: any[] = [];
  try {
    let currentUrl = 'https://data.studentcrowd.net/api/v1.0/halls?size=100';
    while (currentUrl) {
      console.log(`Fetching from ${currentUrl}...`);
      const res = await axios.get(currentUrl, {
        headers: { 'X-Api-Key': apiKey }
      });
      allHalls = allHalls.concat(res.data.data || []);
      currentUrl = res.data.links?.next || null;
    }
    console.log(`Fetched ${allHalls.length} total halls from StudentCrowd.`);
  } catch (err: any) {
    console.error('Failed to fetch halls:', err.message);
    return;
  }

  let matchCount = 0;

  for (const prop of properties) {
    if (prop.studentCrowdId) continue; // Already mapped

    const cleanPropName = prop.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    
    // Exact match or contains match
    const bestMatch = allHalls.find((hall: any) => {
      const cleanHallName = hall.attributes.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      return cleanHallName === cleanPropName || cleanHallName.includes(cleanPropName);
    });

    if (bestMatch) {
      prop.studentCrowdId = bestMatch.id;
      console.log(`✅ Mapped [${prop.name}] -> [${bestMatch.attributes.name}] (${bestMatch.id})`);
      matchCount++;
    }
  }

  if (matchCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(properties, null, 2));
    console.log(`\nSuccessfully mapped ${matchCount} properties to StudentCrowd IDs and saved to DB!`);
  } else {
    console.log('\nNo new matches found.');
  }
}

autoMatchStudentCrowd();

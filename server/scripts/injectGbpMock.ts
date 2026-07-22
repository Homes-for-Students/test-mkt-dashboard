import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATS_PATH = path.join(__dirname, '../config/gbpStats.json');
const stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));

function generateMockInsights() {
  const data = { WEBSITE_CLICKS: {} as Record<string, number>, CALL_CLICKS: {} as Record<string, number> };
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 180);
  
  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    
    // Website clicks: ~5-15 per day
    data.WEBSITE_CLICKS[key] = Math.floor(Math.random() * 11) + 5;
    // Call clicks: ~0-3 per day
    data.CALL_CLICKS[key] = Math.floor(Math.random() * 4);
  }
  return data;
}

stats.properties['prop-1783605396892-0'] = {
  reviews: 142,
  rating: 4.6,
  insights: generateMockInsights()
};

stats.properties['prop-1783605396892-1'] = {
  reviews: 98,
  rating: 4.2,
  insights: generateMockInsights()
};

fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
console.log('Injected realistic mock data for 200 Cowgate and 26 Great George Street into gbpStats.json!');

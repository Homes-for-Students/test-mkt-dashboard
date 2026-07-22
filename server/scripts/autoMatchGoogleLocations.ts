import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_PATH = path.join(__dirname, '../config/googleToken.json');
const DB_PATH = path.join(__dirname, '../config/propertiesDb.json');

async function run() {
  if (!fs.existsSync(TOKEN_PATH)) {
    console.log('No Google Token found. Please connect via dashboard first.');
    return;
  }

  const GOOGLE_CLIENT_ID = process.env.GBP_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GBP_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.log('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return;
  }

  const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  let tokenPath = fs.existsSync(path.join(__dirname, '../config/gbpToken.json')) 
    ? path.join(__dirname, '../config/gbpToken.json') 
    : TOKEN_PATH;
  const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  oauth2Client.setCredentials(tokenData);

  try {
    const token = await oauth2Client.getAccessToken();
    const accessToken = token.token;

    console.log('Fetching Google Business Profile accounts...');
    const accountsRes = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const accounts = accountsRes.data.accounts || [];

    if (accounts.length === 0) {
      console.log('No Google Business Profile accounts found for this user.');
      return;
    }

    const allLocations: any[] = [];
    
    for (const account of accounts) {
      console.log(`Fetching locations for account: ${account.accountName} (${account.name})`);
      try {
        let nextPageToken = '';
        do {
          const locsRes = await axios.get(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              readMask: 'name,title,storeCode',
              pageSize: 100,
              pageToken: nextPageToken || undefined
            }
          });
          
          if (locsRes.data.locations) {
            allLocations.push(...locsRes.data.locations);
          }
          nextPageToken = locsRes.data.nextPageToken;
        } while (nextPageToken);
      } catch (err: any) {
        console.error(`Failed to fetch locations for ${account.name}`, err.response?.data || err.message);
      }
    }

    console.log(`Found ${allLocations.length} locations across all accounts.`);

    const properties = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let matchCount = 0;

    for (const prop of properties) {
      if (prop.googleBusinessProfileId) continue; // Skip if already set
      
      const cleanPropName = prop.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Try to find a matching location
      const match = allLocations.find(loc => {
        const titleClean = (loc.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        // e.g. "ARK Canning Town" -> "arkcanningtown"
        return titleClean.includes(cleanPropName) || cleanPropName.includes(titleClean) && titleClean.length > 5;
      });

      if (match) {
        prop.googleBusinessProfileId = match.name; // e.g. locations/12345
        console.log(`Mapped [${prop.name}] -> [${match.title}] (${match.name})`);
        matchCount++;
      }
    }

    if (matchCount > 0) {
      fs.writeFileSync(DB_PATH, JSON.stringify(properties, null, 2), 'utf8');
      console.log(`\nSuccessfully auto-matched and saved ${matchCount} Google Business Profiles!`);
    } else {
      console.log('\nNo matching properties found to update.');
    }

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

run();

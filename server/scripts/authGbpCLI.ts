import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = 3001;
const redirectUri = `http://localhost:${PORT}/callback`;

const oauth2Client = new google.auth.OAuth2(
  process.env.GBP_CLIENT_ID,
  process.env.GBP_CLIENT_SECRET,
  redirectUri
);

const app = express();

app.get('/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    res.send('No code provided');
    return;
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(path.join(__dirname, '../config/gbpToken.json'), JSON.stringify(tokens, null, 2));
    res.send('<h1>Success! gbpToken.json created.</h1><p>You can close this tab and go back to the chat.</p>');
    console.log('[SUCCESS] gbpToken.json generated successfully!');
    process.exit(0);
  } catch (err: any) {
    res.send(`Error: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
});

const server = app.listen(PORT, () => {
  const scopes = [
    'https://www.googleapis.com/auth/business.manage'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });

  console.log('==============================================');
  console.log('PLEASE CLICK THIS URL TO AUTHENTICATE YOUR NEW PROJECT:');
  console.log(url);
  console.log('==============================================');
});

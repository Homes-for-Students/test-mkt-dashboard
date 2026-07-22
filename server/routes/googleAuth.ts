import { Express, Request, Response } from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_PATH = path.join(__dirname, '../config/googleToken.json');

// Ensure config dir exists
if (!fs.existsSync(path.join(__dirname, '../config'))) {
  try {
    fs.mkdirSync(path.join(__dirname, '../config'), { recursive: true });
  } catch (e) {
    console.warn("[GoogleAuth] Could not create config directory (likely read-only filesystem).");
  }
}

export function registerGoogleOAuthRoutes(app: Express) {
  app.get('/api/google-auth/url', (req: Request, res: Response) => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env' });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/google-auth/callback'
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/adwords'
      ],
    });

    res.redirect(url);
  });

  app.get('/api/google-auth/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send('No code provided');
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).send('Missing Google Client Credentials');
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/google-auth/callback'
    );

    try {
      const { tokens } = await oauth2Client.getToken(code);
      // Save tokens
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      
      res.redirect('/properties?google-auth=success');
    } catch (err) {
      console.error('[Google OAuth] Error exchanging code', err);
      res.status(500).send('Error exchanging code for token');
    }
  });
}

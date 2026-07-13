import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { SheetsService } from './sheetsService.js';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Initialize AI and Sheets Service
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sheetsService = new SheetsService();

// Existing test route
app.get('/api/test-sheet', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    const sheets = google.sheets({ version: 'v4', auth });
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: '1qKm3c24mTWiol88rHdiQnUY5tzNuNgygzFg2TCSMcWw',
      range: 'Sheet1!A1:B2',
    });
    res.json({ status: 'Connected!', data: data.data.values });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Route Interceptor (Option B) for live inventory context
app.post('/api/chat', async (req, res) => {
  try {
    const { message, previousMessages = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Intercept: Fetch latest Google Sheet data
    const inventoryContext = await sheetsService.getLiveInventoryContext();

    // 2. Inject context into system instructions
    const systemInstruction = `You are a helpful assistant for MG Creations. Here is the latest, live inventory data directly from our Google Sheet:\n\n${inventoryContext}\n\nUse this information accurately when answering customer queries about stock, prices, or product availability. Keep your answers concise and friendly.`;

    // 3. Forward request to Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction,
      }
    });

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

import path from 'path';

// Serve static files from the 'dist' directory (frontend build)
app.use(express.static(path.join(process.cwd(), 'dist')));

// Catch-all route to serve the React app for any unhandled requests (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
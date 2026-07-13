import { google } from 'googleapis';

export class SheetsService {
    private sheets;
    private spreadsheetId = '1qKm3c24mTWiol88rHdiQnUY5tzNuNgygzFg2TCSMcWw';

    constructor() {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        this.sheets = google.sheets({ version: 'v4', auth });
    }

    async getLiveInventoryContext(): Promise<string> {
        try {
            const data = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Sheet1!A1:Z50',
            });

            const rows = data.data.values;
            if (!rows || rows.length === 0) {
                return 'No inventory data found.';
            }

            // Format simple CSV-like text
            const formattedRows = rows.map(row => row.join(' | ')).join('\n');
            return formattedRows;
        } catch (err: any) {
            console.error('Error fetching live sheet context:', err);
            return 'Inventory context is currently unavailable.';
        }
    }
}
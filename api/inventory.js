import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

/**
 * Serverless function to fetch inventory from Google Sheets.
 * Uses Google Service Account for secure authentication.
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY_BASE64
      ? Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
      : '';

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // Assume 'Inventory' is the first sheet
    const sheet = doc.sheetsByTitle['Inventory'];
    const rows = await sheet.getRows();

    const inventory = rows.map(row => ({
      name: row.get('Name'),
      price: row.get('Price'),
      image: row.get('ImageURL'),
      status: row.get('Status'),
      description: row.get('Description'),
    }));

    return res.status(200).json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ message: 'Failed to fetch inventory', error: error.message });
  }
}

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
    console.log('Inventory API called');
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY_BASE64 || !process.env.GOOGLE_SHEET_ID) {
      console.error('Missing Google Sheets environment variables');
      return res.status(500).json({ 
        message: 'Server configuration error: Missing environment variables',
        details: {
          hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          hasKey: !!process.env.GOOGLE_PRIVATE_KEY_BASE64,
          hasSheetId: !!process.env.GOOGLE_SHEET_ID
        }
      });
    }

    const privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    
    console.log('Loading Google Sheet info...');
    await doc.loadInfo();
    console.log('Sheet loaded successfully:', doc.title);

    // Ensure the 'Inventory' sheet exists
    const sheet = doc.sheetsByTitle['Inventory'];
    if (!sheet) {
      const availableTabs = Object.keys(doc.sheetsByTitle);
      console.error(`Sheet "Inventory" not found. Available tabs: [${availableTabs.join(', ')}]`);
      return res.status(404).json({ 
        message: 'Inventory sheet not found. Check if the tab name is exactly "Inventory".',
        availableTabs 
      });
    }

    const rows = await sheet.getRows();
    console.log(`Fetched ${rows.length} rows from Inventory`);

    const inventory = rows.map(row => ({
      name: row.get('Name'),
      price: row.get('Price'),
      image: row.get('ImageURL'),
      status: row.get('Status'),
      description: row.get('Description'),
    }));

    return res.status(200).json(inventory);
  } catch (error) {
    console.error('CRITICAL: Error fetching inventory:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch inventory', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

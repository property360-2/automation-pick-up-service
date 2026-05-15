import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

/**
 * Serverless function to sync existing orders into the 'Sales Intelligence' sheet.
 * This flattens the JSON 'Items' column from the 'Orders' sheet into individual rows.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const ordersSheet = doc.sheetsByTitle['Orders'];
    let analyticsSheet = doc.sheetsByTitle['Sales Intelligence'];

    if (!ordersSheet) {
      return res.status(404).json({ message: 'Orders sheet not found' });
    }

    // Create Analytics sheet if it doesn't exist
    if (!analyticsSheet) {
      analyticsSheet = await doc.addSheet({ 
        title: 'Sales Intelligence', 
        headerValues: ['OrderID', 'ItemName', 'Category', 'Price', 'Quantity', 'Subtotal', 'Timestamp', 'Customer'] 
      });
    }

    // Clear existing data to avoid duplicates during sync (optional, but safer for a clean sync)
    await analyticsSheet.clearRows();

    const rows = await ordersSheet.getRows();
    const allSalesRows = [];

    rows.forEach(row => {
      try {
        const items = JSON.parse(row.get('Items'));
        items.forEach(item => {
          allSalesRows.push({
            OrderID: row.get('OrderID'),
            ItemName: item.name,
            Category: item.description?.split(' ')[0] || 'General',
            Price: item.price,
            Quantity: item.quantity || 1,
            Subtotal: (parseFloat(item.price.toString().replace(/[^\d.]/g, '')) * (item.quantity || 1)).toFixed(2),
            Timestamp: row.get('Timestamp'),
            Customer: row.get('CustomerEmail')
          });
        });
      } catch (e) {
        console.error(`Error parsing items for order ${row.get('OrderID')}:`, e);
      }
    });

    if (allSalesRows.length > 0) {
      await analyticsSheet.addRows(allSalesRows);
    }

    return res.status(200).json({ 
      message: 'Analytics sync completed successfully', 
      processedOrders: rows.length,
      totalSalesEntries: allSalesRows.length 
    });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ message: 'Sync failed', error: error.message });
  }
}

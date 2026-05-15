import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

/**
 * Serverless function for Admin to fetch all orders.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // TODO: Add proper Admin Auth check here (Firebase Custom Claims)
  
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

    const sheet = doc.sheetsByTitle['Orders'];
    const rows = await sheet.getRows();

    // Group rows by OrderID
    const ordersMap = {};

    rows.forEach(row => {
      const orderId = row.get('OrderID');
      if (!ordersMap[orderId]) {
        ordersMap[orderId] = {
          orderId: orderId,
          customerName: row.get('CustomerName'),
          customerEmail: row.get('CustomerEmail'),
          status: row.get('Status'),
          timestamp: row.get('Timestamp'),
          items: [],
          total: 0,
        };
      }
      
      const itemTotal = parseFloat(row.get('ItemTotal') || 0);
      ordersMap[orderId].items.push({
        name: row.get('ProductName'),
        price: row.get('Price'),
        quantity: row.get('Quantity'),
        itemTotal: itemTotal,
      });
      ordersMap[orderId].total += itemTotal;
    });

    const orders = Object.values(ordersMap).map(order => ({
      ...order,
      total: order.total.toFixed(2),
    }));

    // Sort by most recent
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json(orders);
  } catch (error) {
    console.error('Admin fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
}

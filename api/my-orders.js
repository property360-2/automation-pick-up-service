/**
 * @file my-orders.js
 * @description Secure endpoint for retrieving a specific user's order history from the Google Sheets backend.
 * Filters data by customer email to ensure privacy.
 */

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';


/**
 * GET /api/my-orders
 * Returns a list of orders matching the provided email query parameter.
 * @param {import('@vercel/node').VercelRequest} req 
 * @param {import('@vercel/node').VercelResponse} res 
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email parameter is required for synchronization.' });
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

    const orderSheet = doc.sheetsByTitle['Orders'];
    if (!orderSheet) {
      return res.status(500).json({ message: 'Order database not initialized.' });
    }

    const rows = await orderSheet.getRows();
    
    // Group rows by OrderID for the specific email
    const ordersMap = {};

    rows.forEach(row => {
      const customerEmail = row.get('CustomerEmail');
      if (customerEmail?.toLowerCase() === email.toLowerCase()) {
        const orderId = row.get('OrderID');
        if (!ordersMap[orderId]) {
          ordersMap[orderId] = {
            orderId: orderId,
            customerName: row.get('CustomerName'),
            customerEmail: customerEmail,
            status: row.get('Status') || 'Pending',
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
      }
    });

    const userOrders = Object.values(ordersMap)
      .map(order => ({
        ...order,
        total: order.total.toFixed(2),
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first

    return res.status(200).json(userOrders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ message: 'Failed to retrieve order history from secure backbone.', error: error.message });
  }
}

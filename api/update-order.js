import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Serverless function to update order status.
 * Sends 'Ready for Pickup' email when status changes to 'Ready'.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { orderId, newStatus, customerEmail, customerName } = req.body;

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
    
    // Find the row by OrderID
    const row = rows.find(r => r.get('OrderID') === orderId);
    
    if (!row) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update the status column
    row.set('Status', newStatus);
    await row.save();

    // If status is 'Ready', send the pickup notification
    if (newStatus === 'Ready') {
      await resend.emails.send({
        from: process.env.SMTP_FROM_EMAIL || 'notifications@resend.dev',
        to: customerEmail,
        subject: `Your Order is Ready for Pickup! - ${orderId}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #10b981;">Good news, ${customerName}!</h2>
            <p>Your order <strong>${orderId}</strong> is now packed and ready for pickup at our store.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Pickup Location:</strong> Main Branch</p>
              <p style="margin: 5px 0 0 0;"><strong>Hours:</strong> 9:00 AM - 6:00 PM</p>
            </div>
            <p>Please present your Order ID when you arrive.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">&copy; 2026 Property360 Pickup Service</p>
          </div>
        `,
      });
    }

    return res.status(200).json({ message: `Order status updated to ${newStatus}` });
  } catch (error) {
    console.error('Update order error:', error);
    return res.status(500).json({ message: 'Failed to update order', error: error.message });
  }
}

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Serverless function to handle order creation.
 * 1. Appends order to Google Sheets.
 * 2. Sends confirmation email via Resend.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { customerName, customerEmail, items, total, orderId } = req.body;

  try {
    // 1. Setup Google Auth
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

    // 2. Write to 'Orders' sheet
    const sheet = doc.sheetsByTitle['Orders'];
    await sheet.addRow({
      OrderID: orderId,
      CustomerName: customerName,
      CustomerEmail: customerEmail,
      Items: JSON.stringify(items),
      Total: total,
      Status: 'Pending',
      Timestamp: new Date().toISOString(),
    });

    // 3. Send Confirmation Email
    await resend.emails.send({
      from: process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev',
      to: customerEmail,
      subject: `Order Confirmed - ${orderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #3b82f6;">Thanks for your order, ${customerName}!</h2>
          <p>We've received your order <strong>${orderId}</strong> and we're preparing it for pickup.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Total Amount:</strong> ₱${total}</p>
          <p>You'll receive another email once your items are ready for pickup.</p>
          <p style="color: #666; font-size: 12px; margin-top: 40px;">&copy; 2026 Property360 Pickup Service</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'Order created successfully' });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
}

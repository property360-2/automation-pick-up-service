import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import nodemailer from 'nodemailer';

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Serverless function to handle order creation.
 * 1. Appends order to Google Sheets.
 * 2. Sends confirmation email via Gmail SMTP.
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

    // 2. Write to 'Orders' sheet (Denormalized/Flat Structure)
    const sheet = doc.sheetsByTitle['Orders'];
    if (!sheet) {
      const availableTabs = Object.keys(doc.sheetsByTitle);
      console.error(`Sheet "Orders" not found. Available tabs: [${availableTabs.join(', ')}]`);
      return res.status(404).json({ 
        message: 'Orders sheet not found. Check if the tab name is exactly "Orders".',
        availableTabs 
      });
    }

    const timestamp = new Date().toISOString();
    
    // Create rows for each item in the order
    const orderRows = items.map(item => ({
      OrderID: orderId,
      CustomerName: customerName,
      CustomerEmail: customerEmail,
      Timestamp: timestamp,
      Status: 'Pending',
      ProductName: item.name,
      Price: item.price,
      Quantity: item.quantity || 1,
      ItemTotal: (parseFloat(item.price.toString().replace(/[^\d.]/g, '')) * (item.quantity || 1)).toFixed(2),
    }));

    await sheet.addRows(orderRows);

    // 3. Send Confirmation Email via Gmail
    console.log('Attempting to send email to:', `"${customerEmail}"`);
    try {
      const pickupTime = new Date(Date.now() + 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const itemsList = items.map(item => `
        <li style="margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span>${item.name} x${item.quantity || 1}</span>
          <span style="color: #3b82f6; font-weight: bold;">₱${(parseFloat(item.price.toString().replace(/[^\d.]/g, '')) * (item.quantity || 1)).toFixed(2)}</span>
        </li>
      `).join('');

      const mailOptions = {
        from: `Automation Showcase <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `Order Confirmed - ${orderId}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #3b82f6;">Thanks for your order, ${customerName}!</h2>
            <p>We've received your order <strong>${orderId}</strong> and we're preparing it for pickup.</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Items Ordered</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${itemsList}
              </ul>
              <div style="border-top: 1px solid #e2e8f0; margin-top: 15px; pt: 15px; display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;">
                <span>Total Amount</span>
                <span style="color: #3b82f6;">₱${total}</span>
              </div>
            </div>

            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #065f46;">
                🚀 You can now pick up your order at ${pickupTime} (within the next 30 minutes).
              </p>
            </div>

            <p style="background: #fff7ed; border: 1px solid #ffedd5; color: #9a3412; padding: 12px; border-radius: 6px; font-size: 13px; margin: 20px 0;">
              <strong>⚠️ Demo System Notice:</strong> This is an automated demo. Orders placed here are NOT real and are for simulation purposes only. The system can be fully customized to meet specific business requirements.
            </p>

            <p style="color: #666; font-size: 12px; margin-top: 40px;">&copy; 2026 Automation Showcase Pickup Service</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully via Gmail:', info.messageId);
    } catch (emailError) {
      console.error('Gmail SMTP Error:', emailError);
      // We still return 200 because the order was saved to Sheets
    }

    return res.status(200).json({ message: 'Order created successfully' });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
}

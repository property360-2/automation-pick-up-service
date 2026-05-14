# Google Sheets Database Setup Guide

This guide will help you set up your 100% free "database" using Google Sheets.

## Phase 1: Create the Spreadsheet

1.  Create a new [Google Sheet](https://sheets.new).
2.  Name the first tab **Inventory** and add these headers:
    *   `Name`, `Price`, `ImageURL`, `Status`, `Description`
3.  Create a second tab named **Orders** and add these headers:
    *   `OrderID`, `CustomerName`, `CustomerEmail`, `Items`, `Total`, `Status`, `Timestamp`
4.  **Copy the Spreadsheet ID** from the URL:
    *   `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`

---

## Phase 2: Create a Service Account (Your "Database User")

To let the app read/write to your sheet, we need a Service Account.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (e.g., "Pickup Service").
3.  Go to **APIs & Services > Library** and enable the **Google Sheets API**.
4.  Go to **APIs & Services > Credentials**.
5.  Click **Create Credentials > Service Account**.
6.  Name it "sheet-access" and click **Done**.
7.  Click on the newly created Service Account email.
8.  Go to the **Keys** tab -> **Add Key -> Create New Key -> JSON**.
9.  A file will download. Open it—this contains your `client_email` and `private_key`.

---

## Phase 3: Grant Access to the Sheet

1.  Open your Google Sheet.
2.  Click the **Share** button.
3.  Paste the **Service Account Email** (e.g., `sheet-access@project-id.iam.gserviceaccount.com`).
4.  Give it **Editor** permissions.
5.  Click **Send**.

---

## Phase 4: Configure Environment Variables

Create a `.env` file in the root of your project and fill in the values from your JSON key and Spreadsheet ID:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_sheet_id

# Email (Get from Resend.com)
RESEND_API_KEY=re_123...
SMTP_FROM_EMAIL=onboarding@resend.dev
```

> [!TIP]
> Make sure the `GOOGLE_PRIVATE_KEY` is wrapped in quotes and all `\n` characters are preserved.

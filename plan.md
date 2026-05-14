Here's a clear concept plan for your Online Pickup System, organized by layer.Here's the full concept breakdown:

---

## The four technology pillars

**Firebase Auth** handles all identity. Users sign up / log in with email+password or Google SSO. This gates the ordering flow — only authenticated users can place orders. Admins get a separate role claim (custom claims in Firebase) that unlocks the store-side dashboard.

**Firestore** is your main database. Two core collections: `orders` (each document = one order, with status field like `pending → ready → picked_up`) and `products` (your inventory). Firestore's real-time listeners let the customer's order status page update live without refreshing.

**Google Sheets API** is your public-facing inventory display. Your admin updates a Google Sheet with product names, availability, and prices. The app reads from it via the API and renders it as a view-only catalog — no login required to browse. This is the "view only" public layer you mentioned.

**SMTP / email sending** fires at key moments via a backend trigger: order confirmation when placed, and a "your order is ready for pickup" notification when the admin marks it ready. You can use any SMTP provider (Gmail SMTP, Resend, Mailgun, etc.).

---

## The user flow

1. Customer lands on the site → browses the public inventory (pulled from Google Sheets, read-only)
2. Customer signs in via Firebase Auth to proceed
3. Customer selects items → places order → Firestore document is created → confirmation email fires
4. Admin logs in to the dashboard → sees all pending orders → marks one as "ready"
5. Firestore trigger fires the "ready for pickup" email to the customer
6. Customer comes to the store → admin marks it `picked_up` → order is archived

---

## The automation angle (what showcases your skills)

The smart part is the **Firestore trigger chain**: when an order document's `status` field changes to `ready`, a backend function (Firebase Cloud Function or a lightweight server) automatically calls your SMTP service to send the email. No manual step. This is the automation — a database event drives a downstream action without human intervention.

The Google Sheets sync can also be automated: a scheduled script (cron or Cloud Scheduler) reads Firestore product data and pushes it to the Sheet, so the public view always reflects current stock.

---

## What to build (scope for a demo)

| Page | Who sees it | Tech |
|---|---|---|
| Inventory browse | Anyone (public) | Google Sheets API read |
| Login / register | Customer | Firebase Auth |
| Order form + cart | Logged-in customer | Firestore write |
| Order status page | Logged-in customer | Firestore real-time listener |
| Admin dashboard | Admin role only | Firestore read + status update |

This is lean enough to build solo but demonstrates all five skills you listed: Sheets API, Firebase Auth, Firestore, SMTP email, and event-driven automation. Want me to suggest a tech stack (frontend framework, hosting, etc.) or map out the data schema next?
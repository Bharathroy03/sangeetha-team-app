# Sangeetha Mobiles - Customer Entry Web Application

A full-stack web application designed for the Sangeetha team to enter customer sales data. It utilizes a Python Flask backend, a local JSON database, and a highly polished dark glassmorphic frontend built using HTML, CSS, and JavaScript.

## Tech Stack
- **Backend**: Python 3, Flask
- **Frontend**: HTML5, CSS3 (Glassmorphism, responsive grids), Vanilla JS (Fetch API, custom component animations, Web Audio API synthesizer)
- **Database**: Local JSON file storage (`data/customers.json`)

## Directory Structure
```
/sangeetha-team-app
├── app.py                  # Flask server and APIs
├── requirements.txt        # Backend dependencies
├── README.md               # Documentation
├── /templates
│   ├── login.html          # Login portal page
│   └── dashboard.html      # Main data entry dashboard
├── /static
│   ├── /css
│   │   └── style.css       # Obsidian & Crimson glassmorphism style rules
│   └── /js
│       └── app.js          # Forms, mock barcode scanner, validations, stats calculation
└── /data
    └── customers.json      # Sales record persistent file
```

## Features
1. **Premium Responsive Styling**: Dark mode using an obsidian black and crimson red scheme. Soft transparent cards, input shadow focuses, hover zooms, and error shake notifications.
2. **52nd Anniversary Celebration Branding**: Celebrate Sangeetha's 52nd year with custom badges and banner branding.
3. **Session Authentication**: Secure session handling restricting `/dashboard` and customer APIs to logged-in users.
4. **Conditional Form Logic**: Selecting "EMI" dynamically renders and enforces the selection of a "Finance Option" (Bajaj, HDFC, IDFC, TVS, Home Credit).
5. **Form Field Validations**:
   - Customer Name is mandatory.
   - Mobile number is validated to be exactly 10 digits.
   - IMEI is validated to be exactly 15 digits.
6. **Barcode Scanner Simulator**: Click the scanner button in the IMEI field to trigger a scanner simulation:
   - Plays a standard 1000Hz scanner success beep using the browser's Web Audio API.
   - Generates and populates a realistic 15-digit IMEI.
7. **Real-time Live Stats & Table**: Left-side cards automatically count "Today's", "Finance", and "Other" customers. On submission, lists and stats increment dynamically using animated transitions.

## Predefined Login Credentials
To access the team dashboard, sign in with the following default account:
- **Username**: `admin`
- **Password**: `sangeetha123`

Alternative sales accounts configured:
- `sales1` / `sales123`
- `sales2` / `sales234`

## Setup & Running the Application

1. **Install Python Dependencies**:
   Ensure you have Python 3 installed. Navigate to the root directory and install requirements:
   ```bash
   pip install -r requirements.txt
   ```

2. **Launch the Flask Server**:
   Start the application:
   ```bash
   python app.py
   ```
   The application will run locally at `http://localhost:5000/`.

3. **Access the Site**:
   Open your browser and navigate to: [http://localhost:5000/](http://localhost:5000/)

## Payment Tracking Module (New)

The application has been extended with a robust Cash, Card, and E-Wallet Sales Tracking module that allows staff to record payments, manage partial collection timelines, and monitor customer and salesperson debts.

### Key Features
1. **Multi-mode Payment Tracking**: Records sales with specific payment modes: Cash, Card, or E-Wallet.
2. **Outstanding Debts Management**: Automatically calculates pending balance. If there is a pending balance, it dynamically asks for:
   - **Pending From**: (Customer / Employee & Salesperson / No Pending)
   - **Pending Person Name**: (Specify employee/salesperson name for tracking)
   - **Due Date**: (Prominent due date deadline picker)
3. **Dedicated Debt Ledgers**:
   - **Customer Debts Tab**: Displays unsettled customer bills, enabling partial installment additions or full balance clearance.
   - **Salesperson Pending Tab**: Aggregates employee-owned balances, displaying the number of pending cases, total outstanding sum, and oldest due date (marked "Overdue" or "Active").
4. **Interactive Modal Selector Dropdowns**: Replaces standard select menus with polished custom modal popup menus to align with premium touch-screen devices.
5. **Detailed Transaction Timelines**: View details modal lists the complete history of initial and subsequent installments with collector username, timestamp, and notes.
6. **Dashboard Synchronization**: The homepage dashboard highlights 5 new KPI cards:
   - Today Cash Sales
   - Today Card Sales
   - Today E-Wallet Sales
   - Today Pending Amount
   - Total Unsettled Amount

### Data Schema
All payment records are stored inside `data/payments.json` using the following schema structure:
```json
{
  "payment_id": "PAY-1001",
  "customer_name": "Suresh Kumar",
  "mobile_number": "9876543210",
  "invoice_number": "INV-2026-001",
  "item_model": "Samsung Galaxy S24 Ultra",
  "imei_number": "359876123456789",
  "sales_person": "Bharath Kumar - Manager",
  "payment_mode": "Cash",
  "total_bill_amount": 124999.0,
  "amount_received": 100000.0,
  "pending_amount": 24999.0,
  "pending_from": "Customer",
  "pending_person_name": "",
  "due_date": "2026-06-15",
  "payment_status": "Partially Paid",
  "settlement_status": "Unsettled",
  "remarks": "Pending balance till mid-month salary credit.",
  "created_at": "2026-06-02 20:00:00",
  "updated_at": "2026-06-02 20:00:00",
  "created_by": "admin",
  "payment_history": [
    {
      "date_time": "2026-06-02 20:00:00",
      "amount_added": 100000.0,
      "received_by": "admin",
      "remarks": "Initial billing payment."
    }
  ]
}
```

### Payment API Endpoints
- `GET /payment-tracker` - Render payment tracker dashboard UI (protected)
- `GET /api/payment-summary` - Aggregate metrics for dashboard homepage & tracker cards
- `GET /api/payments` - Retrieve all payment records with filters (date range, mode, status, salesperson, search)
- `POST /api/payments` - Record a new sale/payment entry with validation
- `PUT /api/payments/<payment_id>` - Edit customer or billing info (adds history adjustment log)
- `DELETE /api/payments/<payment_id>` - Remove payment logs
- `POST /api/payments/<payment_id>/partial-payment` - Append installment amount (calculates new status and tracks history)
- `POST /api/payments/<payment_id>/mark-paid` - Fully clear remaining outstanding debt in a single click

---

## User Roles & Permission System (RBAC)

The application supports three levels of role-based credentials:
1. **super_admin** (Employee ID: `22913` / Password: `Sang@1974`): Full system access, CRUD operations on users, customer records, database, edit requests, and settings.
2. **admin** (Employee ID: `6909` / Password: `Sang@1974`): Full system access, similar to super admin.
3. **store_employee** (Employee ID: `SMPL` / Password: `Sang@1974`): Limited to viewing the dashboard, entering customers, and reading customer history. Direct edit/delete is blocked.

---

## Customer Entry Management System (CEMS)

CEMS enforces structured data entry with strict backend checks and dynamic frontend fields:
- **Finance Mode**: Down Payment mode/value are required. Payment split fields are zeroed.
- **Non-Finance Mode**: Split calculations (Cash, Card, E-Wallet) are verified. At least one payment split must be greater than zero.
- **Exchange Details**: Dynamic validation of brand and positive numeric value.
- **Customer Name**: Input is auto-capitalized.
- **IMEI**: Verified to be exactly 15 numeric digits.

---

## Edit Request & Approval Workflow

Store employees cannot modify customer records directly. Instead, they submit an **Edit Request** containing target customer ID, reason for change, and proposed modifications.

### Edit Request Schema
```json
{
  "request_id": "REQ-1001",
  "customer_id": "CUST-1001",
  "requested_by": "SMPL",
  "requested_role": "store_employee",
  "original_data": {},
  "proposed_data": {},
  "reason": "Correcting typo in customer name.",
  "status": "pending",
  "admin_remarks": "",
  "approved_by": "",
  "approved_at": "",
  "rejected_by": "",
  "rejected_at": "",
  "created_at": "2026-06-03 12:00:00"
}
```

### Approval & Rejection APIs
- `GET /customers/<customer_id>/request-edit` - Render the temporary edit request form populated with existing customer data
- `POST /api/customers/<customer_id>/edit-request` - Submit a new edit request (Store Employee only). Checks for duplicate pending requests by the same user.
- `GET /admin/edit-requests` - View pending edit request submissions (Admin/Super Admin only)
- `GET /api/edit-requests` - Fetch all edit requests (Admin/Super Admin only)
- `POST /api/edit-requests/<request_id>/approve` - Approve request and merge changes into original record (Admin/Super Admin only)
- `POST /api/edit-requests/<request_id>/reject` - Reject the edit request (Admin/Super Admin only). Requires `admin_remarks` in request body.




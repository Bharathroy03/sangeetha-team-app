import os
import json
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
# In production, this secret key should be loaded from environment variables
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'sangeetha_super_secret_session_key')

# Path to our customers JSON database
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
CUSTOMERS_FILE = os.path.join(DATA_DIR, 'customers.json')
PAYMENTS_FILE = os.path.join(DATA_DIR, 'payments.json')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
EDIT_REQUESTS_FILE = os.path.join(DATA_DIR, 'customer_edit_requests.json')
CRM_WALKIN_CUSTOMERS_FILE = os.path.join(DATA_DIR, 'crm_walkin_customers.json')

WHITELIST_FILES = {
    'customers.json': CUSTOMERS_FILE,
    'crm_walkin_customers.json': CRM_WALKIN_CUSTOMERS_FILE,
    'customer_edit_requests.json': EDIT_REQUESTS_FILE,
    'users.json': USERS_FILE,
    'payments.json': PAYMENTS_FILE
}

# SQLAlchemy imports and initialization
from database import db, User, Customer, CRMWalkin, Payment, PaymentHistory, EditRequest, AuditLog, seed_database_from_json

# Database Configuration
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    # Supabase PostgreSQL direct database is default (uumcsdvssgejpygxuxmj)
    import urllib.parse
    escaped_password = urllib.parse.quote_plus("s,4U9JX!R_t&!cj")
    db_url = f"postgresql://postgres:{escaped_password}@db.uumcsdvssgejpygxuxmj.supabase.co:5432/postgres"

if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

try:
    with app.app_context():
        db.create_all()
        seed_database_from_json(DATA_DIR)
except Exception as e:
    print(f"[CRITICAL] Database initialization failed at startup: {e}")


from permissions import ROLE_PERMISSIONS

def load_users():
    """Load user list from SQL database."""
    users = User.query.all()
    if not users:
        # Check/seed defaults
        defaults = [
            ("USR-1001", "Bharath Kumar R", "22913", "Bharathroy@03", "super_admin"),
            ("USR-1002", "Admin", "6909", "Sang@1974", "admin"),
            ("USR-1003", "Sangeetha", "SMPL", "Sang@1974", "store_employee")
        ]
        for uid, name, emp_id, pwd, role in defaults:
            db.session.add(User(
                user_id=uid,
                username=name,
                employee_id=emp_id,
                password_hash=generate_password_hash(pwd),
                role=role,
                status="active",
                created_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                updated_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
        db.session.commit()
        users = User.query.all()
    return [u.to_dict() for u in users]

def save_users(users_list):
    """Save user list to SQL database by syncing it."""
    existing_ids = {u.user_id for u in User.query.all()}
    input_ids = {u['user_id'] for u in users_list}
    
    # Delete removed users
    for uid in existing_ids - input_ids:
        u = db.session.get(User, uid)
        if u:
            db.session.delete(u)
            
    # Add or update users
    for u in users_list:
        db_user = db.session.get(User, u['user_id'])
        if db_user:
            db_user.username = u['username']
            db_user.employee_id = u['employee_id']
            db_user.password_hash = u['password_hash']
            db_user.role = u['role']
            db_user.job_title = u.get('job_title')
            db_user.status = u.get('status', 'active')
            db_user.updated_at = u.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        else:
            db.session.add(User(
                user_id=u['user_id'],
                username=u['username'],
                employee_id=u['employee_id'],
                password_hash=u['password_hash'],
                role=u['role'],
                job_title=u.get('job_title'),
                status=u.get('status', 'active'),
                created_at=u.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                updated_at=u.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            ))
    db.session.commit()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'employee_id' not in session or 'role' not in session:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({"success": False, "message": "Unauthorized"}), 401
            return redirect(url_for('login'))
        
        # Verify user status
        users = load_users()
        user = next((u for u in users if u.get('employee_id') == session.get('employee_id')), None)
        if not user or user.get('status') != 'active':
            session.clear()
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({"success": False, "message": "User inactive or unauthorized"}), 403
            return render_template('403.html', message="Your account is inactive."), 403
            
        return f(*args, **kwargs)
    return decorated_function

def permission_required(permission_name):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'role' not in session or 'employee_id' not in session:
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({"success": False, "message": "Unauthorized"}), 401
                return redirect(url_for('login'))
                
            role = session['role']
            users = load_users()
            user = next((u for u in users if u.get('employee_id') == session.get('employee_id')), None)
            if not user or user.get('status') != 'active':
                session.clear()
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({"success": False, "message": "User inactive or unauthorized"}), 403
                return render_template('403.html', message="Your account is inactive."), 403
                
            allowed_permissions = ROLE_PERMISSIONS.get(role, [])
            if permission_name not in allowed_permissions:
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({"success": False, "message": "Forbidden: You do not have permission to access this resource."}), 403
                return render_template('403.html', message="You do not have permission to access this page."), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def load_customers():
    """Load customer list from SQL database."""
    customers = Customer.query.all()
    return [c.to_dict() for c in customers]

def save_customers(customers_list):
    """Save customer list to SQL database by syncing it."""
    existing_ids = {c.customer_id for c in Customer.query.all()}
    input_ids = {c['customer_id'] for c in customers_list}
    
    # Delete removed
    for cid in existing_ids - input_ids:
        c = db.session.get(Customer, cid)
        if c:
            db.session.delete(c)
            
    # Add/Update
    for c in customers_list:
        db_cust = db.session.get(Customer, c['customer_id'])
        if db_cust:
            db_cust.customer_name = c['customer_name']
            db_cust.mobile_number = c['mobile_number']
            db_cust.item_model = c['item_model']
            db_cust.imei_number = c['imei_number']
            db_cust.transaction_mode = c['transaction_mode']
            db_cust.finance_provider = c.get('finance_provider')
            db_cust.down_payment_mode = c.get('down_payment_mode')
            db_cust.down_payment_value = float(c.get('down_payment_value', 0.0))
            db_cust.cash_amount = float(c.get('cash_amount', 0.0))
            db_cust.card_amount = float(c.get('card_amount', 0.0))
            db_cust.ewallet_amount = float(c.get('ewallet_amount', 0.0))
            db_cust.total_amount_received = float(c.get('total_amount_received', 0.0))
            db_cust.exchange_status = c['exchange_status']
            db_cust.exchange_brand = c.get('exchange_brand')
            db_cust.exchange_value = float(c.get('exchange_value', 0.0))
            db_cust.sales_person = c['sales_person']
            db_cust.remarks = c.get('remarks')
            db_cust.created_by = c.get('created_by')
            db_cust.updated_at = c.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        else:
            db.session.add(Customer(
                customer_id=c['customer_id'],
                customer_name=c['customer_name'],
                mobile_number=c['mobile_number'],
                item_model=c['item_model'],
                imei_number=c['imei_number'],
                transaction_mode=c['transaction_mode'],
                finance_provider=c.get('finance_provider'),
                down_payment_mode=c.get('down_payment_mode'),
                down_payment_value=float(c.get('down_payment_value', 0.0)),
                cash_amount=float(c.get('cash_amount', 0.0)),
                card_amount=float(c.get('card_amount', 0.0)),
                ewallet_amount=float(c.get('ewallet_amount', 0.0)),
                total_amount_received=float(c.get('total_amount_received', 0.0)),
                exchange_status=c['exchange_status'],
                exchange_brand=c.get('exchange_brand'),
                exchange_value=float(c.get('exchange_value', 0.0)),
                sales_person=c['sales_person'],
                remarks=c.get('remarks'),
                created_by=c.get('created_by', 'admin'),
                created_at=c.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                updated_at=c.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            ))
    db.session.commit()

def load_crm_customers():
    """Load CRM walkin customer list from SQL database."""
    crm = CRMWalkin.query.all()
    return [c.to_dict() for c in crm]

def save_crm_customers(crm_list):
    """Save CRM walkin customer list to SQL database by syncing it."""
    existing_ids = {c.crm_customer_id for c in CRMWalkin.query.all()}
    input_ids = {c['crm_customer_id'] for c in crm_list}
    
    for cid in existing_ids - input_ids:
        c = db.session.get(CRMWalkin, cid)
        if c:
            db.session.delete(c)
            
    for c in crm_list:
        db_crm = db.session.get(CRMWalkin, c['crm_customer_id'])
        if db_crm:
            db_crm.customer_name = c['customer_name']
            db_crm.mobile_number = c['mobile_number']
            db_crm.model_item = c['model_item']
            db_crm.walkout_reason = c['walkout_reason']
            db_crm.remarks = c.get('remarks')
            db_crm.sales_person = c['sales_person']
            db_crm.updated_at = c.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        else:
            db.session.add(CRMWalkin(
                crm_customer_id=c['crm_customer_id'],
                customer_name=c['customer_name'],
                mobile_number=c['mobile_number'],
                model_item=c['model_item'],
                walkout_reason=c['walkout_reason'],
                remarks=c.get('remarks'),
                sales_person=c['sales_person'],
                created_by=c.get('created_by', 'admin'),
                created_at=c.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                updated_at=c.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            ))
    db.session.commit()


@app.before_request
def make_session_permanent():
    session.permanent = True

# --- VIEWS ---

@app.route('/')
def home():
    if 'employee_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    if 'employee_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=session['username'], role=session['role'])

@app.route('/customer-entry')
@login_required
def customer_entry():
    return render_template('customer_entry_page.html', username=session['username'], role=session['role'])

@app.route('/customer-history')
@login_required
@permission_required('customer_history_view')
def customer_history():
    return redirect(url_for('customer_records_view', tab='total'))

@app.route('/customer-records')
@login_required
@permission_required('customer_history_view')
def customer_records_view():
    return render_template('customer_records.html', username=session['username'], role=session['role'])

@app.route('/crm-data')
@login_required
@permission_required('crm_view')
def crm_data_view():
    return render_template('crm_data.html', username=session['username'], role=session['role'])

# --- API ENDPOINTS ---

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    employee_id = data.get('employee_id', '').strip()
    password = data.get('password', '').strip()

    if not employee_id or not password:
        return jsonify({"success": False, "message": "Employee ID and password are required."}), 400

    users = load_users()
    user = next((u for u in users if u.get('employee_id') == employee_id), None)

    if not user:
        return jsonify({"success": False, "message": "Invalid Employee ID or password."}), 401

    if user.get('status') != 'active':
        return jsonify({"success": False, "message": "Your account has been deactivated. Please contact your administrator."}), 403

    if check_password_hash(user.get('password_hash', ''), password):
        session['employee_id'] = user['employee_id']
        session['username'] = user['username']
        session['role'] = user['role']
        return jsonify({"success": True, "message": "Login successful!"})
    else:
        return jsonify({"success": False, "message": "Invalid Employee ID or password."}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully!"})

@app.route('/api/session', methods=['GET'])
@login_required
def api_session():
    users = load_users()
    user = next((u for u in users if u.get('employee_id') == session.get('employee_id')), None)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
    return jsonify({
        "success": True,
        "data": {
            "employee_id": user['employee_id'],
            "username": user['username'],
            "role": user['role'],
            "user_id": user['user_id'],
            "job_title": user.get('job_title', ''),
            "status": user.get('status', 'active')
        }
    })

@app.route('/api/customers/today', methods=['GET'])
@login_required
@permission_required('customer_history_view')
def api_get_customers_today():
    today_str = datetime.now().strftime('%Y-%m-%d')
    customers = Customer.query.filter(Customer.created_at.like(f"{today_str}%")).all()
    return jsonify({"success": True, "data": [c.to_dict() for c in customers]})

@app.route('/api/customers/finance', methods=['GET'])
@login_required
@permission_required('customer_history_view')
def api_get_customers_finance():
    customers = Customer.query.filter_by(transaction_mode='Finance').all()
    return jsonify({"success": True, "data": [c.to_dict() for c in customers]})

@app.route('/api/customers/<customer_id>', methods=['GET'])
@login_required
@permission_required('customer_history_view')
def api_get_customer_detail(customer_id):
    customer = db.session.get(Customer, customer_id)
    if not customer:
        return jsonify({"success": False, "message": "Customer not found."}), 404
    return jsonify({"success": True, "data": customer.to_dict()})

@app.route('/403')
def route_403():
    return render_template('403.html', message="Forbidden: Access is denied."), 403

@app.errorhandler(403)
def forbidden_error(error):
    if request.is_json or request.path.startswith('/api/'):
        return jsonify({"success": False, "message": "Forbidden: You do not have permission to access this resource."}), 403
    return render_template('403.html', message="You do not have permission to access this page."), 403

@app.route('/api/customers', methods=['GET'])
@login_required
@permission_required('customer_history_view')
def api_get_customers():
    customers = load_customers()
    return jsonify({"success": True, "data": customers})

@app.route('/api/verify-imei', methods=['POST'])
@login_required
@permission_required('customer_create')
def api_verify_imei():
    data = request.get_json() or {}
    imei = data.get('imei', '').strip()

    if not imei:
        return jsonify({"success": False, "message": "IMEI is required."}), 400

    return jsonify({"success": True, "message": "IMEI verified successfully."})

@app.route('/api/customers', methods=['POST'])
@login_required
@permission_required('customer_create')
def api_add_customer():
    data = request.get_json() or {}

    # Extract fields
    customer_name = data.get('customer_name', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    transaction_mode = data.get('transaction_mode', '').strip()
    finance_provider = data.get('finance_provider', '').strip()
    down_payment_mode = data.get('down_payment_mode', '').strip()
    down_payment_value_raw = data.get('down_payment_value', 0)
    
    cash_amount_raw = data.get('cash_amount', 0)
    card_amount_raw = data.get('card_amount', 0)
    ewallet_amount_raw = data.get('ewallet_amount', 0)
    
    item_model = data.get('item_model', '').strip()
    imei_number = data.get('imei_number', '').strip()
    
    exchange_status = data.get('exchange_status', '').strip()
    exchange_brand = data.get('exchange_brand', '').strip()
    exchange_value_raw = data.get('exchange_value', 0)
    
    sales_person = data.get('sales_person', '').strip()
    remarks = data.get('remarks', '').strip()

    # Name validations
    if not customer_name:
        return jsonify({"success": False, "message": "Customer Name is required."}), 400
    if len(customer_name) > 100:
        return jsonify({"success": False, "message": "Customer Name must not exceed 100 characters."}), 400
    customer_name = ' '.join(word.capitalize() for word in customer_name.split())

    # Mobile validations
    if not mobile_number:
        return jsonify({"success": False, "message": "Mobile Number is required."}), 400
    if len(mobile_number) != 10 or not mobile_number.isdigit():
        return jsonify({"success": False, "message": "Mobile Number must be exactly 10 digits."}), 400

    # Model & IMEI validations
    if not item_model:
        return jsonify({"success": False, "message": "Item / Model is required."}), 400
    if len(item_model) > 200:
        return jsonify({"success": False, "message": "Item / Model must not exceed 200 characters."}), 400

    if not imei_number:
        return jsonify({"success": False, "message": "IMEI Number is required."}), 400

    # Transaction Mode validation
    if transaction_mode not in ['Finance', 'Non-Finance', 'Non Finance']:
        return jsonify({"success": False, "message": "Transaction Mode must be Finance or Non-Finance."}), 400

    # Finance specific validation
    if transaction_mode == 'Finance':
        allowed_providers = [
            'Bajaj Finserv Lending Financier', 'Bajaj Finservlending Financier', 'Bajaj',
            'DMI Consumer Credit (Samsung, Oppo, Vivo)', 'DMI Consumer Credit (Samsung , Oppo, Vivo)', 'DMI-OPPO', 'DMI-VIVO', 'DMI-other',
            'HDB Financial Services Ltd (Financier)', 'HDB',
            'IDFC First Bank Ltd (Financier)', 'IDFC',
            'TVS Credit Services Limited (Financier)', 'TVS Credit Services Limited(Financier)', 'TVS'
        ]
        if not finance_provider:
            return jsonify({"success": False, "message": "Finance Provider is required when Transaction Mode is Finance."}), 400
        if finance_provider not in allowed_providers:
            return jsonify({"success": False, "message": "Invalid Finance Provider selected."}), 400

        if down_payment_mode not in ['Cash', 'Card', 'E-Wallet']:
            return jsonify({"success": False, "message": "Down Payment Mode is required and must be Cash, Card, or E-Wallet."}), 400

        try:
            down_payment_value = float(down_payment_value_raw)
            if down_payment_value < 0:
                raise ValueError
        except ValueError:
            return jsonify({"success": False, "message": "Down Payment Value must be a valid positive number."}), 400

        # Zero out payment split fields in Finance mode
        cash_amount = 0.0
        card_amount = 0.0
        ewallet_amount = 0.0
        total_amount_received = down_payment_value

    else:
        # Non-Finance specific validations
        finance_provider = ""
        down_payment_mode = ""
        down_payment_value = 0.0

        try:
            cash_amount = float(cash_amount_raw) if cash_amount_raw else 0.0
            card_amount = float(card_amount_raw) if card_amount_raw else 0.0
            ewallet_amount = float(ewallet_amount_raw) if ewallet_amount_raw else 0.0
            if cash_amount < 0 or card_amount < 0 or ewallet_amount < 0:
                raise ValueError
        except ValueError:
            return jsonify({"success": False, "message": "Payment split amounts must be positive numbers."}), 400

        total_amount_received = round(cash_amount + card_amount + ewallet_amount, 2)
        if total_amount_received <= 0:
            return jsonify({"success": False, "message": "At least one payment amount (Cash, Card, or E-Wallet) must be greater than zero."}), 400

    # Exchange validations
    if exchange_status not in ['Yes', 'No']:
        return jsonify({"success": False, "message": "Exchange Status must be Yes or No."}), 400

    if exchange_status == 'Yes':
        if not exchange_brand:
            return jsonify({"success": False, "message": "Exchange Brand is required when Exchange is Yes."}), 400
        try:
            exchange_value = float(exchange_value_raw)
            if exchange_value < 0:
                raise ValueError
        except ValueError:
            return jsonify({"success": False, "message": "Exchange Value must be a valid positive number."}), 400
    else:
        exchange_brand = ""
        exchange_value = 0.0

    # Salesperson validation
    allowed_salespeople = get_allowed_salespeople()
    if not sales_person or sales_person not in allowed_salespeople:
        return jsonify({"success": False, "message": "Invalid Sales Person selected."}), 400

    # Remarks validation
    if len(remarks) > 500:
        return jsonify({"success": False, "message": "Remarks must not exceed 500 characters."}), 400

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Generate customer_id CUST-XXXX
    customers = load_customers()
    next_num = 1001
    if customers:
        for c in customers:
            cid = c.get('customer_id', '')
            if cid.startswith('CUST-'):
                try:
                    num = int(cid.split('-')[1])
                    if num >= next_num:
                        next_num = num + 1
                except (ValueError, IndexError):
                    pass
    customer_id = f"CUST-{next_num}"

    new_customer = {
        "customer_id": customer_id,
        "customer_name": customer_name,
        "mobile_number": mobile_number,
        "item_model": item_model,
        "imei_number": imei_number,
        "transaction_mode": 'Finance' if transaction_mode == 'Finance' else 'Non-Finance',
        "finance_provider": finance_provider,
        "down_payment_mode": down_payment_mode,
        "down_payment_value": down_payment_value,
        "cash_amount": cash_amount,
        "card_amount": card_amount,
        "ewallet_amount": ewallet_amount,
        "total_amount_received": total_amount_received,
        "exchange_status": exchange_status,
        "exchange_brand": exchange_brand,
        "exchange_value": exchange_value,
        "sales_person": sales_person,
        "remarks": remarks,
        "created_by": session.get('employee_id', 'admin'),
        "created_at": now_str,
        "updated_at": now_str
    }

    customers.append(new_customer)
    save_customers(customers)

    return jsonify({"success": True, "message": "Customer record saved successfully!", "customer": new_customer})


@app.route('/api/raw-data', methods=['GET'])
@login_required
@permission_required('settings_access')
def api_get_raw_data():
    file_param = request.args.get('file', 'customers.json')
    if file_param not in WHITELIST_FILES:
        return jsonify({"success": False, "message": "Invalid file parameter"}), 400
        
    try:
        if file_param == 'customers.json':
            data = load_customers()
        elif file_param == 'crm_walkin_customers.json':
            data = load_crm_customers()
        elif file_param == 'customer_edit_requests.json':
            data = load_edit_requests()
        elif file_param == 'users.json':
            data = load_users()
        elif file_param == 'payments.json':
            data = load_payments()
        else:
            data = []
        return jsonify({"success": True, "raw": json.dumps(data, indent=4)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/raw-data', methods=['POST'])
@login_required
@permission_required('settings_access')
def api_save_raw_data():
    file_param = request.args.get('file', 'customers.json')
    if file_param not in WHITELIST_FILES:
        return jsonify({"success": False, "message": "Invalid file parameter"}), 400
        
    data = request.get_json() or {}
    raw_text = data.get('raw', '').strip()
    
    if not raw_text:
        return jsonify({"success": False, "message": "Raw JSON content is empty."}), 400
        
    try:
        parsed_json = json.loads(raw_text)
        if not isinstance(parsed_json, list):
            return jsonify({"success": False, "message": "JSON must be a list (array) of objects."}), 400
            
        if file_param == 'customers.json':
            save_customers(parsed_json)
        elif file_param == 'crm_walkin_customers.json':
            save_crm_customers(parsed_json)
        elif file_param == 'customer_edit_requests.json':
            save_edit_requests(parsed_json)
        elif file_param == 'users.json':
            save_users(parsed_json)
        elif file_param == 'payments.json':
            save_payments(parsed_json)
            
        return jsonify({"success": True, "message": f"{file_param} database file saved successfully!"})
    except json.JSONDecodeError as err:
        return jsonify({"success": False, "message": f"Invalid JSON syntax: {str(err)}"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/customers/<customer_id>', methods=['DELETE'])
@login_required
@permission_required('customer_history_delete')
def api_delete_customer(customer_id):
    customers = load_customers()
    updated_customers = [c for c in customers if c.get('customer_id') != customer_id]
    
    if len(updated_customers) == len(customers):
        return jsonify({"success": False, "message": "Record not found."}), 404
        
    save_customers(updated_customers)
    return jsonify({"success": True, "message": "Customer record deleted successfully!"})

@app.route('/api/customers/clear-all', methods=['POST'])
@login_required
@permission_required('customer_clear_all')
def api_clear_all_customers():
    """Clear ALL customer records. Preserves all other data (users, payments, edit_requests)."""
    customers = load_customers()
    records_deleted = len(customers)

    # Write audit log entry to SQL database
    try:
        audit_entry = AuditLog(
            action="clear_all_customers",
            performed_by=session.get('username', ''),
            employee_id=session.get('employee_id', ''),
            role=session.get('role', ''),
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            records_deleted=records_deleted
        )
        db.session.add(audit_entry)

        
        db.session.commit()
    except Exception:
        db.session.rollback()
        pass  # Audit log failure should not block the operation


    # Clear all customers
    save_customers([])
    return jsonify({
        "success": True,
        "message": f"All {records_deleted} customer record(s) have been cleared successfully.",
        "records_deleted": records_deleted
    })


# --- CRM WALKIN CUSTOMERS SECTION ---

@app.route('/crm-walkin-customers')
@login_required
@permission_required('crm_view')
def crm_walkin_customers_view():
    return render_template('crm_walkin_customers.html', username=session['username'], role=session['role'])

@app.route('/api/crm-walkin-customers', methods=['GET'])
@login_required
@permission_required('crm_view')
def api_get_crm_customers():
    customers = load_crm_customers()
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    reason = request.args.get('reason')
    sales_person = request.args.get('sales_person')
    search = request.args.get('search')
    
    filtered = []
    for c in customers:
        created_date = c.get('created_at', '').split(' ')[0]
        if start_date and created_date < start_date:
            continue
        if end_date and created_date > end_date:
            continue
        if reason and c.get('walkout_reason') != reason:
            continue
        if sales_person and c.get('sales_person') != sales_person:
            continue
        if search:
            s_lower = search.lower()
            name = c.get('customer_name', '').lower()
            mobile = c.get('mobile_number', '').lower()
            model = c.get('model_item', '').lower()
            if s_lower not in name and s_lower not in mobile and s_lower not in model:
                continue
        filtered.append(c)
        
    filtered.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify({"success": True, "data": filtered})

@app.route('/api/crm-walkin-customers', methods=['POST'])
@login_required
@permission_required('crm_create')
def api_add_crm_customer():
    data = request.get_json() or {}
    
    customer_name = data.get('customer_name', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    model_item = data.get('model_item', '').strip()
    walkout_reason = data.get('walkout_reason', '').strip()
    remarks = data.get('remarks', '').strip()
    sales_person = data.get('sales_person', '').strip()
    
    if not customer_name:
        return jsonify({"success": False, "message": "Customer Name is required."}), 400
    if len(customer_name) > 100:
        return jsonify({"success": False, "message": "Customer Name must not exceed 100 characters."}), 400
        
    if not mobile_number:
        return jsonify({"success": False, "message": "Mobile Number is required."}), 400
    if len(mobile_number) != 10 or not mobile_number.isdigit():
        return jsonify({"success": False, "message": "Mobile Number must be exactly 10 numeric digits."}), 400
        
    if not model_item:
        return jsonify({"success": False, "message": "Model / Item Enquired is required."}), 400
    if len(model_item) > 200:
        return jsonify({"success": False, "message": "Model / Item Enquired must not exceed 200 characters."}), 400
        
    allowed_reasons = [
        "No Walkout - Purchasing at Sangeetha",
        "Just Walk-in Customer",
        "Enquiry Customer",
        "Pricing Issue",
        "others"
    ]
    if not walkout_reason or walkout_reason not in allowed_reasons:
        return jsonify({"success": False, "message": "Invalid or missing Walk-in / Walkout Reason."}), 400
        
    allowed_salespeople = get_allowed_salespeople()
    if not sales_person or sales_person not in allowed_salespeople:
        return jsonify({"success": False, "message": "Invalid or missing Sales Person."}), 400
        
    if len(remarks) > 500:
        return jsonify({"success": False, "message": "Remarks must not exceed 500 characters."}), 400
        
    crm_customers = load_crm_customers()
    next_num = 1001
    if crm_customers:
        for c in crm_customers:
            cid = c.get('crm_customer_id', '')
            if cid.startswith('CRM-'):
                try:
                    num = int(cid.split('-')[1])
                    if num >= next_num:
                        next_num = num + 1
                except (ValueError, IndexError):
                    pass
    crm_customer_id = f"CRM-{next_num}"
    
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    new_record = {
        "crm_customer_id": crm_customer_id,
        "customer_name": ' '.join(w.capitalize() for w in customer_name.split()),
        "mobile_number": mobile_number,
        "model_item": model_item,
        "walkout_reason": walkout_reason,
        "remarks": remarks,
        "sales_person": sales_person,
        "created_by": session.get('employee_id', 'admin'),
        "created_at": now_str,
        "updated_at": now_str
    }
    
    crm_customers.append(new_record)
    save_crm_customers(crm_customers)
    return jsonify({"success": True, "message": "CRM record saved successfully!", "data": new_record})

@app.route('/api/crm-walkin-customers/<crm_customer_id>', methods=['PUT'])
@login_required
@permission_required('crm_edit')
def api_update_crm_customer(crm_customer_id):
    data = request.get_json() or {}
    
    customer_name = data.get('customer_name', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    model_item = data.get('model_item', '').strip()
    walkout_reason = data.get('walkout_reason', '').strip()
    remarks = data.get('remarks', '').strip()
    sales_person = data.get('sales_person', '').strip()
    
    if not customer_name:
        return jsonify({"success": False, "message": "Customer Name is required."}), 400
    if len(customer_name) > 100:
        return jsonify({"success": False, "message": "Customer Name must not exceed 100 characters."}), 400
        
    if not mobile_number:
        return jsonify({"success": False, "message": "Mobile Number is required."}), 400
    if len(mobile_number) != 10 or not mobile_number.isdigit():
        return jsonify({"success": False, "message": "Mobile Number must be exactly 10 numeric digits."}), 400
        
    if not model_item:
        return jsonify({"success": False, "message": "Model / Item Enquired is required."}), 400
    if len(model_item) > 200:
        return jsonify({"success": False, "message": "Model / Item Enquired must not exceed 200 characters."}), 400
        
    allowed_reasons = [
        "No Walkout - Purchasing at Sangeetha",
        "Just Walk-in Customer",
        "Enquiry Customer",
        "Pricing Issue",
        "others"
    ]
    if not walkout_reason or walkout_reason not in allowed_reasons:
        return jsonify({"success": False, "message": "Invalid or missing Walk-in / Walkout Reason."}), 400
        
    allowed_salespeople = get_allowed_salespeople()
    if not sales_person or sales_person not in allowed_salespeople:
        return jsonify({"success": False, "message": "Invalid or missing Sales Person."}), 400
        
    if len(remarks) > 500:
        return jsonify({"success": False, "message": "Remarks must not exceed 500 characters."}), 400
        
    crm_customers = load_crm_customers()
    idx = next((i for i, c in enumerate(crm_customers) if c.get('crm_customer_id') == crm_customer_id), -1)
    if idx == -1:
        return jsonify({"success": False, "message": "CRM record not found."}), 404
        
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    crm_customers[idx].update({
        "customer_name": ' '.join(w.capitalize() for w in customer_name.split()),
        "mobile_number": mobile_number,
        "model_item": model_item,
        "walkout_reason": walkout_reason,
        "remarks": remarks,
        "sales_person": sales_person,
        "updated_at": now_str
    })
    
    save_crm_customers(crm_customers)
    return jsonify({"success": True, "message": "CRM record updated successfully!", "data": crm_customers[idx]})

@app.route('/api/crm-walkin-customers/<crm_customer_id>', methods=['DELETE'])
@login_required
@permission_required('crm_delete')
def api_delete_crm_customer(crm_customer_id):
    crm_customers = load_crm_customers()
    updated = [c for c in crm_customers if c.get('crm_customer_id') != crm_customer_id]
    
    if len(updated) == len(crm_customers):
        return jsonify({"success": False, "message": "CRM record not found."}), 404
        
    save_crm_customers(updated)
    return jsonify({"success": True, "message": "CRM record deleted successfully!"})


@app.route('/customers/<customer_id>/request-edit')
@login_required
def edit_request_view(customer_id):
    # Check if the user role has permission to submit edit request or history edit
    role = session.get('role')
    allowed_permissions = ROLE_PERMISSIONS.get(role, [])
    if 'customer_edit_request_create' not in allowed_permissions and 'customer_history_edit' not in allowed_permissions:
        return render_template('403.html', message="You do not have permission to edit customer records."), 403

    customers = load_customers()
    customer = next((c for c in customers if c.get('customer_id') == customer_id), None)
    if not customer:
        return render_template('403.html', message="Customer record not found."), 404
    return render_template('edit_request.html', customer=customer, username=session['username'], role=session['role'])

@app.route('/api/customers/<customer_id>', methods=['PUT'])
@login_required
@permission_required('customer_history_edit')
def api_update_customer(customer_id):
    data = request.get_json() or {}
    
    # Extract fields
    customer_name = data.get('customer_name', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    transaction_mode = data.get('transaction_mode', '').strip()
    finance_provider = data.get('finance_provider', '').strip()
    down_payment_mode = data.get('down_payment_mode', '').strip()
    down_payment_value_raw = data.get('down_payment_value', 0)
    
    cash_amount_raw = data.get('cash_amount', 0)
    card_amount_raw = data.get('card_amount', 0)
    ewallet_amount_raw = data.get('ewallet_amount', 0)
    
    item_model = data.get('item_model', '').strip()
    imei_number = data.get('imei_number', '').strip()
    
    exchange_status = data.get('exchange_status', '').strip()
    exchange_brand = data.get('exchange_brand', '').strip()
    exchange_value_raw = data.get('exchange_value', 0)
    
    sales_person = data.get('sales_person', '').strip()
    remarks = data.get('remarks', '').strip()

    # Name validations
    if not customer_name:
        return jsonify({"success": False, "message": "Customer Name is required."}), 400
    if len(customer_name) > 100:
        return jsonify({"success": False, "message": "Customer Name must not exceed 100 characters."}), 400
    customer_name = ' '.join(word.capitalize() for word in customer_name.split())

    # Mobile validations
    if not mobile_number:
        return jsonify({"success": False, "message": "Mobile Number is required."}), 400
    if len(mobile_number) != 10 or not mobile_number.isdigit():
        return jsonify({"success": False, "message": "Mobile Number must be exactly 10 digits."}), 400

    # Model & IMEI validations
    if not item_model:
        return jsonify({"success": False, "message": "Item / Model is required."}), 400
    if len(item_model) > 200:
        return jsonify({"success": False, "message": "Item / Model must not exceed 200 characters."}), 400

    if not imei_number:
        return jsonify({"success": False, "message": "IMEI Number is required."}), 400

    # Transaction Mode validation
    if transaction_mode not in ['Finance', 'Non-Finance', 'Non Finance']:
        return jsonify({"success": False, "message": "Transaction Mode must be Finance or Non-Finance."}), 400

    # Finance specific validation
    if transaction_mode == 'Finance':
        allowed_providers = [
            'Bajaj Finserv Lending Financier', 'Bajaj Finservlending Financier', 'Bajaj',
            'DMI Consumer Credit (Samsung, Oppo, Vivo)', 'DMI Consumer Credit (Samsung , Oppo, Vivo)', 'DMI-OPPO', 'DMI-VIVO', 'DMI-other',
            'HDB Financial Services Ltd (Financier)', 'HDB',
            'IDFC First Bank Ltd (Financier)', 'IDFC',
            'TVS Credit Services Limited (Financier)', 'TVS Credit Services Limited(Financier)', 'TVS'
        ]
        if not finance_provider:
            return jsonify({"success": False, "message": "Finance Provider is required when Transaction Mode is Finance."}), 400
        if finance_provider not in allowed_providers:
            return jsonify({"success": False, "message": "Invalid Finance Provider selected."}), 400

        if down_payment_mode not in ['Cash', 'Card', 'E-Wallet']:
            return jsonify({"success": False, "message": "Down Payment Mode is required and must be Cash, Card, or E-Wallet."}), 400

        try:
            down_payment_value = float(down_payment_value_raw)
            if down_payment_value < 0:
                raise ValueError
        except ValueError:
            return jsonify({"success": False, "message": "Down Payment Value must be a valid positive number."}), 400

        # Zero out payment split fields in Finance mode
        cash_amount = 0.0
        card_amount = 0.0
        ewallet_amount = 0.0
        total_amount_received = down_payment_value

    else:
        # Non-Finance specific validations
        finance_provider = ""
        down_payment_mode = ""
        down_payment_value = 0.0

        try:
            cash_amount = float(cash_amount_raw) if cash_amount_raw else 0.0
            card_amount = float(card_amount_raw) if card_amount_raw else 0.0
            ewallet_amount = float(ewallet_amount_raw) if ewallet_amount_raw else 0.0
            if cash_amount < 0 or card_amount < 0 or ewallet_amount < 0:
                raise ValueError
        except ValueError:
            return jsonify({"success": False, "message": "Payment split amounts must be positive numbers."}), 400

        total_amount_received = round(cash_amount + card_amount + ewallet_amount, 2)
        if total_amount_received <= 0:
            return jsonify({"success": False, "message": "At least one payment amount (Cash, Card, or E-Wallet) must be greater than zero."}), 400

    # Exchange validations
    if exchange_status not in ['Yes', 'No']:
        return jsonify({"success": False, "message": "Exchange Status must be Yes or No."}), 400

    if exchange_status == 'Yes':
        if not exchange_brand:
            return jsonify({"success": False, "message": "Exchange Brand is required when Exchange is Yes."}), 400
        try:
            exchange_value = float(exchange_value_raw)
            if exchange_value < 0:
                raise ValueError
        except ValueError:
            return jsonify({"success": False, "message": "Exchange Value must be a valid positive number."}), 400
    else:
        exchange_brand = ""
        exchange_value = 0.0

    # Salesperson validation
    allowed_salespeople = get_allowed_salespeople()
    if not sales_person or sales_person not in allowed_salespeople:
        return jsonify({"success": False, "message": "Invalid Sales Person selected."}), 400

    # Remarks validation
    if len(remarks) > 500:
        return jsonify({"success": False, "message": "Remarks must not exceed 500 characters."}), 400

    customers = load_customers()
    customer_index = next((i for i, c in enumerate(customers) if c.get('customer_id') == customer_id), -1)
    
    if customer_index == -1:
        return jsonify({"success": False, "message": "Record not found."}), 404

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Update customer record
    customers[customer_index].update({
        "customer_name": customer_name,
        "mobile_number": mobile_number,
        "item_model": item_model,
        "imei_number": imei_number,
        "transaction_mode": 'Finance' if transaction_mode == 'Finance' else 'Non-Finance',
        "finance_provider": finance_provider,
        "down_payment_mode": down_payment_mode,
        "down_payment_value": down_payment_value,
        "cash_amount": cash_amount,
        "card_amount": card_amount,
        "ewallet_amount": ewallet_amount,
        "total_amount_received": total_amount_received,
        "exchange_status": exchange_status,
        "exchange_brand": exchange_brand,
        "exchange_value": exchange_value,
        "sales_person": sales_person,
        "remarks": remarks,
        "updated_at": now_str
    })

    save_customers(customers)
    return jsonify({"success": True, "message": "Customer record updated successfully!", "customer": customers[customer_index]})

def load_payments():
    """Load payment list from SQL database."""
    payments = Payment.query.all()
    return [p.to_dict() for p in payments]

def save_payments(payments_list):
    """Save payment list to SQL database by syncing it."""
    existing_ids = {p.payment_id for p in Payment.query.all()}
    input_ids = {p['payment_id'] for p in payments_list}
    
    for pid in existing_ids - input_ids:
        p = db.session.get(Payment, pid)
        if p:
            db.session.delete(p)
            
    for p in payments_list:
        db_pay = db.session.get(Payment, p['payment_id'])
        if db_pay:
            db_pay.customer_name = p['customer_name']
            db_pay.mobile_number = p['mobile_number']
            db_pay.invoice_number = p['invoice_number']
            db_pay.item_model = p['item_model']
            db_pay.imei_number = p['imei_number']
            db_pay.sales_person = p['sales_person']
            db_pay.payment_mode = p['payment_mode']
            db_pay.total_bill_amount = float(p.get('total_bill_amount', 0.0))
            db_pay.amount_received = float(p.get('amount_received', 0.0))
            db_pay.pending_amount = float(p.get('pending_amount', 0.0))
            db_pay.pending_from = p.get('pending_from')
            db_pay.pending_person_name = p.get('pending_person_name')
            db_pay.due_date = p.get('due_date')
            db_pay.payment_status = p['payment_status']
            db_pay.settlement_status = p['settlement_status']
            db_pay.remarks = p.get('remarks')
            db_pay.updated_at = p.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            
            # Rebuild payment history
            PaymentHistory.query.filter_by(payment_id=p['payment_id']).delete()
            for h in p.get('payment_history', []):
                db.session.add(PaymentHistory(
                    payment_id=p['payment_id'],
                    date_time=h.get('date_time'),
                    amount_added=float(h.get('amount_added', 0.0)),
                    received_by=h.get('received_by'),
                    remarks=h.get('remarks')
                ))
        else:
            new_pay = Payment(
                payment_id=p['payment_id'],
                customer_name=p['customer_name'],
                mobile_number=p['mobile_number'],
                invoice_number=p['invoice_number'],
                item_model=p['item_model'],
                imei_number=p['imei_number'],
                sales_person=p['sales_person'],
                payment_mode=p['payment_mode'],
                total_bill_amount=float(p.get('total_bill_amount', 0.0)),
                amount_received=float(p.get('amount_received', 0.0)),
                pending_amount=float(p.get('pending_amount', 0.0)),
                pending_from=p.get('pending_from'),
                pending_person_name=p.get('pending_person_name'),
                due_date=p.get('due_date'),
                payment_status=p['payment_status'],
                settlement_status=p['settlement_status'],
                remarks=p.get('remarks'),
                created_by=p.get('created_by', 'admin'),
                created_at=p.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                updated_at=p.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            )
            db.session.add(new_pay)
            db.session.flush()
            
            for h in p.get('payment_history', []):
                db.session.add(PaymentHistory(
                    payment_id=new_pay.payment_id,
                    date_time=h.get('date_time'),
                    amount_added=float(h.get('amount_added', 0.0)),
                    received_by=h.get('received_by'),
                    remarks=h.get('remarks')
                ))
    db.session.commit()


@app.route('/payment-tracker')
@login_required
@permission_required('payment_tracker_view')
def payment_tracker():
    return render_template('payment_tracker.html', username=session['username'], role=session['role'])

@app.route('/api/payment-summary', methods=['GET'])
@login_required
@permission_required('payment_tracker_view')
def api_payment_summary():
    payments = load_payments()
    today_str = datetime.now().strftime('%Y-%m-%d')
    
    total_sales = 0.0
    cash_sales = 0.0
    card_sales = 0.0
    ewallet_sales = 0.0
    total_received = 0.0
    total_pending = 0.0
    customer_pending = 0.0
    employee_pending = 0.0
    
    today_cash_sales = 0.0
    today_card_sales = 0.0
    today_ewallet_sales = 0.0
    today_pending = 0.0
    total_unsettled = 0.0
    
    for p in payments:
        total_bill = float(p.get('total_bill_amount') or 0)
        received = float(p.get('amount_received') or 0)
        pending = float(p.get('pending_amount') or 0)
        mode = p.get('payment_mode')
        pending_from = p.get('pending_from')
        created_at = p.get('created_at', '')
        
        total_sales += total_bill
        total_received += received
        total_pending += pending
        
        if mode == 'Cash':
            cash_sales += total_bill
        elif mode == 'Card':
            card_sales += total_bill
        elif mode == 'E-Wallet':
            ewallet_sales += total_bill
            
        if pending_from == 'Customer':
            customer_pending += pending
        elif pending_from == 'Employee / Salesperson':
            employee_pending += pending
            
        if p.get('settlement_status') == 'Unsettled':
            total_unsettled += pending
            
        # Today metrics
        if created_at.startswith(today_str):
            today_pending += pending
            if mode == 'Cash':
                today_cash_sales += total_bill
            elif mode == 'Card':
                today_card_sales += total_bill
            elif mode == 'E-Wallet':
                today_ewallet_sales += total_bill
                
    return jsonify({
        "success": True,
        "summary": {
            "total_sales_amount": total_sales,
            "cash_sales": cash_sales,
            "card_sales": card_sales,
            "ewallet_sales": ewallet_sales,
            "total_received": total_received,
            "total_pending": total_pending,
            "customer_pending": customer_pending,
            "employee_pending": employee_pending,
            "today_cash_sales": today_cash_sales,
            "today_card_sales": today_card_sales,
            "today_ewallet_sales": today_ewallet_sales,
            "today_pending_amount": today_pending,
            "total_unsettled_amount": total_unsettled
        }
    })

@app.route('/api/payments', methods=['GET'])
@login_required
@permission_required('payment_tracker_view')
def api_get_payments():
    payments = load_payments()
    
    # Apply query filters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    payment_mode = request.args.get('payment_mode')
    payment_status = request.args.get('payment_status')
    settlement_status = request.args.get('settlement_status')
    pending_from = request.args.get('pending_from')
    sales_person = request.args.get('sales_person')
    search = request.args.get('search')
    
    filtered_payments = []
    for p in payments:
        # Date range filter
        created_at_date = p.get('created_at', '').split(' ')[0]
        if start_date and created_at_date < start_date:
            continue
        if end_date and created_at_date > end_date:
            continue
            
        # Equality filters
        if payment_mode and p.get('payment_mode') != payment_mode:
            continue
        if payment_status and p.get('payment_status') != payment_status:
            continue
        if settlement_status and p.get('settlement_status') != settlement_status:
            continue
        if pending_from and p.get('pending_from') != pending_from:
            continue
        if sales_person and p.get('sales_person') != sales_person:
            continue
            
        # Search filter
        if search:
            search_lower = search.lower()
            c_name = p.get('customer_name', '').lower()
            mobile = p.get('mobile_number', '').lower()
            invoice = p.get('invoice_number', '').lower()
            imei = p.get('imei_number', '').lower()
            s_person = p.get('sales_person', '').lower()
            p_person = p.get('pending_person_name', '').lower()
            if (search_lower not in c_name and 
                search_lower not in mobile and 
                search_lower not in invoice and 
                search_lower not in imei and 
                search_lower not in s_person and 
                search_lower not in p_person):
                continue
                
        filtered_payments.append(p)
        
    # Sort payments: newer first
    filtered_payments.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify({"success": True, "data": filtered_payments})

@app.route('/api/payments', methods=['POST'])
@login_required
@permission_required('payment_tracker_create')
def api_add_payment():
    data = request.get_json() or {}
    
    # Extract fields
    customer_name = data.get('customer_name', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    invoice_number = data.get('invoice_number', '').strip()
    item_model = data.get('item_model', '').strip()
    imei_number = data.get('imei_number', '').strip()
    sales_person = data.get('sales_person', '').strip()
    payment_mode = data.get('payment_mode', '').strip()
    total_bill_amount = data.get('total_bill_amount')
    amount_received = data.get('amount_received')
    pending_from = data.get('pending_from', '').strip()
    pending_person_name = data.get('pending_person_name', '').strip()
    due_date = data.get('due_date', '').strip()
    remarks = data.get('remarks', '').strip()
    payment_status_override = data.get('payment_status', '').strip()
    settlement_status_override = data.get('settlement_status', '').strip()
    
    # Validation logic
    if not customer_name:
        return jsonify({"success": False, "message": "Customer Name is required."}), 400
    if len(customer_name) > 100:
        return jsonify({"success": False, "message": "Customer Name must not exceed 100 characters."}), 400
    customer_name = ' '.join(w.capitalize() for w in customer_name.split())

    if not mobile_number:
        return jsonify({"success": False, "message": "Mobile Number is required."}), 400
    if len(mobile_number) != 10 or not mobile_number.isdigit():
        return jsonify({"success": False, "message": "Mobile Number must be exactly 10 digits."}), 400

    if item_model and len(item_model) > 200:
        return jsonify({"success": False, "message": "Item / Model must not exceed 200 characters."}), 400



    allowed_salespeople = get_allowed_salespeople()
    if sales_person:
        if sales_person not in allowed_salespeople:
            return jsonify({"success": False, "message": "Invalid Sales Person selected."}), 400

    if payment_mode not in ['Cash', 'Card', 'E-Wallet']:
        return jsonify({"success": False, "message": "Invalid Payment Mode selected."}), 400

    # Total Bill Amount
    if total_bill_amount is None or str(total_bill_amount).strip() == "":
        return jsonify({"success": False, "message": "Total Bill Amount is required."}), 400
    try:
        total_val = float(total_bill_amount)
        if total_val <= 0:
            return jsonify({"success": False, "message": "Total Bill Amount must be greater than zero."}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Total Bill Amount must be a valid number."}), 400

    # Amount Received
    if amount_received is None or str(amount_received).strip() == "":
        return jsonify({"success": False, "message": "Amount Received is required."}), 400
    try:
        received_val = float(amount_received)
        if received_val < 0:
            return jsonify({"success": False, "message": "Amount Received cannot be negative."}), 400
        if received_val > total_val:
            return jsonify({"success": False, "message": "Amount Received cannot be greater than Total Bill Amount."}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Amount Received must be a valid number."}), 400

    pending_val = round(total_val - received_val, 2)
    
    # Pending validations
    if pending_val > 0:
        if pending_from not in ['Customer', 'Employee / Salesperson']:
            return jsonify({"success": False, "message": "Pending From is required and must be selected when there is a pending balance."}), 400
        if not due_date:
            return jsonify({"success": False, "message": "Due Date is required when there is a pending balance."}), 400
        
        if payment_status_override in ['Fully Paid', 'Partially Paid', 'Pending', 'Overdue']:
            payment_status = payment_status_override
        else:
            payment_status = "Partially Paid" if received_val > 0 else "Pending"
            
        if settlement_status_override in ['Settled', 'Unsettled']:
            settlement_status = settlement_status_override
        else:
            settlement_status = "Unsettled"
    else:
        pending_from = "No Pending"
        due_date = ""
        pending_person_name = ""
        
        if payment_status_override in ['Fully Paid', 'Partially Paid', 'Pending', 'Overdue']:
            payment_status = payment_status_override
        else:
            payment_status = "Fully Paid"
            
        if settlement_status_override in ['Settled', 'Unsettled']:
            settlement_status = settlement_status_override
        else:
            settlement_status = "Settled"

    if len(remarks) > 500:
        return jsonify({"success": False, "message": "Remarks must not exceed 500 characters."}), 400

    # Generate incremental PAY-XXXX ID
    payments = load_payments()
    next_num = 1001
    if payments:
        for p in payments:
            pid = p.get('payment_id', '')
            if pid.startswith('PAY-'):
                try:
                    num = int(pid.split('-')[1])
                    if num >= next_num:
                        next_num = num + 1
                except (ValueError, IndexError):
                    pass
    payment_id = f"PAY-{next_num}"

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Initial history log
    history_entry = {
        "date_time": now_str,
        "amount_added": received_val,
        "received_by": session['username'],
        "remarks": "Initial record creation."
    }

    new_payment = {
        "payment_id": payment_id,
        "customer_name": customer_name,
        "mobile_number": mobile_number,
        "invoice_number": invoice_number,
        "item_model": item_model,
        "imei_number": imei_number,
        "sales_person": sales_person,
        "payment_mode": payment_mode,
        "total_bill_amount": total_val,
        "amount_received": received_val,
        "pending_amount": pending_val,
        "pending_from": pending_from,
        "pending_person_name": pending_person_name,
        "due_date": due_date,
        "payment_status": payment_status,
        "settlement_status": settlement_status,
        "remarks": remarks,
        "created_at": now_str,
        "updated_at": now_str,
        "created_by": session['username'],
        "payment_history": [history_entry]
    }

    payments.append(new_payment)
    save_payments(payments)
    
    return jsonify({"success": True, "message": "Payment record added successfully!", "data": new_payment})

@app.route('/api/payments/<payment_id>', methods=['PUT'])
@login_required
@permission_required('payment_tracker_edit')
def api_update_payment(payment_id):
    payments = load_payments()
    payment = None
    for p in payments:
        if p.get('payment_id') == payment_id:
            payment = p
            break
            
    if not payment:
        return jsonify({"success": False, "message": "Payment record not found."}), 404
        
    data = request.get_json() or {}
    
    # Read/validate edits
    customer_name = data.get('customer_name', '').strip()
    mobile_number = data.get('mobile_number', '').strip()
    invoice_number = data.get('invoice_number', '').strip()
    item_model = data.get('item_model', '').strip()
    imei_number = data.get('imei_number', '').strip()
    sales_person = data.get('sales_person', '').strip()
    payment_mode = data.get('payment_mode', '').strip()
    total_bill_amount = data.get('total_bill_amount')
    amount_received = data.get('amount_received')
    pending_from = data.get('pending_from', '').strip()
    pending_person_name = data.get('pending_person_name', '').strip()
    due_date = data.get('due_date', '').strip()
    remarks = data.get('remarks', '').strip()
    payment_status_override = data.get('payment_status', '').strip()
    settlement_status_override = data.get('settlement_status', '').strip()

    # Validations (same as POST)
    if not customer_name:
        return jsonify({"success": False, "message": "Customer Name is required."}), 400
    if len(customer_name) > 100:
        return jsonify({"success": False, "message": "Customer Name must not exceed 100 characters."}), 400
    customer_name = ' '.join(w.capitalize() for w in customer_name.split())

    if not mobile_number:
        return jsonify({"success": False, "message": "Mobile Number is required."}), 400
    if len(mobile_number) != 10 or not mobile_number.isdigit():
        return jsonify({"success": False, "message": "Mobile Number must be exactly 10 digits."}), 400

    if item_model and len(item_model) > 200:
        return jsonify({"success": False, "message": "Item / Model must not exceed 200 characters."}), 400



    allowed_salespeople = get_allowed_salespeople()
    if sales_person:
        if sales_person not in allowed_salespeople:
            return jsonify({"success": False, "message": "Invalid Sales Person selected."}), 400

    if payment_mode not in ['Cash', 'Card', 'E-Wallet']:
        return jsonify({"success": False, "message": "Invalid Payment Mode selected."}), 400

    # Total Bill
    try:
        total_val = float(total_bill_amount)
        if total_val <= 0:
            return jsonify({"success": False, "message": "Total Bill Amount must be greater than zero."}), 400
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Total Bill Amount must be a valid number."}), 400

    # Amount Received
    try:
        received_val = float(amount_received)
        if received_val < 0:
            return jsonify({"success": False, "message": "Amount Received cannot be negative."}), 400
        if received_val > total_val:
            return jsonify({"success": False, "message": "Amount Received cannot be greater than Total Bill Amount."}), 400
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Amount Received must be a valid number."}), 400

    pending_val = round(total_val - received_val, 2)

    # Pending checks
    if pending_val > 0:
        if pending_from not in ['Customer', 'Employee / Salesperson']:
            return jsonify({"success": False, "message": "Pending From is required and must be selected when there is a pending balance."}), 400
        if not due_date:
            return jsonify({"success": False, "message": "Due Date is required when there is a pending balance."}), 400
        
        if payment_status_override in ['Fully Paid', 'Partially Paid', 'Pending', 'Overdue']:
            payment_status = payment_status_override
        else:
            payment_status = "Partially Paid" if received_val > 0 else "Pending"
            
        if settlement_status_override in ['Settled', 'Unsettled']:
            settlement_status = settlement_status_override
        else:
            settlement_status = "Unsettled"
    else:
        pending_from = "No Pending"
        due_date = ""
        pending_person_name = ""
        
        if payment_status_override in ['Fully Paid', 'Partially Paid', 'Pending', 'Overdue']:
            payment_status = payment_status_override
        else:
            payment_status = "Fully Paid"
            
        if settlement_status_override in ['Settled', 'Unsettled']:
            settlement_status = settlement_status_override
        else:
            settlement_status = "Settled"

    if len(remarks) > 500:
        return jsonify({"success": False, "message": "Remarks must not exceed 500 characters."}), 400

    # If amount received changed, we log it in the history
    prev_received = float(payment.get('amount_received') or 0)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if received_val != prev_received:
        diff = received_val - prev_received
        payment['payment_history'].append({
            "date_time": now_str,
            "amount_added": round(diff, 2),
            "received_by": session['username'],
            "remarks": f"Amount adjusted via edit (changed from Rupee {prev_received} to Rupee {received_val})."
        })

    # Update fields
    payment.update({
        "customer_name": customer_name,
        "mobile_number": mobile_number,
        "invoice_number": invoice_number,
        "item_model": item_model,
        "imei_number": imei_number,
        "sales_person": sales_person,
        "payment_mode": payment_mode,
        "total_bill_amount": total_val,
        "amount_received": received_val,
        "pending_amount": pending_val,
        "pending_from": pending_from,
        "pending_person_name": pending_person_name,
        "due_date": due_date,
        "payment_status": payment_status,
        "settlement_status": settlement_status,
        "remarks": remarks,
        "updated_at": now_str
    })

    save_payments(payments)
    return jsonify({"success": True, "message": "Payment record updated successfully!", "data": payment})

@app.route('/api/payments/<payment_id>', methods=['DELETE'])
@login_required
@permission_required('payment_tracker_delete')
def api_delete_payment(payment_id):
    payments = load_payments()
    updated_payments = [p for p in payments if p.get('payment_id') != payment_id]
    
    if len(updated_payments) == len(payments):
        return jsonify({"success": False, "message": "Payment record not found."}), 404
        
    save_payments(updated_payments)
    return jsonify({"success": True, "message": "Payment record deleted successfully!"})

@app.route('/api/payments/<payment_id>/partial-payment', methods=['POST'])
@login_required
@permission_required('payment_tracker_edit')
def api_partial_payment(payment_id):
    payments = load_payments()
    payment = None
    for p in payments:
        if p.get('payment_id') == payment_id:
            payment = p
            break
            
    if not payment:
        return jsonify({"success": False, "message": "Payment record not found."}), 404
        
    data = request.get_json() or {}
    amount_added = data.get('amount_added')
    partial_remarks = data.get('remarks', '').strip()
    
    if amount_added is None or str(amount_added).strip() == "":
        return jsonify({"success": False, "message": "Amount added is required."}), 400
        
    try:
        added_val = float(amount_added)
        if added_val <= 0:
            return jsonify({"success": False, "message": "Amount added must be greater than zero."}), 400
            
        pending_val = float(payment.get('pending_amount') or 0)
        if added_val > pending_val:
            return jsonify({"success": False, "message": f"Amount added cannot exceed the pending amount of Rupee {pending_val}."}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Amount added must be a valid number."}), 400
        
    # Update amounts
    new_received = round(float(payment.get('amount_received') or 0) + added_val, 2)
    new_pending = round(float(payment.get('total_bill_amount') or 0) - new_received, 2)
    
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    history_entry = {
        "date_time": now_str,
        "amount_added": added_val,
        "received_by": session['username'],
        "remarks": partial_remarks or "Partial payment added."
    }
    
    payment['amount_received'] = new_received
    payment['pending_amount'] = new_pending
    payment['payment_history'].append(history_entry)
    payment['updated_at'] = now_str
    
    # Recalculate status
    if new_pending == 0:
        payment['payment_status'] = 'Fully Paid'
        payment['settlement_status'] = 'Settled'
        payment['pending_from'] = 'No Pending'
        payment['due_date'] = ''
        payment['pending_person_name'] = ''
    else:
        payment['payment_status'] = 'Partially Paid'
        
    save_payments(payments)
    return jsonify({"success": True, "message": "Partial payment added successfully!", "data": payment})

@app.route('/api/payments/<payment_id>/mark-paid', methods=['POST'])
@login_required
@permission_required('payment_tracker_edit')
def api_mark_paid(payment_id):
    payments = load_payments()
    payment = None
    for p in payments:
        if p.get('payment_id') == payment_id:
            payment = p
            break
            
    if not payment:
        return jsonify({"success": False, "message": "Payment record not found."}), 404
        
    pending_val = float(payment.get('pending_amount') or 0)
    if pending_val <= 0:
        return jsonify({"success": False, "message": "This payment is already fully paid."}), 400
        
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    history_entry = {
        "date_time": now_str,
        "amount_added": pending_val,
        "received_by": session['username'],
        "remarks": "Marked as fully paid (balance cleared)."
    }
    
    payment['amount_received'] = float(payment.get('total_bill_amount') or 0)
    payment['pending_amount'] = 0.0
    payment['payment_status'] = 'Fully Paid'
    payment['settlement_status'] = 'Settled'
    payment['pending_from'] = 'No Pending'
    payment['due_date'] = ''
    payment['pending_person_name'] = ''
    payment['payment_history'].append(history_entry)
    payment['updated_at'] = now_str
    
    save_payments(payments)
    return jsonify({"success": True, "message": "Payment marked as fully paid successfully!", "data": payment})

# --- USER MANAGEMENT ENDPOINTS ---

@app.route('/admin/users')
@login_required
@permission_required('settings_access')
def admin_users_view():
    return render_template('admin_users.html', username=session['username'], role=session['role'])

@app.route('/admin/database-editor')
@login_required
@permission_required('settings_access')
def database_editor_view():
    return render_template('database_editor.html', username=session['username'], role=session['role'])

def get_allowed_salespeople():
    users = load_users()
    allowed = []
    for u in users:
        if u.get('status', 'active') != 'active':
            continue
        job_title = u.get('job_title', '').strip()
        if not job_title:
            continue
        name = u.get('username', '')
        employee_id = u.get('employee_id', '')
        if job_title.lower() == 'promoter':
            display = f"{name} \u2014 {employee_id}"
        else:
            display = f"{name} \u2014 {job_title}"
        allowed.append(display)
    
    # Generate fallback/compatibility values with standard hyphens
    extra_allowed = []
    for s in allowed:
        extra_allowed.append(s.replace('\u2014', '-'))
        extra_allowed.append(s.replace('\u2014', '\u2013'))
    
    # Keep legacy hardcoded values for backward compatibility
    legacy = [
        "Bharath Kumar - Manager",
        "Ramesh T - Cashier",
        "Mohammad Farooq - Staff",
        "Farooq - Staff",
        "Abhishek - OPPO",
        "Azeem - VIVO",
        "Azeem - Vivo",
        "Rabiya - Xiaomi",
        "Finance Promoter"
    ]
    return list(set(allowed + extra_allowed + legacy))

# Staff list — accessible to any logged-in user, no admin permission required
@app.route('/api/staff-list', methods=['GET'])
@login_required
def api_staff_list():
    """Return active staff with job_title/employee_id for the Sales Person dropdown.
    Excludes generic admin accounts (those without a job_title)."""
    users = load_users()
    staff = []
    for u in users:
        if u.get('status', 'active') != 'active':
            continue
        job_title = u.get('job_title', '').strip()
        if not job_title:
            continue   # skip generic admin / system accounts with no job title
        name = u.get('username', '')
        employee_id = u.get('employee_id', '')
        if job_title.lower() == 'promoter':
            display = f"{name} \u2014 {employee_id}"
        else:
            display = f"{name} \u2014 {job_title}"
        staff.append({'username': name, 'role': u.get('role',''), 'job_title': job_title, 'display': display})
    return jsonify({'success': True, 'data': staff})

@app.route('/api/users', methods=['GET'])
@login_required
@permission_required('settings_access')
def api_get_users():
    users = load_users()
    # Strip password hashes for safety
    cleaned_users = []
    for u in users:
        cleaned = u.copy()
        cleaned.pop('password_hash', None)
        cleaned_users.append(cleaned)
    return jsonify({"success": True, "data": cleaned_users})

@app.route('/api/users', methods=['POST'])
@login_required
@permission_required('user_create')
def api_create_user():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    employee_id = data.get('employee_id', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', '').strip()
    job_title = data.get('job_title', '').strip() or None
    
    if not username or not employee_id or not password or not role:
        return jsonify({"success": False, "message": "All fields (Username, Employee ID, Password, Role) are required."}), 400
        
    if role not in ['super_admin', 'admin', 'store_employee']:
        return jsonify({"success": False, "message": "Invalid user role."}), 400
        
    users = load_users()
    if any(u.get('employee_id') == employee_id for u in users):
        return jsonify({"success": False, "message": f"Duplicate Employee ID: User with Employee ID {employee_id} already exists."}), 400
        
    # Generate unique ID USR-XXXX
    next_num = 1004
    for u in users:
        uid = u.get('user_id', '')
        if uid.startswith('USR-'):
            try:
                num = int(uid.split('-')[1])
                if num >= next_num:
                    next_num = num + 1
            except (ValueError, IndexError):
                pass
    user_id = f"USR-{next_num}"
    
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    new_user = {
        "user_id": user_id,
        "username": username,
        "employee_id": employee_id,
        "password_hash": generate_password_hash(password),
        "role": role,
        "job_title": job_title,
        "status": "active",
        "created_at": now_str,
        "updated_at": now_str
    }
    
    users.append(new_user)
    save_users(users)
    
    # Strip hash for return
    ret_data = new_user.copy()
    ret_data.pop('password_hash', None)
    return jsonify({"success": True, "message": "User created successfully!", "data": ret_data})

@app.route('/api/users/<user_id>', methods=['PUT'])
@login_required
@permission_required('user_update')
def api_update_user(user_id):
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    role = data.get('role', '').strip()
    status = data.get('status', '').strip()
    password = data.get('password', '').strip() # Optional password reset
    job_title = data.get('job_title')
    
    users = load_users()
    user = next((u for u in users if u.get('user_id') == user_id), None)
    
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
        
    # Security check: current user cannot deactivate or downgrade themselves
    if user.get('employee_id') == session.get('employee_id'):
        if status == 'inactive':
            return jsonify({"success": False, "message": "You cannot deactivate your own account."}), 400
        if role != user.get('role'):
            return jsonify({"success": False, "message": "You cannot change your own role."}), 400
            
    if username:
        user['username'] = username
    if role:
        if role not in ['super_admin', 'admin', 'store_employee']:
            return jsonify({"success": False, "message": "Invalid user role."}), 400
        user['role'] = role
    if status:
        if status not in ['active', 'inactive']:
            return jsonify({"success": False, "message": "Invalid status."}), 400
        user['status'] = status
    if password:
        user['password_hash'] = generate_password_hash(password)
    if job_title is not None:
        user['job_title'] = job_title.strip() or None
        
    user['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    save_users(users)
    
    ret_data = user.copy()
    ret_data.pop('password_hash', None)
    return jsonify({"success": True, "message": "User updated successfully!", "data": ret_data})

@app.route('/api/users/<user_id>', methods=['DELETE'])
@login_required
@permission_required('user_delete')
def api_delete_user(user_id):
    users = load_users()
    user = next((u for u in users if u.get('user_id') == user_id), None)
    
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
        
    if user.get('employee_id') == session.get('employee_id'):
        return jsonify({"success": False, "message": "You cannot delete your own account."}), 400
        
    updated_users = [u for u in users if u.get('user_id') != user_id]
    save_users(updated_users)
    return jsonify({"success": True, "message": "User deleted successfully!"})

def load_edit_requests():
    """Load edit requests list from SQL database."""
    reqs = EditRequest.query.all()
    return [r.to_dict() for r in reqs]

def save_edit_requests(requests_list):
    """Save edit requests list to SQL database by syncing it."""
    existing_ids = {r.request_id for r in EditRequest.query.all()}
    input_ids = {r['request_id'] for r in requests_list}
    
    for rid in existing_ids - input_ids:
        r = db.session.get(EditRequest, rid)
        if r:
            db.session.delete(r)
            
    for r in requests_list:
        db_req = db.session.get(EditRequest, r['request_id'])
        if db_req:
            db_req.customer_id = r['customer_id']
            db_req.requested_by = r['requested_by']
            db_req.requested_role = r['requested_role']
            db_req.original_data = json.dumps(r.get('original_data', {}))
            db_req.proposed_data = json.dumps(r.get('proposed_data', {}))
            db_req.reason = r['reason']
            db_req.status = r.get('status', 'pending')
            db_req.admin_remarks = r.get('admin_remarks')
            db_req.approved_by = r.get('approved_by')
            db_req.approved_at = r.get('approved_at')
            db_req.rejected_by = r.get('rejected_by')
            db_req.rejected_at = r.get('rejected_at')
        else:
            db.session.add(EditRequest(
                request_id=r['request_id'],
                customer_id=r['customer_id'],
                requested_by=r['requested_by'],
                requested_role=r['requested_role'],
                original_data=json.dumps(r.get('original_data', {})),
                proposed_data=json.dumps(r.get('proposed_data', {})),
                reason=r['reason'],
                status=r.get('status', 'pending'),
                admin_remarks=r.get('admin_remarks'),
                approved_by=r.get('approved_by'),
                approved_at=r.get('approved_at'),
                rejected_by=r.get('rejected_by'),
                rejected_at=r.get('rejected_at'),
                created_at=r.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            ))
    db.session.commit()


@app.route('/admin/edit-requests')
@login_required
@permission_required('edit_request_view')
def admin_edit_requests_view():
    return render_template('admin_edit_requests.html', username=session['username'], role=session['role'])

@app.route('/api/edit-requests', methods=['GET'])
@login_required
@permission_required('edit_request_view')
def api_get_edit_requests():
    requests_list = load_edit_requests()
    # Sort requests: newer first
    requests_list.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify({"success": True, "data": requests_list})

@app.route('/api/customers/<customer_id>/edit-request', methods=['POST'])
@login_required
@permission_required('customer_edit_request_create')
def api_create_edit_request(customer_id):
    data = request.get_json() or {}
    reason = data.get('reason', '').strip()
    proposed_data = data.get('proposed_data', {})
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not reason:
        return jsonify({"success": False, "message": "Reason for edit request is required."}), 400

    if not proposed_data:
        return jsonify({"success": False, "message": "Proposed changes are required."}), 400

    customers = load_customers()
    customer = next((c for c in customers if c.get('customer_id') == customer_id), None)
    if not customer:
        return jsonify({"success": False, "message": "Customer record not found."}), 404

    # Check for duplicate pending requests by the same user for this customer
    requests_list = load_edit_requests()
    duplicate = next((r for r in requests_list if r.get('customer_id') == customer_id and r.get('requested_by') == session.get('employee_id') and r.get('status') == 'pending'), None)
    if duplicate:
        return jsonify({"success": False, "message": "You already have a pending edit request for this customer."}), 400

    # Validate proposed data strictly on backend
    p_name = proposed_data.get('customer_name', '').strip()
    p_mobile = proposed_data.get('mobile_number', '').strip()
    p_t_mode = proposed_data.get('transaction_mode', '').strip()
    p_item = proposed_data.get('item_model', '').strip()
    p_imei = proposed_data.get('imei_number', '').strip()
    p_sales = proposed_data.get('sales_person', '').strip()

    if not p_name or not p_mobile or not p_item or not p_imei or not p_t_mode or not p_sales:
        return jsonify({"success": False, "message": "Name, Mobile, Model, IMEI, Transaction Mode, and Sales Person are required in proposed changes."}), 400

    if len(p_mobile) != 10 or not p_mobile.isdigit():
        return jsonify({"success": False, "message": "Proposed Mobile Number must be exactly 10 digits."}), 400



    p_name = ' '.join(word.capitalize() for word in p_name.split())
    proposed_data['customer_name'] = p_name

    if p_t_mode == 'Finance':
        p_provider = proposed_data.get('finance_provider', '').strip()
        p_dp_mode = proposed_data.get('down_payment_mode', '').strip()
        p_dp_val_raw = proposed_data.get('down_payment_value', 0)
        
        if not p_provider or p_dp_mode not in ['Cash', 'Card', 'E-Wallet']:
            return jsonify({"success": False, "message": "Proposed Finance Provider and Down Payment Mode are required."}), 400
        try:
            p_dp_val = float(p_dp_val_raw)
            if p_dp_val < 0: raise ValueError
            proposed_data['down_payment_value'] = p_dp_val
        except ValueError:
            return jsonify({"success": False, "message": "Proposed Down Payment Value must be a valid positive number."}), 400
        
        proposed_data['cash_amount'] = 0.0
        proposed_data['card_amount'] = 0.0
        proposed_data['ewallet_amount'] = 0.0
        proposed_data['total_amount_received'] = p_dp_val
    else:
        proposed_data['finance_provider'] = ""
        proposed_data['down_payment_mode'] = ""
        proposed_data['down_payment_value'] = 0.0
        
        try:
            p_cash = float(proposed_data.get('cash_amount', 0) or 0)
            p_card = float(proposed_data.get('card_amount', 0) or 0)
            p_ewallet = float(proposed_data.get('ewallet_amount', 0) or 0)
            if p_cash < 0 or p_card < 0 or p_ewallet < 0: raise ValueError
            proposed_data['cash_amount'] = p_cash
            proposed_data['card_amount'] = p_card
            proposed_data['ewallet_amount'] = p_ewallet
        except ValueError:
            return jsonify({"success": False, "message": "Proposed payment split amounts must be positive numbers."}), 400
            
        proposed_data['total_amount_received'] = round(p_cash + p_card + p_ewallet, 2)
        if proposed_data['total_amount_received'] <= 0:
            return jsonify({"success": False, "message": "Proposed payment split must have at least one amount greater than zero."}), 400

    p_exch_status = proposed_data.get('exchange_status', '').strip()
    if p_exch_status not in ['Yes', 'No']:
        return jsonify({"success": False, "message": "Exchange Status must be Yes or No."}), 400
    if p_exch_status == 'Yes':
        p_exch_brand = proposed_data.get('exchange_brand', '').strip()
        if not p_exch_brand:
            return jsonify({"success": False, "message": "Proposed Exchange Brand is required when Exchange is Yes."}), 400
        try:
            p_exch_val = float(proposed_data.get('exchange_value', 0) or 0)
            if p_exch_val < 0: raise ValueError
            proposed_data['exchange_value'] = p_exch_val
        except ValueError:
            return jsonify({"success": False, "message": "Proposed Exchange Value must be a valid positive number."}), 400
    else:
        proposed_data['exchange_brand'] = ""
        proposed_data['exchange_value'] = 0.0

    proposed_data['customer_id'] = customer_id
    proposed_data['created_by'] = customer.get('created_by', 'admin')
    proposed_data['created_at'] = customer.get('created_at', now_str)

    next_num = 1001
    if requests_list:
        for r in requests_list:
            rid = r.get('request_id', '')
            if rid.startswith('REQ-'):
                try:
                    num = int(rid.split('-')[1])
                    if num >= next_num:
                        next_num = num + 1
                except (ValueError, IndexError):
                    pass
    request_id = f"REQ-{next_num}"

    new_request = {
        "request_id": request_id,
        "customer_id": customer_id,
        "requested_by": session.get('employee_id', 'admin'),
        "requested_role": session.get('role', 'store_employee'),
        "original_data": customer,
        "proposed_data": proposed_data,
        "reason": reason,
        "status": "pending",
        "admin_remarks": "",
        "approved_by": "",
        "approved_at": "",
        "rejected_by": "",
        "rejected_at": "",
        "created_at": now_str
    }

    requests_list.append(new_request)
    save_edit_requests(requests_list)

    return jsonify({"success": True, "message": "Edit request submitted successfully. Waiting for admin approval.", "data": new_request})

@app.route('/api/edit-requests/<request_id>', methods=['DELETE'])
@login_required
@permission_required('edit_request_reject')
def api_delete_edit_request(request_id):
    requests_list = load_edit_requests()
    req = next((r for r in requests_list if r.get('request_id') == request_id), None)
    
    if not req:
        return jsonify({"success": False, "message": "Edit request not found."}), 404
        
    updated_list = [r for r in requests_list if r.get('request_id') != request_id]
    save_edit_requests(updated_list)
    return jsonify({"success": True, "message": "Edit request deleted successfully!"})

@app.route('/api/edit-requests/clear-history', methods=['POST'])
@login_required
@permission_required('edit_request_reject')
def api_clear_edit_requests_history():
    requests_list = load_edit_requests()
    pending_requests = [r for r in requests_list if r.get('status') == 'pending']
    save_edit_requests(pending_requests)
    return jsonify({"success": True, "message": "All edit requests history cleared successfully!"})

@app.route('/api/edit-requests/<request_id>/approve', methods=['POST'])
@login_required
@permission_required('edit_request_approve')
def api_approve_edit_request(request_id):
    data = request.get_json(silent=True) or {}
    admin_remarks = data.get('admin_remarks', '').strip()

    requests_list = load_edit_requests()
    req = next((r for r in requests_list if r.get('request_id') == request_id), None)
    
    if not req:
        return jsonify({"success": False, "message": "Edit request not found."}), 404
        
    if req.get('status') != 'pending':
        return jsonify({"success": False, "message": f"This request is already {req.get('status')}."}), 400

    customers = load_customers()
    customer_index = next((i for i, c in enumerate(customers) if c.get('customer_id') == req.get('customer_id')), -1)
    
    if customer_index == -1:
        return jsonify({"success": False, "message": "Original customer record not found."}), 404

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    proposed = req.get('proposed_data', {})
    
    # Overwrite original customer record, but preserve customer_id, created_at, created_by
    proposed['customer_id'] = customers[customer_index].get('customer_id')
    proposed['created_at'] = customers[customer_index].get('created_at')
    proposed['created_by'] = customers[customer_index].get('created_by')
    proposed['updated_at'] = now_str
    
    customers[customer_index] = proposed
    save_customers(customers)
    
    # Update request entry
    req['status'] = 'approved'
    req['approved_by'] = session.get('employee_id', 'admin')
    req['approved_at'] = now_str
    if admin_remarks:
        req['admin_remarks'] = admin_remarks
    save_edit_requests(requests_list)
    
    return jsonify({"success": True, "message": "Edit request approved and customer record updated successfully!", "customer": proposed})

@app.route('/api/edit-requests/<request_id>/reject', methods=['POST'])
@login_required
@permission_required('edit_request_reject')
def api_reject_edit_request(request_id):
    data = request.get_json(silent=True) or {}
    admin_remarks = data.get('admin_remarks', '').strip()
    
    if not admin_remarks:
        return jsonify({"success": False, "message": "Admin remarks are required when rejecting."}), 400
        
    requests_list = load_edit_requests()
    req = next((r for r in requests_list if r.get('request_id') == request_id), None)
    
    if not req:
        return jsonify({"success": False, "message": "Edit request not found."}), 404
        
    if req.get('status') != 'pending':
        return jsonify({"success": False, "message": f"This request is already {req.get('status')}."}), 400

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Update request entry
    req['status'] = 'rejected'
    req['admin_remarks'] = admin_remarks
    req['rejected_by'] = session.get('employee_id', 'admin')
    req['rejected_at'] = now_str
    save_edit_requests(requests_list)
    
    return jsonify({"success": True, "message": "Edit request rejected successfully.", "data": req})

def migrate_customers_db():
    """Migrate customers database to the new Customer Entry Management System schema."""
    if not os.path.exists(CUSTOMERS_FILE):
        return
        
    try:
        with open(CUSTOMERS_FILE, 'r') as f:
            data = json.load(f)
            
        if not isinstance(data, list):
            return
            
        modified = False
        migrated_list = []
        for index, c in enumerate(data):
            c_modified = False
            
            # Check legacy primary key mapping
            legacy_id = c.get('id', index + 1)
            cust_id = c.get('customer_id')
            if not cust_id:
                cust_id = f"CUST-{1000 + legacy_id}"
                c_modified = True

            # Normalize transaction mode
            t_mode = c.get('transaction_mode', c.get('transactionMode', ''))
            if t_mode in ['EMI', 'Finance']:
                normal_t_mode = 'Finance'
            else:
                normal_t_mode = 'Non-Finance'
            if normal_t_mode != c.get('transaction_mode'):
                c_modified = True

            # Parse amounts safely
            legacy_amt_rec = c.get('amount_received', c.get('amountReceived', '0'))
            try:
                amt_received_val = float(legacy_amt_rec)
            except ValueError:
                amt_received_val = 0.0

            legacy_dp = c.get('down_payment', c.get('downPayment', '0'))
            try:
                dp_val = float(legacy_dp)
            except ValueError:
                dp_val = 0.0

            # Default payment splits based on payment mode
            pay_mode = c.get('payment_mode', c.get('paymentMode', 'Cash'))
            cash_amt = float(c.get('cash_amount', amt_received_val if pay_mode == 'Cash' else 0.0))
            card_amt = float(c.get('card_amount', amt_received_val if pay_mode == 'Card' else 0.0))
            ewallet_amt = float(c.get('ewallet_amount', amt_received_val if pay_mode == 'E-Wallet' else 0.0))
            
            if 'cash_amount' not in c or 'card_amount' not in c or 'ewallet_amount' not in c:
                c_modified = True

            total_rec = cash_amt + card_amt + ewallet_amt
            if normal_t_mode == 'Finance':
                total_rec = dp_val
            
            if 'total_amount_received' not in c:
                c_modified = True

            # Exchange brand and value
            exch_status = c.get('exchange_status', c.get('exchangeStatus', 'No'))
            exch_brand = c.get('exchange_brand', '')
            exch_val = float(c.get('exchange_value', 0.0))
            if 'exchange_brand' not in c or 'exchange_value' not in c:
                c_modified = True

            # Down payment mode
            dp_mode = c.get('down_payment_mode', pay_mode if normal_t_mode == 'Finance' else '')
            if 'down_payment_mode' not in c:
                c_modified = True

            # Auditing timestamps
            c_at = c.get('created_at')
            if not c_at:
                date_val = c.get('date', datetime.now().strftime('%Y-%m-%d'))
                time_val = c.get('time', datetime.now().strftime('%H:%M:%S'))
                c_at = f"{date_val} {time_val}"
                c_modified = True

            u_at = c.get('updated_at', c_at)
            c_by = c.get('created_by', 'admin')

            if c_modified:
                modified = True

            migrated_customer = {
                "customer_id": cust_id,
                "customer_name": ' '.join(w.capitalize() for w in c.get('customer_name', c.get('customerName', 'Unknown')).split()),
                "mobile_number": c.get('mobile_number', c.get('mobileNumber', '')),
                "item_model": c.get('item_model', c.get('itemModel', '')),
                "imei_number": c.get('imei_number', c.get('imei', '')),
                "transaction_mode": normal_t_mode,
                "finance_provider": c.get('finance_provider', c.get('financeOption', '')),
                "down_payment_mode": dp_mode,
                "down_payment_value": dp_val,
                "cash_amount": cash_amt,
                "card_amount": card_amt,
                "ewallet_amount": ewallet_amt,
                "total_amount_received": total_rec,
                "exchange_status": exch_status,
                "exchange_brand": exch_brand,
                "exchange_value": exch_val,
                "sales_person": c.get('sales_person', c.get('salesPerson', '')),
                "remarks": c.get('remarks', ''),
                "created_by": c_by,
                "created_at": c_at,
                "updated_at": u_at
            }
            migrated_list.append(migrated_customer)
                
        if modified:
            save_customers(migrated_list)
            print("Database migrated successfully to new CEMS JSON schema.")
    except Exception as e:
        print(f"Error migrating database: {e}")

if __name__ == '__main__':
    with app.app_context():
        migrate_customers_db()
    app.run(host='0.0.0.0', port=5000, debug=True)

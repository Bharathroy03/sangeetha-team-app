import sys, os, json
sys.path.insert(0, '.')
import app as a

client = a.app.test_client()
a.app.config['TESTING'] = True

print("=== STEP 1: ROUTE AUDIT ===")
client.post('/api/login', json={'employee_id':'22913','password':'Bharathroy@03'})
routes = ['/dashboard','/customer-entry','/customer-records','/customer-history','/crm-walkin-customers','/crm-data','/payment-tracker','/admin/users','/admin/database-editor','/admin/edit-requests']
for r in routes:
    resp = client.get(r)
    follow = resp.headers.get('Location', '')
    status = f"{resp.status_code}" + (f" -> {follow}" if resp.status_code in [301,302] else "")
    print(f"  {r}: {status}")

print()
print("=== STEP 2: API ENDPOINTS ===")
apis = ['/api/customers','/api/crm-walkin-customers','/api/edit-requests','/api/users','/api/payments','/api/payment-summary']
for r in apis:
    resp = client.get(r)
    print(f"  GET {r}: {resp.status_code}")

print()
print("=== STEP 3: CUSTOMER FORM FIELDS ===")
with open('templates/customer_entry.html', 'r') as f:
    ct = f.read()
fields = ['customer_name','mobile_number','item_model','imei_number','transaction_mode','finance_provider','down_payment_mode','down_payment_value','cash_amount','card_amount','ewallet_amount','exchange_status','exchange_brand','exchange_value','sales_person','remarks']
for fld in fields:
    ok = fld in ct
    print(f"  {fld}: {'OK' if ok else 'MISSING'}")

print()
print("=== STEP 4: SCANNER MODAL ===")
cep = open('templates/customer_entry_page.html').read()
cr = open('templates/customer_records.html').read()
print(f"  scannerModal in customer_entry_page.html: {'YES' if 'scannerModal' in cep else 'NO'}")
print(f"  scannerModal in customer_records.html: {'YES' if 'scannerModal' in cr else 'NO'}")
print(f"  btnScanBarcode in customer_entry.html: {'YES' if 'btnScanBarcode' in ct else 'NO'}")

print()
print("=== STEP 5: PERMISSIONS ===")
from permissions import ROLE_PERMISSIONS
for role, perms in ROLE_PERMISSIONS.items():
    print(f"  {role}: {len(perms)} permissions - {sorted(perms)[:3]}...")

print()
print("=== STEP 6: DATA FILES ===")
files = {'customers.json':'data/customers.json','crm_walkin_customers.json':'data/crm_walkin_customers.json','customer_edit_requests.json':'data/customer_edit_requests.json','users.json':'data/users.json','payments.json':'data/payments.json'}
for name, path in files.items():
    exists = os.path.exists(path)
    count = 0
    if exists:
        try:
            count = len(json.load(open(path)))
        except:
            pass
    print(f"  {name}: {'EXISTS' if exists else 'MISSING'}, records: {count}")

print()
print("=== STEP 7: CRITICAL CHECKS ===")
sidebar = open('templates/sidebar.html').read()
appjs = open('static/js/app.js').read()
print(f"  payment-tracker link in sidebar: {'YES' if 'payment-tracker' in sidebar else 'NO - MISSING'}")
print(f"  payment-tracker route registered: {'YES' if '/payment-tracker' in [r.rule for r in a.app.url_map.iter_rules()] else 'NO - MISSING'}")
print(f"  loadDashboardData in app.js: {'YES' if 'loadDashboardData' in appjs else 'NO - MISSING'}")
print(f"  Customer Records tab logic in customer_records.js: {'YES' if 'switchRecordTab' in open('static/js/customer_records.js').read() else 'NO'}")
print(f"  stale |uppercase filter anywhere in templates: {'YES - FOUND' if '| uppercase' in open('templates/customer_entry_page.html').read() else 'CLEAN'}")
print(f"  Mohammad Farooq in customer_entry.html: {'YES' if 'Mohammad Farooq' in ct else 'NO - MISSING'}")

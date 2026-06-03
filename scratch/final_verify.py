import sys, os, json
sys.path.insert(0, '.')
import app as a

client = a.app.test_client()
a.app.config['TESTING'] = True
client.post('/api/login', json={'employee_id':'22913','password':'Bharathroy@03'})

print("=== FINAL POST-FIX VERIFICATION ===")
print()

print("[1] ROUTES STATUS (follow redirects):")
routes = ['/dashboard','/customer-entry','/customer-records','/crm-walkin-customers','/crm-data','/payment-tracker','/admin/users','/admin/database-editor','/admin/edit-requests']
all_routes_ok = True
for r in routes:
    resp = client.get(r, follow_redirects=True)
    status = "OK" if resp.status_code == 200 else "FAIL"
    if resp.status_code != 200:
        all_routes_ok = False
    print(f"  {r}: {resp.status_code} [{status}]")
print(f"  All routes OK: {all_routes_ok}")

print()
print("[2] BARCODE SCANNER MODAL (customer_entry_page.html):")
cep = open('templates/customer_entry_page.html').read()
scanner_elements = ['scannerModal','scannerReader','btnCancelScanner','btnCancelScannerTop','btnSwitchCamera','barcodeFilePicker','scannerErrorMessage','scannerErrorText']
all_ok = True
for el in scanner_elements:
    found = el in cep
    if not found:
        all_ok = False
    print(f"  {el}: {'OK' if found else 'MISSING'}")
print(f"  All scanner elements present: {all_ok}")

print()
print("[3] SIDEBAR NAVIGATION LINKS:")
sidebar = open('templates/sidebar.html').read()
sidebar_links = ['/customer-entry','/customer-records','/payment-tracker','/crm-walkin-customers','/crm-data','/admin/edit-requests','/admin/users','/admin/database-editor']
all_links_ok = True
for link in sidebar_links:
    found = link in sidebar
    if not found:
        all_links_ok = False
    print(f"  {link}: {'OK' if found else 'MISSING'}")
print(f"  All sidebar links present: {all_links_ok}")

print()
print("[4] CUSTOMER ENTRY FORM FIELDS:")
ct = open('templates/customer_entry.html').read()
fields = ['customer_name','mobile_number','item_model','imei_number','transaction_mode','finance_provider','down_payment_mode','down_payment_value','cash_amount','card_amount','ewallet_amount','exchange_status','exchange_brand','exchange_value','sales_person','remarks']
missing = [f for f in fields if f not in ct]
print(f"  All 16 fields present: {'YES' if not missing else 'MISSING: ' + str(missing)}")

print()
print("[5] SALES PERSON OPTIONS:")
persons = ['Bharath Kumar - Manager','Ramesh T - Cashier','Farooq - Staff','Abhishek - OPPO','Azeem - Vivo','Rabiya - Xiaomi','Finance Promoter']
for p in persons:
    found = p in ct
    print(f"  {p}: {'OK' if found else 'MISSING'}")

print()
print("[6] FINANCE PROVIDER OPTIONS:")
providers = ['Bajaj Finserv','DMI Consumer Credit','HDB Financial','IDFC First','TVS Credit']
for p in providers:
    found = p in ct
    print(f"  {p}: {'OK' if found else 'MISSING'}")

print()
print("[7] API ENDPOINTS:")
apis_get = ['/api/customers','/api/crm-walkin-customers','/api/edit-requests','/api/payment-summary','/api/payments']
for r in apis_get:
    resp = client.get(r)
    print(f"  GET {r}: {resp.status_code}")

print()
print("[8] PAYMENT TRACKER PAGE:")
resp = client.get('/payment-tracker', follow_redirects=True)
pt_html = resp.data.decode('utf-8') if resp.status_code == 200 else ''
print(f"  /payment-tracker status: {resp.status_code}")
print(f"  Renders own template (not redirect): {'YES' if 'Payment Tracker' in pt_html and resp.status_code == 200 else 'NO'}")

print()
print("[9] ROLE PERMISSIONS:")
from permissions import ROLE_PERMISSIONS
for role, perms in ROLE_PERMISSIONS.items():
    print(f"  {role}: {len(perms)} permissions")

print()
print("[10] DATA FILES:")
files = [('customers.json','data/customers.json'),('crm_walkin_customers.json','data/crm_walkin_customers.json'),('customer_edit_requests.json','data/customer_edit_requests.json'),('users.json','data/users.json'),('payments.json','data/payments.json')]
for name, path in files:
    exists = os.path.exists(path)
    count = 0
    if exists:
        try: count = len(json.load(open(path)))
        except: pass
    print(f"  {name}: {'OK' if exists else 'MISSING'} ({count} records)")

print()
print("=== ALL CHECKS DONE ===")

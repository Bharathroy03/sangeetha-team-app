"""
One-time script to seed all Sangeetha Mobile store employees.
Run from: sangeetha-team-app directory
"""
import json, bcrypt, uuid
from datetime import datetime
from pathlib import Path

DATA_FILE     = Path('data/users.json')
DEFAULT_PASS  = 'Sang@1974'

# ── Load existing users ────────────────────────────────────────
with open(DATA_FILE, 'r') as f:
    users = json.load(f)

def make_hash(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

# ── Employee master list ───────────────────────────────────────
# (username, job_title, employee_id, system_role)
EMPLOYEES = [
    ('Bharath Kumar R', 'Manager',  '22913',          'super_admin'),  # keep super_admin
    ('Ramesh T',        'Cashier',  '6909',            'store_employee'),
    ('Mohammad Farooq', 'Staff',    'Sangeetha Staff', 'store_employee'),
    ('Abhishek',        'Promoter', 'OPPO',            'store_employee'),
    ('Azeem',           'Promoter', 'VIVO',            'store_employee'),
    ('Rabiya',          'Promoter', 'Xiaomi',          'store_employee'),
    ('Others',          'Promoter', 'All Finance',     'store_employee'),
]

# ── Remove generic "Admin" account (no longer needed) ─────────
users = [u for u in users if u.get('username') != 'Admin']

# ── Build lookup by employee_id ────────────────────────────────
by_id = {u.get('employee_id'): u for u in users}

for (name, title, eid, role) in EMPLOYEES:
    if eid in by_id:
        # Update existing record
        u = by_id[eid]
        u['username']   = name
        u['job_title']  = title
        u['role']       = role
        u['status']     = 'active'
        u['password_hash'] = make_hash(DEFAULT_PASS)
        print(f"[UPDATED] {name}")
    else:
        # Create new record
        new_user = {
            'id':           f"USR-{uuid.uuid4().hex[:8].upper()}",
            'username':     name,
            'employee_id':  eid,
            'role':         role,
            'job_title':    title,
            'password_hash': make_hash(DEFAULT_PASS),
            'status':       'active',
            'created_at':   datetime.now().isoformat()
        }
        users.append(new_user)
        by_id[eid] = new_user
        print(f"[ADDED]   {name}")

# Also update "Sangeetha" store account if present
for u in users:
    if u.get('username') == 'Sangeetha' and not u.get('job_title'):
        u['job_title'] = 'Store Account'

# ── Save ──────────────────────────────────────────────────────
with open(DATA_FILE, 'w') as f:
    json.dump(users, f, indent=2, ensure_ascii=False)

# ── Print credentials table ───────────────────────────────────
print()
print("=" * 65)
print(f"{'NAME':<20} {'TITLE':<18} {'EMP ID':<16} {'PASSWORD'}")
print("=" * 65)
for u in users:
    if u.get('username') in ('Sangeetha',):
        continue   # skip internal store account from printout
    print(f"{u.get('username',''):<20} {u.get('job_title', u.get('role','')):<18} {u.get('employee_id',''):<16} {DEFAULT_PASS}")
print("=" * 65)
print(f"\nLogin URL: http://localhost:5000/login")
print(f"Username  = Employee Name (above)")
print(f"Password  = {DEFAULT_PASS}  (same for all)")

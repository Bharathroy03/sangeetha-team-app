import sqlite3, uuid
from datetime import datetime
from werkzeug.security import generate_password_hash

DB = 'data/sangeetha.db'
PW = 'Sang@1974'
pw_hash = generate_password_hash(PW)
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

EMPLOYEES = [
    ('Bharath Kumar R', 'Manager',  '22913',           'super_admin'),
    ('Ramesh T',        'Cashier',  '6909',             'store_employee'),
    ('Mohammad Farooq', 'Staff',    'Sangeetha Staff',  'store_employee'),
    ('Abhishek',        'Promoter', 'OPPO',             'store_employee'),
    ('Azeem',           'Promoter', 'VIVO',             'store_employee'),
    ('Rabiya',          'Promoter', 'Xiaomi',           'store_employee'),
    ('Others',          'Promoter', 'All Finance',      'store_employee'),
]

conn = sqlite3.connect(DB)
cur  = conn.cursor()

# Remove generic Admin account
cur.execute("DELETE FROM users WHERE username='Admin'")
print("Removed generic Admin account")

for (name, title, eid, role) in EMPLOYEES:
    cur.execute("SELECT user_id FROM users WHERE employee_id=?", (eid,))
    row = cur.fetchone()
    if row:
        cur.execute(
            "UPDATE users SET username=?,job_title=?,role=?,password_hash=?,status=?,updated_at=? WHERE employee_id=?",
            (name, title, role, pw_hash, 'active', now, eid)
        )
        print(f"UPDATED: {name} — {title}")
    else:
        uid = f"USR-{uuid.uuid4().hex[:8].upper()}"
        cur.execute(
            "INSERT INTO users (user_id,username,employee_id,password_hash,role,job_title,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (uid, name, eid, pw_hash, role, title, 'active', now, now)
        )
        print(f"ADDED:   {name} — {title}")

conn.commit()

print()
print("=" * 72)
print(f"{'NAME':<22} {'TITLE':<16} {'EMP ID':<18} {'ROLE'}")
print("=" * 72)
for r in cur.execute("SELECT username,job_title,employee_id,role FROM users ORDER BY rowid").fetchall():
    print(f"  {r[0]:<20} {r[1] or '-':<16} {r[2]:<18} {r[3]}")
print("=" * 72)
conn.close()
print("Migration complete!")

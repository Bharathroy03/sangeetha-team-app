"""
Migrate SQL DB: add job_title column + upsert all employees.
Run from: sangeetha-team-app directory
"""
import sys, uuid
from datetime import datetime
sys.path.insert(0, '.')

from app import app
from database import db, User
from werkzeug.security import generate_password_hash

DEFAULT_PASS = 'Sang@1974'

EMPLOYEES = [
    # (username,          job_title,         employee_id,       role)
    ('Bharath Kumar R',  'Manager',          '22913',           'super_admin'),
    ('Ramesh T',         'Cashier',          '6909',            'store_employee'),
    ('Mohammad Farooq',  'Staff',            'Sangeetha Staff', 'store_employee'),
    ('Abhishek',         'Promoter',         'OPPO',            'store_employee'),
    ('Azeem',            'Promoter',         'VIVO',            'store_employee'),
    ('Rabiya',           'Promoter',         'Xiaomi',          'store_employee'),
    ('Others',           'Promoter',         'All Finance',     'store_employee'),
]

with app.app_context():
    # 1. Add job_title column if missing (SQLite ALTER TABLE)
    with db.engine.connect() as conn:
        try:
            conn.execute(db.text("ALTER TABLE users ADD COLUMN job_title VARCHAR(100)"))
            conn.commit()
            print("[OK] Added job_title column to users table")
        except Exception as e:
            if 'duplicate column' in str(e).lower() or 'already exists' in str(e).lower():
                print("[OK] job_title column already exists")
            else:
                print(f"[WARN] ALTER TABLE: {e}")

    # 2. Remove generic "Admin" account
    admin = User.query.filter_by(username='Admin').first()
    if admin:
        db.session.delete(admin)
        db.session.commit()
        print("[REMOVED] Generic Admin account")

    # 3. Upsert all employees
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    pw_hash = generate_password_hash(DEFAULT_PASS)

    for (name, title, eid, role) in EMPLOYEES:
        existing = User.query.filter_by(employee_id=eid).first()
        if existing:
            existing.username      = name
            existing.job_title     = title
            existing.role          = role
            existing.password_hash = pw_hash
            existing.status        = 'active'
            existing.updated_at    = now
            print(f"[UPDATED] {name} — {title}")
        else:
            new_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
            u = User(
                user_id     = new_id,
                username    = name,
                employee_id = eid,
                password_hash = pw_hash,
                role        = role,
                job_title   = title,
                status      = 'active',
                created_at  = now,
                updated_at  = now
            )
            db.session.add(u)
            print(f"[ADDED]   {name} — {title}")

    db.session.commit()

    # 4. Print final table
    print()
    print("=" * 70)
    print(f"{'NAME':<20} {'TITLE':<16} {'EMP ID':<16} {'ROLE':<15} PASSWORD")
    print("=" * 70)
    for u in User.query.all():
        if u.job_title:
            print(f"{u.username:<20} {u.job_title:<16} {u.employee_id:<16} {u.role:<15} {DEFAULT_PASS}")
    print("=" * 70)
    print("Done! Flask will auto-reload and serve the updated list.")

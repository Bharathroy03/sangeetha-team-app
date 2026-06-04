import os
import sys
from datetime import datetime

# Add the root directory to path to import app and database
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from database import db, User, Customer, CRMWalkin, Payment, PaymentHistory, EditRequest, AuditLog

def migrate_database(supabase_uri):
    print("==================================================")
    print("Starting Migration: Local SQLite to Supabase PostgreSQL")
    print("==================================================")
    
    # 1. Fetch all data from SQLite first
    print("\n[Step 1] Reading local SQLite database records...")
    with app.app_context():
        # Ensure we are currently on the local SQLite DB
        current_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if not current_uri.startswith('sqlite:///'):
            print(f"ERROR: Current database is not SQLite ({current_uri}). Cannot migrate from local.")
            return

        users = [u.to_dict() for u in User.query.all()]
        customers = [c.to_dict() for c in Customer.query.all()]
        walkins = [w.to_dict() for w in CRMWalkin.query.all()]
        payments = [p.to_dict() for p in Payment.query.all()]
        
        # Payment History
        history = []
        for h in PaymentHistory.query.all():
            history.append({
                'id': h.id,
                'payment_id': h.payment_id,
                'amount_added': h.amount_added,
                'payment_mode': h.payment_mode,
                'pending_from': h.pending_from,
                'pending_person_name': h.pending_person_name,
                'payment_status': h.payment_status,
                'settlement_status': h.settlement_status,
                'remarks': h.remarks,
                'created_at': h.created_at,
                'created_by': h.created_by
            })
            
        # Edit Requests
        edit_requests = []
        for r in EditRequest.query.all():
            edit_requests.append({
                'request_id': r.request_id,
                'customer_id': r.customer_id,
                'requested_by': r.requested_by,
                'requested_role': r.requested_role,
                'reason': r.reason,
                'original_data': r.original_data, # JSON dict
                'proposed_data': r.proposed_data, # JSON dict
                'status': r.status,
                'admin_remarks': r.admin_remarks,
                'approved_by': r.approved_by,
                'approved_at': r.approved_at,
                'rejected_by': r.rejected_by,
                'rejected_at': r.rejected_at,
                'created_at': r.created_at
            })

        # Audit Logs
        audit_logs = []
        for a in AuditLog.query.all():
            audit_logs.append({
                'id': a.id,
                'user_id': a.user_id,
                'employee_id': a.employee_id,
                'action': a.action,
                'details': a.details,
                'ip_address': a.ip_address,
                'created_at': a.created_at
            })

    print(f"Loaded from SQLite:")
    print(f"  - Users: {len(users)}")
    print(f"  - Customers: {len(customers)}")
    print(f"  - CRM Walkins: {len(walkins)}")
    print(f"  - Payments: {len(payments)}")
    print(f"  - Payment History Entries: {len(history)}")
    print(f"  - Edit Requests: {len(edit_requests)}")
    print(f"  - Audit Logs: {len(audit_logs)}")

    # 2. Switch to Supabase PostgreSQL URI and create tables
    print("\n[Step 2] Switching connection to Supabase PostgreSQL...")
    app.config['SQLALCHEMY_DATABASE_URI'] = supabase_uri
    
    with app.app_context():
        # Dispose old engine to establish new connections
        db.engine.dispose()
        
        print("Creating tables on Supabase if they do not exist...")
        db.create_all()
        print("[OK] Tables created successfully.")

        # 3. Write data to Supabase
        print("\n[Step 3] Migrating users...")
        # Clear existing seeded users on Supabase to prevent conflicts
        db.session.query(User).delete()
        for u in users:
            db.session.add(User(
                user_id=u['user_id'],
                username=u['username'],
                employee_id=u['employee_id'],
                password_hash=u['password_hash'],
                role=u['role'],
                job_title=u.get('job_title'),
                status=u.get('status', 'active'),
                created_at=u['created_at'],
                updated_at=u['updated_at']
            ))
        db.session.commit()
        print(f"[OK] Migrated {len(users)} users.")

        print("\nMigrating customer entries...")
        db.session.query(Customer).delete()
        for c in customers:
            db.session.add(Customer(
                customer_id=c['customer_id'],
                customer_name=c['customer_name'],
                mobile_number=c['mobile_number'],
                transaction_mode=c['transaction_mode'],
                finance_provider=c.get('finance_provider'),
                down_payment_mode=c.get('down_payment_mode'),
                down_payment_value=c.get('down_payment_value') or 0.0,
                cash_amount=c.get('cash_amount') or 0.0,
                card_amount=c.get('card_amount') or 0.0,
                ewallet_amount=c.get('ewallet_amount') or 0.0,
                total_amount_received=c.get('total_amount_received') or 0.0,
                exchange_status=c['exchange_status'],
                exchange_brand=c.get('exchange_brand'),
                exchange_value=c.get('exchange_value') or 0.0,
                sales_person=c['sales_person'],
                remarks=c.get('remarks'),
                created_at=c['created_at'],
                updated_at=c['updated_at'],
                created_by=c.get('created_by')
            ))
        db.session.commit()
        print(f"[OK] Migrated {len(customers)} customers.")

        print("\nMigrating CRM Walk-in logs...")
        db.session.query(CRMWalkin).delete()
        for w in walkins:
            db.session.add(CRMWalkin(
                id=w['id'],
                customer_name=w['customer_name'],
                mobile_number=w['mobile_number'],
                model_interested=w['model_interested'],
                walkin_reason=w['walkin_reason'],
                sales_person=w['sales_person'],
                remarks=w.get('remarks'),
                created_at=w['created_at'],
                created_by=w.get('created_by')
            ))
        db.session.commit()
        print(f"[OK] Migrated {len(walkins)} CRM Walk-ins.")

        print("\nMigrating Payment Trackers...")
        db.session.query(Payment).delete()
        for p in payments:
            db.session.add(Payment(
                payment_id=p['payment_id'],
                customer_id=p['customer_id'],
                customer_name=p['customer_name'],
                mobile_number=p['mobile_number'],
                invoice_number=p.get('invoice_number'),
                total_bill_amount=p['total_bill_amount'],
                amount_received=p['amount_received'],
                pending_amount=p['pending_amount'],
                payment_mode=p.get('payment_mode'),
                pending_from=p.get('pending_from'),
                pending_person_name=p.get('pending_person_name'),
                payment_status=p['payment_status'],
                settlement_status=p['settlement_status'],
                remarks=p.get('remarks'),
                created_at=p['created_at'],
                updated_at=p['updated_at']
            ))
        db.session.commit()
        print(f"[OK] Migrated {len(payments)} payments.")

        print("\nMigrating Payment History...")
        db.session.query(PaymentHistory).delete()
        for h in history:
            db.session.add(PaymentHistory(
                id=h['id'],
                payment_id=h['payment_id'],
                amount_added=h['amount_added'],
                payment_mode=h.get('payment_mode'),
                pending_from=h.get('pending_from'),
                pending_person_name=h.get('pending_person_name'),
                payment_status=h['payment_status'],
                settlement_status=h['settlement_status'],
                remarks=h.get('remarks'),
                created_at=h['created_at'],
                created_by=h.get('created_by')
            ))
        db.session.commit()
        print(f"[OK] Migrated {len(history)} payment history entries.")

        print("\nMigrating Customer Edit Requests...")
        db.session.query(EditRequest).delete()
        for r in edit_requests:
            db.session.add(EditRequest(
                request_id=r['request_id'],
                customer_id=r['customer_id'],
                requested_by=r['requested_by'],
                requested_role=r['requested_role'],
                reason=r['reason'],
                original_data=r['original_data'],
                proposed_data=r['proposed_data'],
                status=r['status'],
                admin_remarks=r.get('admin_remarks'),
                approved_by=r.get('approved_by'),
                approved_at=r.get('approved_at'),
                rejected_by=r.get('rejected_by'),
                rejected_at=r.get('rejected_at'),
                created_at=r['created_at']
            ))
        db.session.commit()
        print(f"[OK] Migrated {len(edit_requests)} customer edit requests.")

        print("\nMigrating Audit Logs...")
        db.session.query(AuditLog).delete()
        for a in audit_logs:
            db.session.add(AuditLog(
                id=a['id'],
                user_id=a.get('user_id'),
                employee_id=a.get('employee_id'),
                action=a['action'],
                details=a.get('details'),
                ip_address=a.get('ip_address'),
                created_at=a['created_at']
            ))
        db.session.commit()
        print(f"[OK] Migrated {len(audit_logs)} audit logs.")

    print("\n==================================================")
    print("SUCCESS: Database migration completed successfully!")
    print("==================================================")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scratch/migrate_to_supabase.py \"postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres\"")
        sys.exit(1)
    
    supabase_uri = sys.argv[1]
    migrate_database(supabase_uri)

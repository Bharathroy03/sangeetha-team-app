import os
from app import app, DATA_DIR
from database import db, Customer, CRMWalkin, Payment, PaymentHistory, EditRequest, AuditLog, seed_database_from_json

print("=== STARTING DATABASE SYNC ===")
with app.app_context():
    print("Purging existing records from SQLite...")
    try:
        # Delete dependent history first
        db.session.query(PaymentHistory).delete()
        db.session.query(Payment).delete()
        db.session.query(Customer).delete()
        db.session.query(CRMWalkin).delete()
        db.session.query(EditRequest).delete()
        db.session.query(AuditLog).delete()
        db.session.commit()
        print("Purge successful.")
    except Exception as e:
        db.session.rollback()
        print(f"Error purging database: {e}")
        exit(1)

    print("Running seed_database_from_json to load real records from JSON...")
    try:
        seed_database_from_json(DATA_DIR)
        print("Database sync completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
        exit(1)

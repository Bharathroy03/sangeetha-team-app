import os
import json
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Models

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.String(50), primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    employee_id = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    job_title = db.Column(db.String(100), nullable=True)   # e.g. Manager, Cashier, Promoter
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.String(50), nullable=False)
    updated_at = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "employee_id": self.employee_id,
            "password_hash": self.password_hash,
            "role": self.role,
            "job_title": self.job_title or "",
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class Customer(db.Model):
    __tablename__ = 'customers'
    customer_id = db.Column(db.String(50), primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    mobile_number = db.Column(db.String(10), nullable=False)
    item_model = db.Column(db.String(200), nullable=False)
    imei_number = db.Column(db.String(255), nullable=False)
    transaction_mode = db.Column(db.String(50), nullable=False)
    finance_provider = db.Column(db.String(100), nullable=True)
    down_payment_mode = db.Column(db.String(50), nullable=True)
    down_payment_value = db.Column(db.Float, default=0.0)
    cash_amount = db.Column(db.Float, default=0.0)
    card_amount = db.Column(db.Float, default=0.0)
    ewallet_amount = db.Column(db.Float, default=0.0)
    total_amount_received = db.Column(db.Float, default=0.0)
    exchange_status = db.Column(db.String(10), nullable=False)
    exchange_brand = db.Column(db.String(100), nullable=True)
    exchange_value = db.Column(db.Float, default=0.0)
    sales_person = db.Column(db.String(100), nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.String(50), nullable=False)
    updated_at = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "mobile_number": self.mobile_number,
            "item_model": self.item_model,
            "imei_number": self.imei_number,
            "transaction_mode": self.transaction_mode,
            "finance_provider": self.finance_provider,
            "down_payment_mode": self.down_payment_mode,
            "down_payment_value": self.down_payment_value,
            "cash_amount": self.cash_amount,
            "card_amount": self.card_amount,
            "ewallet_amount": self.ewallet_amount,
            "total_amount_received": self.total_amount_received,
            "exchange_status": self.exchange_status,
            "exchange_brand": self.exchange_brand,
            "exchange_value": self.exchange_value,
            "sales_person": self.sales_person,
            "remarks": self.remarks,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class CRMWalkin(db.Model):
    __tablename__ = 'crm_walkin_customers'
    crm_customer_id = db.Column(db.String(50), primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    mobile_number = db.Column(db.String(10), nullable=False)
    model_item = db.Column(db.String(200), nullable=False)
    walkout_reason = db.Column(db.String(100), nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    sales_person = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.String(50), nullable=False)
    updated_at = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "crm_customer_id": self.crm_customer_id,
            "customer_name": self.customer_name,
            "mobile_number": self.mobile_number,
            "model_item": self.model_item,
            "walkout_reason": self.walkout_reason,
            "remarks": self.remarks,
            "sales_person": self.sales_person,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class Payment(db.Model):
    __tablename__ = 'payments'
    payment_id = db.Column(db.String(50), primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    mobile_number = db.Column(db.String(10), nullable=False)
    invoice_number = db.Column(db.String(100), nullable=False)
    item_model = db.Column(db.String(200), nullable=False)
    imei_number = db.Column(db.String(255), nullable=False)
    sales_person = db.Column(db.String(100), nullable=False)
    payment_mode = db.Column(db.String(50), nullable=False)
    total_bill_amount = db.Column(db.Float, default=0.0)
    amount_received = db.Column(db.Float, default=0.0)
    pending_amount = db.Column(db.Float, default=0.0)
    pending_from = db.Column(db.String(50), nullable=True)
    pending_person_name = db.Column(db.String(100), nullable=True)
    due_date = db.Column(db.String(50), nullable=True)
    payment_status = db.Column(db.String(50), nullable=False)
    settlement_status = db.Column(db.String(50), nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.String(50), nullable=False)
    updated_at = db.Column(db.String(50), nullable=False)

    payment_history = db.relationship('PaymentHistory', backref='payment', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            "payment_id": self.payment_id,
            "customer_name": self.customer_name,
            "mobile_number": self.mobile_number,
            "invoice_number": self.invoice_number,
            "item_model": self.item_model,
            "imei_number": self.imei_number,
            "sales_person": self.sales_person,
            "payment_mode": self.payment_mode,
            "total_bill_amount": self.total_bill_amount,
            "amount_received": self.amount_received,
            "pending_amount": self.pending_amount,
            "pending_from": self.pending_from,
            "pending_person_name": self.pending_person_name,
            "due_date": self.due_date,
            "payment_status": self.payment_status,
            "settlement_status": self.settlement_status,
            "remarks": self.remarks,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "payment_history": [h.to_dict() for h in self.payment_history]
        }


class PaymentHistory(db.Model):
    __tablename__ = 'payment_history'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    payment_id = db.Column(db.String(50), db.ForeignKey('payments.payment_id'), nullable=False)
    date_time = db.Column(db.String(50), nullable=False)
    amount_added = db.Column(db.Float, nullable=False)
    received_by = db.Column(db.String(50), nullable=False)
    remarks = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "date_time": self.date_time,
            "amount_added": self.amount_added,
            "received_by": self.received_by,
            "remarks": self.remarks
        }


class EditRequest(db.Model):
    __tablename__ = 'customer_edit_requests'
    request_id = db.Column(db.String(50), primary_key=True)
    customer_id = db.Column(db.String(50), nullable=False)
    requested_by = db.Column(db.String(50), nullable=False)
    requested_role = db.Column(db.String(50), nullable=False)
    original_data = db.Column(db.Text, nullable=False) # Store original data as JSON text
    proposed_data = db.Column(db.Text, nullable=False) # Store proposed data as JSON text
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='pending')
    admin_remarks = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.String(50), nullable=True)
    approved_at = db.Column(db.String(50), nullable=True)
    rejected_by = db.Column(db.String(50), nullable=True)
    rejected_at = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "request_id": self.request_id,
            "customer_id": self.customer_id,
            "requested_by": self.requested_by,
            "requested_role": self.requested_role,
            "original_data": json.loads(self.original_data) if self.original_data else {},
            "proposed_data": json.loads(self.proposed_data) if self.proposed_data else {},
            "reason": self.reason,
            "status": self.status,
            "admin_remarks": self.admin_remarks or "",
            "approved_by": self.approved_by or "",
            "approved_at": self.approved_at or "",
            "rejected_by": self.rejected_by or "",
            "rejected_at": self.rejected_at or "",
            "created_at": self.created_at
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_log'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    action = db.Column(db.String(100), nullable=False)
    performed_by = db.Column(db.String(100), nullable=False)
    employee_id = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.String(50), nullable=False)
    records_deleted = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "action": self.action,
            "performed_by": self.performed_by,
            "employee_id": self.employee_id,
            "role": self.role,
            "timestamp": self.timestamp,
            "records_deleted": self.records_deleted
        }


# Data Seeding Migrator

def seed_database_from_json(data_dir):
    """Seed SQL tables using existing JSON files if SQL tables are empty or out of sync."""
    # 1. Users
    users_file = os.path.join(data_dir, 'users.json')
    if os.path.exists(users_file):
        try:
            with open(users_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for u in data:
                    user_id = u.get('user_id') or u.get('id')
                    employee_id = u.get('employee_id')
                    
                    # Delete conflicting records first
                    conflicting_emp = User.query.filter_by(employee_id=employee_id).first()
                    if conflicting_emp:
                        db.session.delete(conflicting_emp)
                        db.session.flush()
                    conflicting_id = db.session.get(User, user_id)
                    if conflicting_id:
                        db.session.delete(conflicting_id)
                        db.session.flush()

                    created_val = u.get('created_at') or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    updated_val = u.get('updated_at') or created_val
                    db.session.add(User(
                        user_id=user_id,
                        username=u.get('username'),
                        employee_id=employee_id,
                        password_hash=u.get('password_hash'),
                        role=u.get('role'),
                        job_title=u.get('job_title'),
                        status=u.get('status', 'active'),
                        created_at=created_val,
                        updated_at=updated_val
                    ))
            db.session.commit()
            print("Synced 'users' from JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding users: {e}")

    # 2. Customers
    customers_file = os.path.join(data_dir, 'customers.json')
    if os.path.exists(customers_file):
        try:
            with open(customers_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for c in data:
                    customer_id = c.get('customer_id')
                    db_cust = db.session.get(Customer, customer_id)
                    
                    is_dummy = False
                    if db_cust:
                        name = db_cust.customer_name.strip()
                        if name in ["Test Customer", "43534"] or name.isdigit():
                            is_dummy = True
                            
                    if not db_cust or is_dummy:
                        if is_dummy:
                            db_cust.customer_name = c.get('customer_name')
                            db_cust.mobile_number = c.get('mobile_number')
                            db_cust.item_model = c.get('item_model')
                            db_cust.imei_number = c.get('imei_number')
                            db_cust.transaction_mode = c.get('transaction_mode')
                            db_cust.finance_provider = c.get('finance_provider')
                            db_cust.down_payment_mode = c.get('down_payment_mode')
                            db_cust.down_payment_value = float(c.get('down_payment_value', 0.0))
                            db_cust.cash_amount = float(c.get('cash_amount', 0.0))
                            db_cust.card_amount = float(c.get('card_amount', 0.0))
                            db_cust.ewallet_amount = float(c.get('ewallet_amount', 0.0))
                            db_cust.total_amount_received = float(c.get('total_amount_received', 0.0))
                            db_cust.exchange_status = c.get('exchange_status')
                            db_cust.exchange_brand = c.get('exchange_brand')
                            db_cust.exchange_value = float(c.get('exchange_value', 0.0))
                            db_cust.sales_person = c.get('sales_person')
                            db_cust.remarks = c.get('remarks')
                            db_cust.created_by = c.get('created_by')
                            db_cust.created_at = c.get('created_at')
                            db_cust.updated_at = c.get('updated_at')
                        else:
                            db.session.add(Customer(
                                customer_id=customer_id,
                                customer_name=c.get('customer_name'),
                                mobile_number=c.get('mobile_number'),
                                item_model=c.get('item_model'),
                                imei_number=c.get('imei_number'),
                                transaction_mode=c.get('transaction_mode'),
                                finance_provider=c.get('finance_provider'),
                                down_payment_mode=c.get('down_payment_mode'),
                                down_payment_value=float(c.get('down_payment_value', 0.0)),
                                cash_amount=float(c.get('cash_amount', 0.0)),
                                card_amount=float(c.get('card_amount', 0.0)),
                                ewallet_amount=float(c.get('ewallet_amount', 0.0)),
                                total_amount_received=float(c.get('total_amount_received', 0.0)),
                                exchange_status=c.get('exchange_status'),
                                exchange_brand=c.get('exchange_brand'),
                                exchange_value=float(c.get('exchange_value', 0.0)),
                                sales_person=c.get('sales_person'),
                                remarks=c.get('remarks'),
                                created_by=c.get('created_by'),
                                created_at=c.get('created_at'),
                                updated_at=c.get('updated_at')
                            ))
            db.session.commit()
            print("Synced 'customers' from JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding customers: {e}")

    # 3. CRM Walkins
    crm_file = os.path.join(data_dir, 'crm_walkin_customers.json')
    if os.path.exists(crm_file):
        try:
            with open(crm_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for c in data:
                    crm_customer_id = c.get('crm_customer_id')
                    db_crm = db.session.get(CRMWalkin, crm_customer_id)
                    if not db_crm:
                        db.session.add(CRMWalkin(
                            crm_customer_id=crm_customer_id,
                            customer_name=c.get('customer_name'),
                            mobile_number=c.get('mobile_number'),
                            model_item=c.get('model_item'),
                            walkout_reason=c.get('walkout_reason'),
                            remarks=c.get('remarks'),
                            sales_person=c.get('sales_person'),
                            created_by=c.get('created_by'),
                            created_at=c.get('created_at'),
                            updated_at=c.get('updated_at')
                        ))
            db.session.commit()
            print("Synced 'crm_walkin_customers' from JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding CRM: {e}")

    # 4. Payments and Payment History
    payments_file = os.path.join(data_dir, 'payments.json')
    if os.path.exists(payments_file):
        try:
            with open(payments_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for p in data:
                    payment_id = p.get('payment_id')
                    db_pay = db.session.get(Payment, payment_id)
                    if not db_pay:
                        pay = Payment(
                            payment_id=payment_id,
                            customer_name=p.get('customer_name'),
                            mobile_number=p.get('mobile_number'),
                            invoice_number=p.get('invoice_number'),
                            item_model=p.get('item_model'),
                            imei_number=p.get('imei_number'),
                            sales_person=p.get('sales_person'),
                            payment_mode=p.get('payment_mode'),
                            total_bill_amount=float(p.get('total_bill_amount', 0.0)),
                            amount_received=float(p.get('amount_received', 0.0)),
                            pending_amount=float(p.get('pending_amount', 0.0)),
                            pending_from=p.get('pending_from'),
                            pending_person_name=p.get('pending_person_name'),
                            due_date=p.get('due_date'),
                            payment_status=p.get('payment_status'),
                            settlement_status=p.get('settlement_status'),
                            remarks=p.get('remarks'),
                            created_by=p.get('created_by'),
                            created_at=p.get('created_at'),
                            updated_at=p.get('updated_at')
                        )
                        db.session.add(pay)
                        db.session.flush()

                        # History
                        history = p.get('payment_history', [])
                        for h in history:
                            hist = PaymentHistory(
                                payment_id=pay.payment_id,
                                date_time=h.get('date_time'),
                                amount_added=float(h.get('amount_added', 0.0)),
                                received_by=h.get('received_by'),
                                remarks=h.get('remarks')
                            )
                            db.session.add(hist)
            db.session.commit()
            print("Synced 'payments' and 'payment_history' from JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding payments: {e}")

    # 5. Edit Requests
    requests_file = os.path.join(data_dir, 'customer_edit_requests.json')
    if os.path.exists(requests_file):
        try:
            with open(requests_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for r in data:
                    request_id = r.get('request_id')
                    db_req = db.session.get(EditRequest, request_id)
                    if not db_req:
                        req = EditRequest(
                            request_id=request_id,
                            customer_id=r.get('customer_id'),
                            requested_by=r.get('requested_by'),
                            requested_role=r.get('requested_role'),
                            original_data=json.dumps(r.get('original_data', {})),
                            proposed_data=json.dumps(r.get('proposed_data', {})),
                            reason=r.get('reason'),
                            status=r.get('status', 'pending'),
                            admin_remarks=r.get('admin_remarks'),
                            approved_by=r.get('approved_by'),
                            approved_at=r.get('approved_at'),
                            rejected_by=r.get('rejected_by'),
                            rejected_at=r.get('rejected_at'),
                            created_at=r.get('created_at')
                        )
                        db.session.add(req)
            db.session.commit()
            print("Synced 'customer_edit_requests' from JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding edit requests: {e}")

    # 6. Audit Log
    audit_file = os.path.join(data_dir, 'audit_log.json')
    if os.path.exists(audit_file) and AuditLog.query.count() == 0:
        try:
            with open(audit_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for a in data:
                    audit = AuditLog(
                        action=a.get('action'),
                        performed_by=a.get('performed_by'),
                        employee_id=a.get('employee_id'),
                        role=a.get('role'),
                        timestamp=a.get('timestamp'),
                        records_deleted=a.get('records_deleted', 0)
                    )
                    db.session.add(audit)
            db.session.commit()
            print("Seeded 'audit_log' from JSON.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding audit logs: {e}")

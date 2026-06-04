import json
import requests

BASE_URL = 'http://127.0.0.1:5000'

def main():
    try:
        with open('data/users.json', 'r', encoding='utf-8') as f:
            users = json.load(f)
    except Exception as e:
        print(f"Error reading users.json: {e}")
        return

    print("==================================================")
    print("Verifying logins for all user entries...")
    print("==================================================")

    session = requests.Session()
    for u in users:
        emp_id = u.get('employee_id')
        username = u.get('username')
        role = u.get('role')
        job = u.get('job_title', 'Promoter')
        
        # Attempt Login
        res = session.post(f"{BASE_URL}/api/login", json={
            "employee_id": emp_id,
            "password": "Sang@1974"
        })
        
        if res.status_code == 200 and res.json().get('success'):
            # Check dashboard access
            dash_res = session.get(f"{BASE_URL}/dashboard")
            dash_ok = "YES" if dash_res.status_code == 200 else "NO"
            print(f"[OK]   LOGIN SUCCESS: {username:<20} | ID: {emp_id:<15} | Role: {role:<15} | Job: {job:<15} | Dashboard Access: {dash_ok}")
            
            # Logout
            session.post(f"{BASE_URL}/api/logout")
        else:
            print(f"[FAIL] LOGIN FAILED:  {username:<20} | ID: {emp_id:<15} | Role: {role:<15} | Job: {job:<15} | Code: {res.status_code}")

if __name__ == '__main__':
    main()

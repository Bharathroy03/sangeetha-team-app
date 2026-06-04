import requests

s = requests.Session()

# Log in as Bharath Kumar R (super_admin, Employee ID: 22913, Password: Sang@1974)
login_res = s.post('http://127.0.0.1:5000/api/login', json={
    'employee_id': '22913',
    'password': 'Sang@1974'
})
print("Login status:", login_res.status_code)
print("Login response:", login_res.json())

# Retrieve all users
users_res = s.get('http://127.0.0.1:5000/api/users')
print("Users status:", users_res.status_code)
users_data = users_res.json().get('data', [])
print("Number of existing users:", len(users_data))
for u in users_data:
    print(f"User: {u['username']} | Employee ID: {u['employee_id']} | Job Title: {u.get('job_title')}")

# Create a test user with a job title
test_user = {
    'username': 'Test OnePlus Promoter',
    'employee_id': 'OnePlus',
    'password': 'Sang@1974',
    'role': 'store_employee',
    'job_title': 'Promoter'
}
create_res = s.post('http://127.0.0.1:5000/api/users', json=test_user)
print("\nCreate User status:", create_res.status_code)
print("Create User response:", create_res.json())
assert create_res.json()['success'] is True
new_user_id = create_res.json()['data']['user_id']

# Verify the test user shows up in the users list
users_res = s.get('http://127.0.0.1:5000/api/users')
users_data = users_res.json().get('data', [])
added_user = next((u for u in users_data if u['user_id'] == new_user_id), None)
print("\nAdded user verified in list:", added_user)
assert added_user is not None
assert added_user['job_title'] == 'Promoter'

# Verify the test user shows up in the staff list with the correct format (Name — Employee ID)
staff_res = s.get('http://127.0.0.1:5000/api/staff-list')
staff_data = staff_res.json().get('data', [])
added_staff = next((st for st in staff_data if st['username'] == test_user['username']), None)
print("\nStaff list entry for added promoter:", added_staff)
assert added_staff is not None
assert added_staff['display'] == f"{test_user['username']} \u2014 {test_user['employee_id']}"

# Update the user's job title to 'Staff'
update_res = s.put(f'http://127.0.0.1:5000/api/users/{new_user_id}', json={
    'username': 'Test OnePlus Staff',
    'job_title': 'Staff'
})
print("\nUpdate User status:", update_res.status_code)
print("Update User response:", update_res.json())
assert update_res.json()['success'] is True

# Verify the staff list entry reflects the updated job title format (Name — Job Title)
staff_res = s.get('http://127.0.0.1:5000/api/staff-list')
staff_data = staff_res.json().get('data', [])
updated_staff = next((st for st in staff_data if st['username'] == 'Test OnePlus Staff'), None)
print("\nStaff list entry for updated staff:", updated_staff)
assert updated_staff is not None
assert updated_staff['display'] == f"Test OnePlus Staff \u2014 Staff"

# Clean up: delete test user
delete_res = s.delete(f'http://127.0.0.1:5000/api/users/{new_user_id}')
print("\nDelete User status:", delete_res.status_code)
print("Delete User response:", delete_res.json())
assert delete_res.json()['success'] is True

print("\nAll User API tests passed successfully! 🎉")

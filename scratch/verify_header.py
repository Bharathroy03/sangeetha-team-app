import requests
from bs4 import BeautifulSoup

BASE_URL = 'http://127.0.0.1:5000'

def verify_header_elements():
    session = requests.Session()
    # Log in
    res = session.post(f'{BASE_URL}/api/login', json={'employee_id': 'SMPL', 'password': 'Sang@1974'})
    assert res.status_code == 200, "Login failed"
    print("Logged in successfully.")

    # Fetch customer-entry page
    res = session.get(f'{BASE_URL}/customer-entry')
    assert res.status_code == 200, "Failed to load /customer-entry"
    
    soup = BeautifulSoup(res.text, 'html.parser')
    
    # Check Sangeetha Logo Image
    img = soup.find('img', alt='Sangeetha Mobiles')
    assert img is not None, "Sangeetha logo image is missing!"
    print(f"[PASS] Sangeetha Mobiles logo image found with src: {img.get('src')}")
    
    # Check Profile Toggle button
    toggle_btn = soup.find(id='userProfileToggle')
    assert toggle_btn is not None, "Profile toggle button (#userProfileToggle) is missing!"
    print("[PASS] User profile toggle button found.")
    
    # Check Dropdown panel
    dropdown = soup.find(id='mobileUserDropdown')
    assert dropdown is not None, "Mobile user dropdown panel (#mobileUserDropdown) is missing!"
    print("[PASS] Mobile user dropdown panel found.")
    
    # Check Profile Letter
    letter = soup.find(id='userProfileLetter')
    assert letter is not None, "Profile letter placeholder (#userProfileLetter) is missing!"
    print("[PASS] Profile letter placeholder found.")
    
    # Check Profile Close Icon
    close_icon = soup.find(id='userProfileCloseIcon')
    assert close_icon is not None, "Profile close icon (#userProfileCloseIcon) is missing!"
    print("[PASS] Profile close icon found.")
    
    # Check Mobile Logout button
    logout_btn = soup.find(id='btnLogoutMobileMenu')
    assert logout_btn is not None, "Mobile menu logout button (#btnLogoutMobileMenu) is missing!"
    print("[PASS] Mobile menu logout button found.")
    
    print("\nAll header DOM elements verified successfully! Verification PASSED. [SUCCESS]")

if __name__ == '__main__':
    verify_header_elements()

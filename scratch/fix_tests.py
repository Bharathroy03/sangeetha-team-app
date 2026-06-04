import glob
import os

TEST_FILES = [
    'scratch/audit.py',
    'scratch/final_verify.py',
    'scratch/test_auth.py',
    'scratch/test_customer_flow.py',
    'scratch/test_edit_request_deletion.py',
    'scratch/test_updated_flow.py'
]

def main():
    print("--------------------------------------------------")
    print("Replacing old credentials in test files...")
    print("--------------------------------------------------")
    
    for relative_path in TEST_FILES:
        if not os.path.exists(relative_path):
            print(f"File not found: {relative_path}")
            continue
            
        with open(relative_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        modified = False
        if 'Bharathroy@03' in content:
            content = content.replace('Bharathroy@03', 'Sang@1974')
            modified = True
        if 'Ramesh@6909' in content:
            content = content.replace('Ramesh@6909', 'Sang@1974')
            modified = True
            
        if modified:
            with open(relative_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated: {relative_path}")
        else:
            print(f"No changes needed: {relative_path}")

if __name__ == '__main__':
    main()

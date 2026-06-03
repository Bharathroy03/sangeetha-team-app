import os

def check_file_correctness():
    files_to_check = {
        'templates/database_editor.html': {
            'has_native_confirm': False,
            'has_show_confirm': True,
            'has_loading_indicator': True
        },
        'static/js/crm_data.js': {
            'has_native_confirm': False,
            'has_show_confirm': True,
            'has_loading_indicator': True
        },
        'static/js/app.js': {
            'has_native_confirm': False,
            'has_show_confirm': True,
            'has_local_override': False,
            'has_loading_indicator': True
        },
        'static/js/payment_tracker.js': {
            'has_native_confirm': False,
            'has_show_confirm': True,
            'has_local_override': False,
            'has_loading_indicator': True
        }
    }

    errors = []

    for rel_path, rules in files_to_check.items():
        full_path = os.path.join('c:/Users/91845/Desktop/Store_sales_aData/sangeetha-team-app', rel_path)
        if not os.path.exists(full_path):
            errors.append(f"File not found: {rel_path}")
            continue
        
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Rule: No native confirm calls like confirm("...") or confirm(`...`)
        # We search for confirm( unless it's window.showConfirm or showConfirm
        if 'confirm(' in content or ' confirm(' in content:
            # Check if it is native or not
            occurrences = [line for line in content.split('\n') if 'confirm(' in line and 'showConfirm' not in line]
            if occurrences:
                errors.append(f"{rel_path} contains potential native confirm calls: {occurrences}")

        # Rule: Must have window.showConfirm calls
        if rules.get('has_show_confirm') and 'showConfirm' not in content:
            errors.append(f"{rel_path} is missing custom showConfirm call")

        # Rule: No local override declaration of window.showConfirm =
        if not rules.get('has_local_override', True):
            if 'window.showConfirm =' in content or 'window.showConfirm=' in content:
                errors.append(f"{rel_path} still has a local window.showConfirm override declaration!")

        # Rule: Must use window.showLoading and window.hideLoading
        if rules.get('has_loading_indicator'):
            if 'showLoading' not in content or 'hideLoading' not in content:
                errors.append(f"{rel_path} is missing window.showLoading or hideLoading integration")

    if errors:
        print("=== VERIFICATION FAILED ===")
        for err in errors:
            print(f"  - {err}")
        return False
    else:
        print("=== ALL STATIC CODE VERIFICATIONS PASSED SUCCESSFULLY ===")
        return True

if __name__ == '__main__':
    check_file_correctness()

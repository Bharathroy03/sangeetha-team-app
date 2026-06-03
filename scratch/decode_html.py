import json

file_path = r"c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\scratch\customer_entry_step_2900.html"
decoded_path = r"c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\scratch\customer_entry_original_decoded.html"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read().strip()

# Since it is a JSON-encoded string, we can parse it using json.loads
try:
    decoded = json.loads(content)
except Exception:
    # If it's already a string but has literal \n and \"
    # We can try wrapping in quotes and loading
    if not content.startswith('"'):
        content = '"' + content + '"'
    try:
        decoded = json.loads(content)
    except Exception as e:
        print(f"Error: {e}")
        decoded = content

with open(decoded_path, 'w', encoding='utf-8') as out_f:
    out_f.write(decoded)

print(f"Decoded to {decoded_path}")

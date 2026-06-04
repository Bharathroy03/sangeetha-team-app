"""Find all HTML element IDs in customer_records.html"""
import re

content = open("templates/customer_records.html", encoding="utf-8").read()
ids = re.findall(r'id=["\']([^"\']+)["\']', content)
print(f"Total IDs found: {len(ids)}")
for i in sorted(set(ids)):
    print(f"  {i}")

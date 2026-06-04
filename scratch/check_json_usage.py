with open("app.py", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "CUSTOMERS_FILE" in line or "customers.json" in line:
            print(f"{idx+1}: {line.strip()}")

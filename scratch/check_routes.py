with open("app.py", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "@app.route" in line:
            print(f"{idx+1}: {line.strip()}")

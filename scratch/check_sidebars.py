import os

templates_dir = "templates"
for f in os.listdir(templates_dir):
    if f.endswith(".html"):
        path = os.path.join(templates_dir, f)
        with open(path, "r", encoding="utf-8") as file:
            content = file.read()
            if "<aside" in content and "sidebar.html" not in content:
                print(f"Hardcoded sidebar found in {f}!")

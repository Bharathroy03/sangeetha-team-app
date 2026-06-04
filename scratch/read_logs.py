import os
import json

logs_dir = r"C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs"
if os.path.exists(logs_dir):
    print("Logs dir contents:")
    for f in os.listdir(logs_dir):
        path = os.path.join(logs_dir, f)
        print(f, os.path.getsize(path))
        if f.endswith(".jsonl"):
            with open(path, "r", encoding="utf-8") as file:
                lines = file.readlines()
                print(f"Total steps: {len(lines)}")
                # Search backwards for the browser subagent console logs
                for line in reversed(lines):
                    data = json.loads(line)
                    if "capture_browser_console_logs" in line:
                        print("FOUND tool call or response:")
                        print(json.dumps(data, indent=2)[:3000])
                        print("-" * 50)
else:
    print("Logs dir does not exist:", logs_dir)

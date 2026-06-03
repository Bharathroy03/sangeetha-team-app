import json
import os

log_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\55ec4a83-e5d0-4c4a-b6aa-7d2169327d39\.system_generated\logs\transcript.jsonl"
if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get('step_index')
                if step <= 150:
                    if data.get('type') == 'USER_INPUT':
                        print(f"=== STEP {step} ===")
                        print(data.get('content'))
                        print("-" * 50)
            except Exception as e:
                pass
else:
    print(f"Log path does not exist: {log_path}")

import json

log_path = r'C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs\transcript.jsonl'
output_path = r'c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\scratch\user_inputs.txt'
with open(log_path, 'r', encoding='utf-8') as f, open(output_path, 'w', encoding='utf-8') as out:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            out.write(f"Step {data.get('step_index')}: {data.get('content')}\n")

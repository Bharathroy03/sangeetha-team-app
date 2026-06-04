import json

log_path = r'C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs\transcript.jsonl'
output_path = r'c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\scratch\search_results.txt'

with open(log_path, 'r', encoding='utf-8') as f, open(output_path, 'w', encoding='utf-8') as out:
    lines = f.readlines()
    for idx in range(530, min(len(lines), 580)):
        try:
            data = json.loads(lines[idx])
            out.write(f"--- STEP {data.get('step_index')} (Source: {data.get('source')}, Type: {data.get('type')}) ---\n")
            content = data.get('content', '')
            out.write(f"Content: {content[:2000]}\n")
            if 'tool_calls' in data and data['tool_calls']:
                out.write(f"Tool Calls: {json.dumps(data['tool_calls'], indent=2)[:2000]}\n")
            out.write("\n")
        except Exception as e:
            out.write(f"Error parsing line {idx}: {e}\n")

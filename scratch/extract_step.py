import json
import os

log_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\55ec4a83-e5d0-4c4a-b6aa-7d2169327d39\.system_generated\logs\transcript.jsonl"
output_path = r"c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\scratch\customer_entry_step_2900.html"

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get('step_index')
                if step == 2900:
                    tool_calls = data.get('tool_calls', [])
                    for tc in tool_calls:
                        name = tc.get('name')
                        if name == 'write_to_file':
                            args = tc.get('args', {})
                            code_content = args.get('CodeContent', '')
                            with open(output_path, 'w', encoding='utf-8') as out_f:
                                out_f.write(code_content)
                            print(f"Successfully extracted step 2900 CodeContent to {output_path}")
            except Exception as e:
                print(f"Error parsing line: {e}")
else:
    print(f"Log path does not exist: {log_path}")

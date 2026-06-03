import json
import os

log_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\55ec4a83-e5d0-4c4a-b6aa-7d2169327d39\.system_generated\logs\transcript.jsonl"

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get('step_index')
                if step == 2900:
                    print("Found step 2900")
                    tool_calls = data.get('tool_calls', [])
                    print(f"Number of tool calls: {len(tool_calls)}")
                    for tc in tool_calls:
                        print(f"Tool call name: {tc.get('name')}")
                        args = tc.get('args', {})
                        content = args.get('CodeContent', '')
                        print(f"CodeContent length: {len(content)}")
                        print(f"Keys in args: {list(args.keys())}")
                        # Print the first 500 characters and last 500 characters
                        print("FIRST 500:")
                        print(content[:500])
                        print("\nLAST 500:")
                        print(content[-500:])
            except Exception as e:
                print(f"Error: {e}")
else:
    print("Log file not found")

import os
import json

brain_dir = r"C:\Users\91845\.gemini\antigravity-ide\brain"
matches = []

for root, dirs, files in os.walk(brain_dir):
    for file in files:
        if file == 'transcript.jsonl':
            full_path = os.path.join(root, file)
            print(f"Searching: {full_path}")
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        if 'customerForm' in line or 'customer_entry.html' in line:
                            # Parse JSON
                            data = json.loads(line)
                            # We only care about code contents / text content that shows form layouts
                            content = data.get('content', '')
                            tool_calls = data.get('tool_calls', [])
                            
                            # check if it wrote to a file or showed a file
                            has_content = False
                            for tc in tool_calls:
                                args = tc.get('args', {})
                                if 'templates' in str(args) and ('CodeContent' in args or 'ReplacementContent' in args):
                                    has_content = True
                                    
                            if has_content or ('<form' in content and 'customer_name' in content):
                                print(f"Match found in {full_path} step {data.get('step_index')}")
                                matches.append((full_path, data.get('step_index'), data))
            except Exception as e:
                pass

print(f"Total matches found: {len(matches)}")
# If we have matches, let's print the first few details
for p, s, d in matches[:10]:
    print(f"Path: {p}, Step: {s}, Type: {d.get('type')}")

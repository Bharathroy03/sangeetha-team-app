import json

transcript_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        if "capture_browser_console_logs" in line:
            data = json.loads(line)
            # Check if this is a response step (which contains the logs)
            if data.get("status") == "DONE" and data.get("type") in ["PLANNER_RESPONSE", "SYSTEM"]:
                continue
            # Let's print the line if it is a tool call response
            print("STEP:", data.get("step_index"), data.get("type"), data.get("source"))
            # If it's a browser subagent's internal tool call, it might be nested.
            # Let's print the whole data, truncated if too long
            s = json.dumps(data, indent=2)
            if len(s) > 2000:
                print(s[:1000] + "\n... TRUNCATED ...\n" + s[-1000:])
            else:
                print(s)
            print("=" * 60)

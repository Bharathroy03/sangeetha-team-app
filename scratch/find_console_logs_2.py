import json

transcript_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        if "1391B84D516F601EF7D72CCB2C152CCD" in line:
            data = json.loads(line)
            # Look for step outputs of type capture_browser_console_logs
            tool_calls = data.get("tool_calls", [])
            for call in tool_calls:
                if call.get("name") == "capture_browser_console_logs":
                    print("TOOL CALL:", data.get("step_index"))
            # If it's a response step:
            # Let's print the whole line if it contains console log outputs
            if "logs" in data or "console" in data:
                print("STEP RESPONSE:", data.get("step_index"))
                s = json.dumps(data, indent=2)
                if len(s) > 2000:
                    print(s[:2000])
                else:
                    print(s)
                print("="*60)

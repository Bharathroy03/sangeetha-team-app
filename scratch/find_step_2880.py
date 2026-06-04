import json

transcript_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 2880:
            print("STEP 2880 content:")
            print(data.get("content"))

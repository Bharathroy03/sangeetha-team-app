import os
import json

logs_dir = r"C:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app"
transcript_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs\transcript.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line_idx, line in enumerate(f):
        data = json.loads(line)
        if data.get("type") == "BROWSER_SUBAGENT" and data.get("step_index") > 2800:
            # Let's inspect this subagent run
            print(f"Subagent step {data.get('step_index')}: status={data.get('status')}")
            # If it's a subagent run, it has a content field that summarizes what the subagent did. Let's see if we can find console log output in it.
            print(data.get("content")[:5000])

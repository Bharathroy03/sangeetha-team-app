import json

transcript_path = r"C:\Users\91845\.gemini\antigravity-ide\brain\6e10f572-bdb4-47ca-9859-08f3031d02db\.system_generated\logs\transcript.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line_idx, line in enumerate(f):
        if "console" in line.lower() or "error" in line.lower():
            try:
                data = json.loads(line)
                step = data.get("step_index")
                source = data.get("source")
                type_ = data.get("type")
                # print summary
                print(f"Step {step} ({type_} by {source}) contains matching terms")
                content = data.get("content", "")
                if "console_log" in content or "console.log" in content or "console" in content or "error" in content:
                    print("Matches in content:")
                    # print matching paragraphs
                    for p in content.split("\n"):
                        if any(term in p.lower() for term in ["console", "error", "exception", "failed"]):
                            print("  ", p[:150])
            except Exception as e:
                pass

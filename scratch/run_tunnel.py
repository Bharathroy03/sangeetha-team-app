import subprocess
import sys
import os

log_file_path = os.path.join(os.path.dirname(__file__), "tunnel.log")
print(f"Logging to {log_file_path}", flush=True)

cmd = [
    "ssh",
    "-p", "443",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ServerAliveInterval=30",
    "-R", "80:localhost:5000",
    "a.pinggy.io"
]

try:
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=0 # Unbuffered
    )
    
    with open(log_file_path, "w", encoding="utf-8") as f:
        f.write("Starting Pinggy tunnel...\n")
        f.flush()
        os.fsync(f.fileno())
        
        while True:
            char = process.stdout.read(1)
            if not char:
                break
            f.write(char)
            f.flush()
            os.fsync(f.fileno()) # Force write to disk immediately
            
    process.wait()
except Exception as e:
    with open(log_file_path, "a", encoding="utf-8") as f:
        f.write(f"\nError running tunnel: {e}\n")
    sys.exit(1)

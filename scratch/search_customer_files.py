import os
import fnmatch

search_root = r"C:\Users\91845\Desktop"
matches = []

for root, dirnames, filenames in os.walk(search_root):
    for filename in fnmatch.filter(filenames, '*customer*.html'):
        full_path = os.path.join(root, filename)
        matches.append((full_path, os.path.getsize(full_path)))

print(f"Found {len(matches)} files:")
for m, sz in matches:
    print(f"  {m} ({sz} bytes)")

import difflib

file1 = r"c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\templates\customer_entry.html"
file2 = r"c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\scratch\customer_entry_step_2900.html"

with open(file1, 'r', encoding='utf-8') as f:
    lines1 = f.readlines()

with open(file2, 'r', encoding='utf-8') as f:
    lines2 = f.readlines()

diff = difflib.unified_diff(lines1, lines2, fromfile='current', tofile='step2900')
diff_list = list(diff)

if not diff_list:
    print("Files are identical!")
else:
    print("Files differ. Print first 50 lines of diff:")
    for line in diff_list[:50]:
        print(line, end='')

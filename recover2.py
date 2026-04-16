import sys

with open('diff.txt', 'r', encoding='utf-16') as f:
    lines = f.readlines()

in_bad_hunk = False
deleted_lines = []

for line in lines:
    if line.startswith('@@ -878,'):
        in_bad_hunk = True
        continue
    if in_bad_hunk:
        if line.startswith('@@ '):
            break
        if line.startswith('-'):
            deleted_lines.append(line[1:])
        elif not line.startswith('+') and not line.startswith('\\'):
            deleted_lines.append(line[1:])

if deleted_lines:
    with open('recovered.ts', 'w', encoding='utf-8') as f:
        f.writelines(deleted_lines)
    print("Recovered", len(deleted_lines), "lines.")
else:
    print("Nothing recovered.")

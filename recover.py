import re

with open('diff.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_bad_hunk = False
deleted_lines = []

for line in lines:
    if line.startswith('diff --git a/sylaabus planner/StudyPlanner.tsx'):
        print('Found file')
    if line.startswith('@@ -878,'):
        in_bad_hunk = True
        print('Found hunk!')
        continue
    if in_bad_hunk:
        if line.startswith('@@ '):
            break
        if line.startswith('-'):
            deleted_lines.append(line[1:])
        elif not line.startswith('+') and not line.startswith('\\'):
            deleted_lines.append(line[1:])

if deleted_lines:
    print('Found', len(deleted_lines), 'lines of deleted text.')
    with open('recovered_chunk.txt', 'w', encoding='utf-8') as f:
        f.writelines(deleted_lines)
else:
    print('No lines found')

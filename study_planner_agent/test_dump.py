"""Full output dump test."""
import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, r"d:\SAFAR_PARENT\SAFAR\study_planner_agent")
os.chdir(r"d:\SAFAR_PARENT\SAFAR\study_planner_agent")

from main import extract_text, build_prompt, call_groq_api
from validator import validate_syllabus_code

text = extract_text(r"d:\SAFAR_PARENT\SAFAR\Extras\Syllabu.pdf")
messages = build_prompt(text)
result = call_groq_api(messages)

lines = result.split('\n')
print(f"Total lines: {len(lines)}")
for i, line in enumerate(lines):
    print(f"  {i+1:3d}: {repr(line)}")

print()
valid, errors = validate_syllabus_code(result)
print(f"Valid: {valid}")
for e in errors:
    print(f"  {e}")

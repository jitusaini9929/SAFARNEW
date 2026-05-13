"""Local test for the English Core PDF."""
import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, r"d:\SAFAR_PARENT\SAFAR\study_planner_agent")
os.chdir(r"d:\SAFAR_PARENT\SAFAR\study_planner_agent")

from main import extract_text, build_prompt, call_groq_api
from validator import validate_syllabus_code

print("=== TESTING ENGLISH CORE PDF ===")
text = extract_text(r"d:\SAFAR_PARENT\SAFAR\Extras\Microsoft Word - 2025-26 TERMWISE SYLLABUS CLASS XI ENG Core - 11_English_Core_EM.pdf")
print("Extracted text length:", len(text))

messages = build_prompt(text)
try:
    result = call_groq_api(messages)
    print("Result length:", len(result))
    print()
    print(result[:3000])
    print()
    valid, errors = validate_syllabus_code(result)
    print("Valid:", valid)
    if errors:
        for e in errors[:10]:
            print("  ", e)
    else:
        print("No errors!")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")

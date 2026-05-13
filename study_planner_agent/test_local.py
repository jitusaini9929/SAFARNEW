"""Local end-to-end test of the syllabus import pipeline."""
import sys
import os
import io

# Force UTF-8 on stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, r"d:\SAFAR_PARENT\SAFAR\study_planner_agent")
os.chdir(r"d:\SAFAR_PARENT\SAFAR\study_planner_agent")

from main import extract_text, build_prompt, call_groq_api
from validator import validate_syllabus_code

# Step 1: Extract text
print("=== EXTRACTING TEXT ===")
text = extract_text(r"d:\SAFAR_PARENT\SAFAR\Extras\Syllabu.pdf")
print("Extracted text length:", len(text))
print("First 800 chars:")
print(text[:800])
print()

# Step 2: Build prompt and call API
print("=== CALLING GROQ API ===")
messages = build_prompt(text)
try:
    result = call_groq_api(messages)
    print("Result length:", len(result))
    print()
    print("=== RAW RESULT (first 3000 chars) ===")
    print(result[:3000])
    print()

    # Step 3: Validate
    print("=== VALIDATING ===")
    valid, errors = validate_syllabus_code(result)
    print("Valid:", valid)
    if errors:
        print("Errors:")
        for e in errors:
            print("  ", e)
    else:
        print("No errors! Output is valid.")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")

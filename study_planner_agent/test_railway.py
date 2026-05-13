"""Test what the Railway agent actually returns - using curl to bypass SSL issues."""
import subprocess
import sys
import json

# Test against Railway
url = "https://safar-production-0a86.up.railway.app/api/syllabus/import"

for name, path in [
    ("Syllabu.pdf", r"d:\SAFAR_PARENT\SAFAR\Extras\Syllabu.pdf"),
    ("EnglishCore.pdf", r"d:\SAFAR_PARENT\SAFAR\Extras\Microsoft Word - 2025-26 TERMWISE SYLLABUS CLASS XI ENG Core - 11_English_Core_EM.pdf"),
]:
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"{'='*60}")
    
    result = subprocess.run(
        [
            "curl", "-s", "-w", "\n%{http_code}",
            "-X", "POST",
            "-F", f"file=@{path}",
            url,
        ],
        capture_output=True, text=True, timeout=180
    )
    
    lines = result.stdout.strip().split("\n")
    status_code = lines[-1] if lines else "?"
    body = "\n".join(lines[:-1])
    
    print(f"Status: {status_code}")
    try:
        data = json.loads(body)
        print(f"Success: {data.get('success')}")
        print(f"Message: {data.get('message')}")
        if data.get("errors"):
            print(f"Errors: {data['errors'][:5]}")
        if data.get("syllabusCode"):
            code = data["syllabusCode"]
            print(f"Code length: {len(code)}")
            print(f"First 500 chars:\n{code[:500]}")
    except:
        print(f"Raw (first 1000): {body[:1000]}")

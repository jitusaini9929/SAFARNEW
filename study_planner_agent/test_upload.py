"""Quick script to test the syllabus import endpoint directly."""
import urllib.request
import json
import sys

AGENT_URL = "https://safar-production-0a86.up.railway.app/api/syllabus/import"
PDF_PATH = r"d:\SAFAR_PARENT\SAFAR\Extras\Syllabu.pdf"

boundary = "----PythonBoundary9x8z7"

with open(PDF_PATH, "rb") as f:
    file_data = f.read()

parts = []
parts.append(("--" + boundary).encode())
parts.append(b'Content-Disposition: form-data; name="file"; filename="Syllabu.pdf"')
parts.append(b"Content-Type: application/pdf")
parts.append(b"")
parts.append(file_data)
parts.append(("--" + boundary + "--").encode())

body = b"\r\n".join(parts)

req = urllib.request.Request(AGENT_URL, data=body, method="POST")
req.add_header("Content-Type", "multipart/form-data; boundary=" + boundary)

print("Uploading to:", AGENT_URL)
print("File size:", len(file_data), "bytes")
try:
    resp = urllib.request.urlopen(req, timeout=180)
    result = resp.read().decode("utf-8", errors="replace")
    print("Status:", resp.status)
    data = json.loads(result)
    print(json.dumps(data, indent=2, ensure_ascii=True))
except urllib.error.HTTPError as e:
    result = e.read().decode("utf-8", errors="replace")
    print("Status:", e.code)
    try:
        data = json.loads(result)
        print(json.dumps(data, indent=2, ensure_ascii=True))
    except:
        print("Raw:", result[:3000])
except Exception as e:
    print("Error:", type(e).__name__, e)
    sys.exit(1)

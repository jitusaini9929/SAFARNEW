import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from main import build_prompt, call_groq_api, extract_text
from validator import validate_syllabus_code

app = FastAPI(title="Safar Syllabus Agent")

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/syllabus/import")
async def import_syllabus(file: UploadFile = File(...)):
    filename = (file.filename or "").strip()
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail="Only PDF, DOCX, and TXT files are supported."
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        extracted_text = extract_text(temp_path)
        messages = build_prompt(extracted_text)
        syllabus_code = call_groq_api(messages)

        is_valid, errors = validate_syllabus_code(syllabus_code)
        if not is_valid:
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "message": "Generated syllabus format failed validation.",
                    "errors": errors,
                    "syllabusCode": syllabus_code,
                },
            )

        return {
            "success": True,
            "message": "Syllabus imported successfully.",
            "syllabusCode": syllabus_code,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Syllabus import failed: {exc}") from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

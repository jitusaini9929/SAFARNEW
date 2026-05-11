"""
MVP Agent for Syllabus Conversion
---------------------------------

This script provides a command‑line interface (CLI) to convert a syllabus
contained in a variety of common document formats (PDF, DOCX, TXT and images)
into a plain‑text representation using a simple three‑symbol grammar:

    * ``-`` at the beginning of a line denotes a **Subject**.
    * ``_`` at the beginning of a line denotes a **Chapter** under the most
      recent subject.
    * ``>`` at the beginning of a line denotes a **Topic** under the most
      recent chapter.

The extracted text is sent to an AI model hosted by Groq which is guided by a
strict prompt to produce output in this format. After generation, the output
is validated to ensure it conforms to the grammar before being written to disk
or printed to the console.

Usage:

    python main.py path/to/syllabus.pdf -o formatted_syllabus.txt

The script requires a valid GROQ API key to be present in the environment
variable ``GROQ_API_KEY``. It uses the ``meta-llama/llama-4-scout-17b-16e-instruct``
model by default, which is multimodal and well suited to extracting
structured information from unstructured text.

Dependencies are listed in ``requirements.txt``. See the accompanying
``README.md`` for installation instructions.
"""

import argparse
import os
import sys
from typing import List, Tuple

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from docx import Document  # python‑docx
except ImportError:
    Document = None

try:
    from PIL import Image  # Pillow
except ImportError:
    Image = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    from groq import Groq
except ImportError:
    Groq = None

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    from .validator import validate_syllabus_code
except ImportError:
    from validator import validate_syllabus_code


def extract_text(file_path: str) -> str:
    """
    Extract raw text from supported file types.

    Supported extensions:
    - .pdf   : Extracts text from each page using PyMuPDF.
    - .docx  : Reads paragraphs using python‑docx.
    - .txt   : Returns the file contents as is.
    - .jpg/.jpeg/.png : Performs OCR using Tesseract via pytesseract.

    Args:
        file_path: Absolute or relative path to the source file.

    Returns:
        A single string containing all extracted text.

    Raises:
        RuntimeError: If required extraction libraries are missing or the
            extension is unsupported.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        if fitz is None:
            raise RuntimeError(
                "PyMuPDF (fitz) is not installed. Please install it to extract text from PDFs."
            )
        doc = fitz.open(file_path)
        pages_text = []
        for page in doc:
            # "text" returns a simple UTF‑8 string with minimal formatting
            pages_text.append(page.get_text("text"))
        return "\n".join(pages_text)
    elif ext == ".docx":
        if Document is None:
            raise RuntimeError(
                "python‑docx is not installed. Please install it to extract text from DOCX files."
            )
        document = Document(file_path)
        return "\n".join([p.text for p in document.paragraphs])
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf‑8", errors="ignore") as f:
            return f.read()
    elif ext in {".jpg", ".jpeg", ".png"}:
        if Image is None or pytesseract is None:
            raise RuntimeError(
                "Pillow and pytesseract are required for OCR. Please install them to extract text from images."
            )
        image = Image.open(file_path)
        # Use pytesseract to convert image to string
        ocr_text = pytesseract.image_to_string(image)
        return ocr_text
    else:
        raise RuntimeError(f"Unsupported file extension: {ext}")


def build_prompt(extracted_text: str) -> List[dict]:
    """
    Construct the system and user messages for the Groq API.

    The prompt instructs the model to output only the clean syllabus code
    according to the defined grammar. It prevents generation of additional
    commentary or formatting.

    Args:
        extracted_text: The raw text to be formatted by the model.

    Returns:
        A list of message dictionaries in the format required by Groq API.
    """
    system_message = {
        "role": "system",
        "content": (
            "You are a syllabus formatting agent.\n"
            "Your only task is to convert the provided syllabus content into this exact plain‑text format:\n"
            "- Subject name\n"
            "_ Chapter name\n"
            "> Topic name\n\n"
            "Rules:\n"
            "1. Use '-' only for subjects.\n"
            "2. Use '_' only for chapters under a subject.\n"
            "3. Use '>' only for topics under a chapter.\n"
            "4. Do not create exam plans.\n"
            "5. Do not estimate study duration.\n"
            "6. Do not add extra topics unless they are clearly present in the input.\n"
            "7. Do not write explanations.\n"
            "8. Do not use markdown.\n"
            "9. Do not use numbering.\n"
            "10. If the subject name is missing, infer a reasonable subject name from the content.\n"
            "11. If chapters are present but topics are not, output only subjects and chapters.\n"
            "12. If the input is messy, preserve the academic hierarchy as accurately as possible.\n"
            "13. Output only the final formatted syllabus text."
        ),
    }
    user_message = {
        "role": "user",
        "content": extracted_text,
    }
    return [system_message, user_message]


def call_groq_api(messages: List[dict], model: str = "meta-llama/llama-4-scout-17b-16e-instruct") -> str:
    """
    Send a chat completion request to the Groq API.

    Args:
        messages: The list of message dictionaries (system and user) to send.
        model: The identifier of the Groq model to use. Defaults to the
            multimodal Llama 4 Scout model.

    Returns:
        The plain text response content from the model.

    Raises:
        RuntimeError: If the Groq client library is missing or the API call
            fails.
    """
    if Groq is None:
        raise RuntimeError(
            "The groq Python client library is not installed. Please install it to use this function."
        )
    if load_dotenv is not None:
        load_dotenv()
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "A GROQ_API_KEY environment variable is required to call the Groq API."
        )
    client = Groq(api_key=api_key)
    try:
        response = client.chat.completions.create(
            messages=messages,
            model=model,
        )
    except Exception as e:
        # rewrap the exception to provide more context
        raise RuntimeError(f"Groq API call failed: {e}") from e
    # Extract the content from the first choice; there should be exactly one
    return response.choices[0].message.content.strip()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Convert a syllabus document into a plain‑text code using subject, chapter and topic markers"
        )
    )
    parser.add_argument(
        "file",
        type=str,
        help="Path to the input syllabus file (PDF, DOCX, TXT, JPG/PNG)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        help=(
            "Optional output file to save the formatted syllabus. If omitted, "
            "the result is printed to standard output."
        ),
    )
    args = parser.parse_args()

    # Step 1: extract text
    try:
        extracted = extract_text(args.file)
    except Exception as e:
        print(f"Error extracting text: {e}", file=sys.stderr)
        sys.exit(1)

    # Step 2: build messages and call Groq
    messages = build_prompt(extracted)
    try:
        formatted_code = call_groq_api(messages)
    except Exception as e:
        print(f"Error during AI formatting: {e}", file=sys.stderr)
        sys.exit(2)

    # Step 3: validate the generated code
    valid, errors = validate_syllabus_code(formatted_code)
    if not valid:
        print("Validation failed. The following errors were detected:")
        for err in errors:
            print(f" - {err}")
        print(
            "\nYou may try editing the extracted text or verifying the AI output before retrying."
        )
        sys.exit(3)

    # Step 4: write or print
    if args.output:
        with open(args.output, "w", encoding="utf‑8") as f:
            f.write(formatted_code)
        print(f"Formatted syllabus written to {args.output}")
    else:
        print(formatted_code)


if __name__ == "__main__":
    main()

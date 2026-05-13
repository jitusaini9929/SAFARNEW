"""
MVP Agent for Syllabus Conversion
---------------------------------

This script provides a command‑line interface (CLI) to convert a syllabus
contained in common document formats (PDF, DOCX, TXT)
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
            "You are an expert syllabus extraction agent. Your only job is to parse academic syllabus text and output it in a strict three-level hierarchy format.\n\n"

            "OUTPUT FORMAT (use these exact symbols, no substitutions):\n"
            "- Subject name\n"
            "_ Chapter name\n"
            "> Topic name\n\n"

            "=== CRITICAL HIERARCHY RULES ===\n"
            "1. A SUBJECT is a major academic discipline or course: e.g. Mathematics, Physics, Chemistry, Biology, English, History.\n"
            "2. A CHAPTER is a named unit, module, or section WITHIN a subject: e.g. 'Relations and Functions', 'Solid State', 'The Portrait of a Lady'.\n"
            "3. A TOPIC is a specific concept or lesson WITHIN a chapter: e.g. 'Determinants', 'Electrolysis', 'Parts of Speech'.\n\n"

            "=== WHAT IS NOT A SUBJECT ===\n"
            "- The document title (e.g. 'Karnataka 2nd PUC Syllabus 2025-26') is NOT a subject. Ignore it.\n"
            "- Board names, school names, university names, and state education dept names are NOT subjects.\n"
            "- Year/session identifiers (e.g. 'Academic Year 2025-26') are NOT subjects.\n"
            "- Section headings like 'Introduction', 'How to Download', 'Additional Notes', 'Contents', 'Preface' are NOT subjects — skip them entirely.\n"
            "- Headings like 'Other Subjects', 'Electives', 'Languages' that group subjects are NOT themselves subjects — their contents are the subjects.\n\n"

            "=== TABLE OF CONTENTS HANDLING ===\n"
            "- A Table of Contents (TOC) typically appears near the top and lists entries with page numbers (e.g. '2 Mathematics Syllabus 3').\n"
            "- Do NOT use the TOC to build the hierarchy. Use the actual subject/chapter content sections that follow.\n"
            "- If the document only has a TOC and no detailed content, treat each TOC entry as a subject or chapter based on its academic level.\n\n"

            "=== MULTI-SUBJECT DOCUMENTS ===\n"
            "- Many syllabi cover multiple subjects (Math, Physics, Chemistry, etc.). Each should be its own '-' subject line.\n"
            "- Look for clear subject transitions: a heading that names an academic discipline followed by a list of chapters/topics.\n"
            "- If a heading says 'Mathematics Syllabus' or 'Maths' — the subject is 'Mathematics', not 'Mathematics Syllabus'.\n"
            "- Strip redundant words like 'Syllabus', 'Course', 'Module' from subject names when they make them redundant (e.g. 'Mathematics Syllabus' → 'Mathematics').\n\n"

            "=== IDENTIFYING CHAPTERS VS TOPICS ===\n"
            "- Chapters are named units that appear directly under a subject heading, usually numbered or titled boldly.\n"
            "- Topics are granular concepts listed within a chapter, often as bullet points, sub-items, or indented items.\n"
            "- If only a flat list of units is given under a subject with no further breakdown, treat them as chapters (not topics).\n"
            "- If a chapter clearly has sub-items or concepts, those become '>' topics.\n\n"

            "=== INFERENCE RULES ===\n"
            "- If no subject is explicitly labeled but the content clearly belongs to a discipline, infer the subject name from context.\n"
            "- If chapters are listed but topics are absent, output only '-' subjects and '_' chapters — do NOT invent topics.\n"
            "- If the syllabus mixes subjects with no chapter breakdown, output only '-' subjects with their chapter-level items as '_' chapters.\n\n"

            "=== STRICT OUTPUT RULES ===\n"
            "- Output ONLY the formatted syllabus lines. No explanations, no markdown, no headers, no numbering, no extra text.\n"
            "- Do not create fictional content. Only extract what is genuinely present in the input.\n"
            "- Each line must start with exactly '-', '_', or '>'.\n"
            "- Keep names concise and clean — no trailing page numbers or parenthetical notes.\n\n"

            "=== EXAMPLES ===\n"
            "Input: 'Karnataka 2nd PUC Syllabus\\nMathematics Syllabus\\nRelations and Functions\\nInverse Trig Functions\\nPhysics Syllabus\\nElectric Charges and Fields'\n"
            "Output:\n"
            "- Mathematics\n"
            "_ Relations and Functions\n"
            "_ Inverse Trigonometric Functions\n"
            "- Physics\n"
            "_ Electric Charges and Fields\n\n"

            "Input: 'English Core\\nReading Skills\\nUnseen Passage\\nNote Making\\nWriting Skills\\nShort Composition'\n"
            "Output:\n"
            "- English Core\n"
            "_ Reading Skills\n"
            "> Unseen Passage\n"
            "> Note Making\n"
            "_ Writing Skills\n"
            "> Short Composition\n"
        ),
    }
    user_message = {
        "role": "user",
        "content": (
            "Parse the following syllabus text and output it in the required format.\n"
            "Remember: the document title or board name is NOT a subject.\n"
            "Each academic discipline (Mathematics, Physics, English, etc.) is its own subject.\n\n"
            f"SYLLABUS TEXT:\n{extracted_text}"
        ),
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
        help="Path to the input syllabus file (PDF, DOCX, TXT)",
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

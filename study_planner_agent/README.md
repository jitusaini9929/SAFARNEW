# Study Planner Syllabus Import – MVP Agent

This repository contains a minimal working prototype that automates the
conversion of complex syllabus documents into the plain‑text format used by
your Study Planner.  The agent extracts text from various source file types
and sends it to a multimodal large language model hosted by Groq.  The
model restructures the syllabus into a simple hierarchical code defined by
three leading symbols:

```
- Subject
_ Chapter
> Topic
```

Once the AI returns the formatted text, a validator checks that it
conforms to the grammar.  If validation succeeds, the result may be saved
to disk or passed to your existing planner.

## Features

- **Multi‑format extraction** – supports PDF, DOCX, plain‑text and
  common image formats (JPEG/PNG).  OCR is performed via [Tesseract]
  when reading from images.
- **Agentic formatting** – uses Groq’s
  `meta-llama/llama-4-scout-17b-16e-instruct` model to convert messy
  syllabus text into the strict subject/chapter/topic code.  The client
  library demonstrates how to call the Groq API using an API key from
  your environment【92005513550040†L32-L40】.
- **Validation** – includes a validator that flags missing subject or
  chapter names, topics placed outside their parents, and any lines
  that do not start with one of the three allowed symbols.
- **Command‑line interface** – run the agent from your terminal to
  convert files in bulk and save the results.

## Installation

1. **Install Python 3.10+** if it is not already available.  See
   <https://www.python.org/downloads/> for installers.
2. **Clone or download** this repository and navigate into the
   `mvp_agent` directory.
3. Install the required libraries:

   ```sh
   # Create a virtual environment (recommended)
   python -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   # .venv\Scripts\activate   # Windows

   # Install dependencies
   pip install -r requirements.txt
   ```

4. **Install Tesseract** (optional, only required for image OCR).
   - **Ubuntu/Debian:** `sudo apt install tesseract-ocr`
   - **macOS:** `brew install tesseract`
   - **Windows:** download the installer from
     <https://github.com/tesseract-ocr/tesseract> and follow the
     instructions.

   If you install Tesseract somewhere other than the default path,
   set the `TESSDATA_PREFIX` environment variable to point to its
   installation directory.

5. Obtain a **Groq API key** from the [Groq Console](https://console.groq.com/) and
   set it in your environment.  You can either export it directly:

   ```sh
   export GROQ_API_KEY="sk-..."
   ```

   or create a `.env` file and use [`python‑dotenv`](https://pypi.org/project/python-dotenv/)
   to load it automatically.  The Groq Python library reads the
   `GROQ_API_KEY` from your environment by default【92005513550040†L32-L40】.

   When making chat completion requests you must specify the model,
   e.g. `meta-llama/llama-4-scout-17b-16e-instruct`【92005513550040†L160-L165】.

## Usage

Run the agent on a syllabus file from the command line:

```sh
python main.py /path/to/syllabus.pdf -o formatted_syllabus.txt
```

Arguments:

- `file` (required): path to the syllabus input file (PDF, DOCX, TXT, JPG, PNG).
- `-o`/`--output` (optional): path to write the formatted output.  If omitted
  the result is printed to the console.

### Example

Suppose you have a PDF file containing a physics syllabus.  Convert it as
follows:

```sh
python main.py physics_syllabus.pdf -o physics_code.txt
```

If the output passes validation you will see:

```
Formatted syllabus written to physics_code.txt
```

Open `physics_code.txt` to review the code.  You may then import it into
your Study Planner.

If validation fails the script prints all detected errors and exits with
a non‑zero status.  In that case you can inspect the AI output, adjust
the extracted text (perhaps removing extraneous content), and re‑run.

## Configuration and Customisation

- **Model selection:** The default model is `meta-llama/llama-4-scout-17b-16e-instruct`.  To
  use a different Groq model, modify the `model` argument in
  `call_groq_api()` inside `main.py`.
- **Prompt modifications:** The agent uses a carefully crafted system prompt
  to enforce the subject/chapter/topic hierarchy.  If your syllabus
  documents follow different conventions you can adjust the `system_message`
  in `build_prompt()`.
- **Error handling:** The current implementation stops at the first failed
  validation.  You may extend the validator or add a repair step to
  automatically fix minor errors (e.g. trimming empty lines).

## Improvements & Future Work

This MVP implements the core workflow described in the user’s design notes
(“Improvements 1‑4”).  Those improvements encompass:

1. **A unified interface** for importing and parsing complex syllabus
   documents.
2. **A text extraction layer** that hides format details and performs
   OCR when necessary.
3. **A strict AI formatting agent** that outputs only the three‑symbol
   grammar, reducing cost by delegating the heavy lifting to a single
   call.
4. **Validation and preview** so that students can review and correct
   their syllabus before it is committed to the planner.

Additional enhancements might include:

- Caching or chunking large PDFs to reduce API usage.
- A graphical interface to preview and edit the generated hierarchy.
- Support for JSON output rather than plain text for more robust
  downstream processing.

## References

* The official Groq Python library documentation demonstrates how to
  instantiate a client using an API key and call the chat completion
  endpoint【92005513550040†L32-L40】.  The same library can be used to
  access the Llama 4 Scout model by specifying
  `meta-llama/llama-4-scout-17b-16e-instruct`【92005513550040†L160-L165】.
* For further reading about Groq’s models, see the [Llama 4
  Scout 17B 16E model card](https://console.groq.com/models/meta-llama/llama-4-scout-17b-16e-instruct).

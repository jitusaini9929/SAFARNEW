"""
Syllabus Code Validator
-----------------------

This module provides a simple validator for the subject/chapter/topic
representation used by the Study Planner. It ensures the output from
the AI formatter conforms to the expected grammar before it is fed
into downstream components.

The grammar rules are as follows:

* Lines beginning with ``-`` introduce a new subject. The remainder of
  the line must contain a non‑empty subject name.
* Lines beginning with ``_`` introduce a new chapter. A subject must
  have been defined previously, and the remainder of the line must be
  non‑empty.
* Lines beginning with ``>`` introduce a new topic. A subject and
  chapter must have been defined previously, and the remainder of the
  line must be non‑empty.

If any rule is violated the validator returns ``False`` and a list
describing each violation. Otherwise it returns ``True`` and an empty
error list.
"""

from typing import List, Tuple


def validate_syllabus_code(code: str) -> Tuple[bool, List[str]]:
    """
    Validate a block of syllabus code.

    Args:
        code: The full formatted syllabus returned by the AI.

    Returns:
        A tuple ``(is_valid, errors)`` where ``is_valid`` is ``True`` if the
        code passes all checks and ``errors`` is a list of human readable
        strings describing each encountered violation.
    """
    errors: List[str] = []
    current_subject = None
    current_chapter = None
    lines = [line.strip() for line in code.splitlines() if line.strip()]
    for idx, line in enumerate(lines, start=1):
        if line.startswith("-"):
            subject_name = line[1:].strip()
            if not subject_name:
                errors.append(f"Line {idx}: Subject name missing after '-'.")
            current_subject = subject_name
            current_chapter = None
        elif line.startswith("_"):
            chapter_name = line[1:].strip()
            if current_subject is None:
                errors.append(f"Line {idx}: Chapter specified before any subject.")
            if not chapter_name:
                errors.append(f"Line {idx}: Chapter name missing after '_'.")
            current_chapter = chapter_name
        elif line.startswith(">"):
            topic_name = line[1:].strip()
            if current_subject is None:
                errors.append(f"Line {idx}: Topic specified before any subject.")
            if current_chapter is None:
                errors.append(f"Line {idx}: Topic specified before any chapter.")
            if not topic_name:
                errors.append(f"Line {idx}: Topic name missing after '>'.")
        else:
            errors.append(
                f"Line {idx}: Invalid line prefix. Lines must start with '-', '_' or '>'."
            )
    return (len(errors) == 0, errors)
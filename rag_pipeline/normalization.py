"""
Text normalization.

Cleans raw extracted text before chunking: unifies line endings, collapses
redundant whitespace, strips empty lines, and trims each line. This keeps
chunk boundaries meaningful and avoids feeding noisy whitespace into the
embedding step.
"""

import re


def normalize_text(raw_text: str) -> str:
    """
    Normalize raw extracted text.

    - Unifies CRLF/CR line endings to LF.
    - Collapses runs of spaces/tabs into a single space.
    - Strips leading/trailing whitespace from every line.
    - Removes blank lines (extraction artifacts from PDFs/DOCX often leave
      several in a row).
    - Collapses 3+ consecutive newlines down to a double newline so
      paragraph structure is preserved without excessive gaps.
    """
    if not raw_text:
        return ""

    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)

    lines = [line.strip() for line in text.split("\n")]
    non_empty_lines = [line for line in lines if line]
    text = "\n".join(non_empty_lines)

    text = re.sub(r"\n{2,}", "\n", text)

    return text.strip()

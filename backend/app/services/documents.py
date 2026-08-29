import os
import re
from pathlib import Path

BACKEND_STORAGE = Path(__file__).resolve().parent.parent.parent / "storage" / "documents"
try:
    BACKEND_STORAGE.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR = BACKEND_STORAGE
except (OSError, PermissionError):
    UPLOAD_DIR = Path("/tmp/uploads")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


ALLOWED_EXTENSIONS = {
    ".txt",
    ".md",
    ".pdf",
    ".docx",
}

def save_document(
    project_id: int,
    filename: str,
    content: bytes,
):
    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension}"
        )

    project_dir = UPLOAD_DIR / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(
        r"[^a-zA-Z0-9._-]",
        "_",
        filename
    )

    file_path = project_dir / safe_name
    file_path.write_bytes(content)

    return str(file_path)


def extract_text(file_path: str):
    path = Path(file_path)
    extension = path.suffix.lower()

    if extension in {".txt", ".md"}:
        return path.read_text(
            encoding="utf-8",
            errors="ignore"
        )

    if extension == ".pdf":
        try:
            import pypdf

            reader = pypdf.PdfReader(str(path))

            return "\n".join(
                page.extract_text() or ""
                for page in reader.pages
            )

        except Exception as exc:
            raise ValueError(
                f"PDF extraction failed: {exc}"
            )

    if extension == ".docx":
        try:
            from docx import Document

            document = Document(str(path))

            return "\n".join(
                paragraph.text
                for paragraph in document.paragraphs
            )

        except Exception as exc:
            raise ValueError(
                f"DOCX extraction failed: {exc}"
            )

    raise ValueError("Unsupported document")


def chunk_text(
    text: str,
    chunk_size: int = 1200,
    overlap: int = 200,
):
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(
            start + chunk_size,
            len(text)
        )

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(
            end - overlap,
            start + 1
        )

    return chunks

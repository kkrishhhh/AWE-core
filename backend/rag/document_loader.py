"""
Universal Document Loader — handles extracting text from PDF, CSV, DOCX, and TXT files.
"""

# Trigger uvicorn reload

import csv
import json
import logging
import os
from io import BytesIO

from docx import Document as DocxDocument
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)

class DocumentLoader:
    """Extracts raw text and metadata from various file formats."""

    @staticmethod
    def load(file_content: bytes, filename: str) -> str:
        """
        Parse raw bytes based on file extension and return extracted text.
        """
        ext = os.path.splitext(filename)[1].lower()
        
        try:
            if ext == ".pdf":
                return DocumentLoader._load_pdf(file_content)
            elif ext == ".csv":
                return DocumentLoader._load_csv(file_content)
            elif ext == ".docx":
                return DocumentLoader._load_docx(file_content)
            elif ext == ".json":
                return DocumentLoader._load_json(file_content)
            elif ext in [".txt", ".md", ".py", ".js", ".yaml", ".yml", ".html"]:
                return file_content.decode("utf-8")
            else:
                raise ValueError(f"Unsupported file type: {ext}")
        except Exception as e:
            logger.error(f"Failed to load document {filename}: {e}")
            raise RuntimeError(f"Error processing {filename}: {str(e)}")

    @staticmethod
    def _load_pdf(content: bytes) -> str:
        pdf = PdfReader(BytesIO(content))
        text = ""
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n\n"
        return text.strip()

    @staticmethod
    def _load_csv(content: bytes) -> str:
        text = content.decode("utf-8")
        reader = csv.reader(text.splitlines())
        rows = []
        for row in reader:
            rows.append(" | ".join(row))
        return "\n".join(rows)

    @staticmethod
    def _load_docx(content: bytes) -> str:
        doc = DocxDocument(BytesIO(content))
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

    @staticmethod
    def _load_json(content: bytes) -> str:
        data = json.loads(content.decode("utf-8"))
        return json.dumps(data, indent=2)

# Global singleton
document_loader = DocumentLoader()

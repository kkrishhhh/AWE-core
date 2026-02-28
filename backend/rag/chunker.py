"""
Text chunker for RAG pipeline — splits documents into overlapping chunks
for optimal retrieval quality.
"""


def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[dict]:
    """
    Split text into overlapping chunks with metadata.

    Args:
        text: The full document text.
        chunk_size: Target characters per chunk.
        chunk_overlap: Overlap between consecutive chunks for context continuity.

    Returns:
        List of dicts with 'text', 'chunk_index', 'start_char', 'end_char'.
    """
    if not text.strip():
        return []

    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + chunk_size

        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence-ending punctuation near the boundary
            for boundary in [". ", ".\n", "! ", "? ", "\n\n"]:
                last_boundary = text.rfind(boundary, start + chunk_size // 2, end + 100)
                if last_boundary != -1:
                    end = last_boundary + len(boundary)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append({
                "text": chunk,
                "chunk_index": chunk_index,
                "start_char": start,
                "end_char": min(end, len(text)),
            })
            chunk_index += 1

        start = end - chunk_overlap

    return chunks

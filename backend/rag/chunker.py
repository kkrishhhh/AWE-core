"""
Text chunker for RAG pipeline — uses LangChain's splitters for intelligent chunking
based on semantic boundaries (paragraphs, sentences) rather than naïve characters.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
import logging

logger = logging.getLogger(__name__)

def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[dict]:
    """
    Split text into overlapping chunks using LangChain's RecursiveCharacterTextSplitter.

    Args:
        text: The full document text.
        chunk_size: Target characters per chunk.
        chunk_overlap: Overlap between consecutive chunks for context continuity.

    Returns:
        List of dicts with 'text' and 'chunk_index' ('start_char'/'end_char' are estimated).
    """
    if not text or not text.strip():
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )

    try:
        langchain_chunks = splitter.create_documents([text])
        
        chunks = []
        current_char_estimate = 0
        
        for index, doc in enumerate(langchain_chunks):
            chunk_str = doc.page_content.strip()
            if chunk_str:
                chunks.append({
                    "text": chunk_str,
                    "chunk_index": index,
                    "start_char": current_char_estimate,
                    "end_char": current_char_estimate + len(chunk_str),
                })
                # Estimate for legacy compatibility
                current_char_estimate += max(1, len(chunk_str) - chunk_overlap)
                
        return chunks
    except Exception as e:
        logger.error(f"Error during chunking: {e}")
        # Fallback to primitive chunking if LangChain fails for some reason
        chunks = []
        for i in range(0, len(text), chunk_size - chunk_overlap):
            chunk = text[i:i + chunk_size]
            chunks.append({
                "text": chunk,
                "chunk_index": len(chunks),
                "start_char": i,
                "end_char": i + len(chunk)
            })
        return chunks


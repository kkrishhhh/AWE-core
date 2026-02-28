"""
Vector store wrapper for ChromaDB — manages document storage and semantic search.
"""

import uuid
import structlog
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.rag.chunker import chunk_text

logger = structlog.get_logger()


class VectorStore:
    """Production vector store backed by ChromaDB with persistent storage."""

    def __init__(self, persist_dir: str = "./chroma_data"):
        self.client = chromadb.Client(ChromaSettings(
            persist_directory=persist_dir,
            anonymized_telemetry=False,
        ))
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("vector_store_initialized", persist_dir=persist_dir)

    def ingest(
        self,
        text: str,
        source: str = "unknown",
        metadata: dict | None = None,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
    ) -> dict:
        """
        Ingest a document: chunk it and add all chunks to the vector store.

        Returns summary with document_id and chunk count.
        """
        doc_id = str(uuid.uuid4())
        chunks = chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        if not chunks:
            return {"document_id": doc_id, "chunks": 0, "error": "Empty document"}

        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            chunk_id = f"{doc_id}_chunk_{chunk['chunk_index']}"
            ids.append(chunk_id)
            documents.append(chunk["text"])
            metadatas.append({
                "document_id": doc_id,
                "source": source,
                "chunk_index": chunk["chunk_index"],
                "start_char": chunk["start_char"],
                "end_char": chunk["end_char"],
                **(metadata or {}),
            })

        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )

        logger.info(
            "document_ingested",
            document_id=doc_id,
            source=source,
            chunks=len(chunks),
            total_chars=len(text),
        )

        return {
            "document_id": doc_id,
            "source": source,
            "chunks": len(chunks),
            "total_characters": len(text),
        }

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """Semantic similarity search — returns top_k most relevant chunks."""
        results = self.collection.query(
            query_texts=[query],
            n_results=min(top_k, self.collection.count() or 1),
        )

        matches = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0
                matches.append({
                    "text": doc,
                    "source": meta.get("source", "unknown"),
                    "document_id": meta.get("document_id", "unknown"),
                    "chunk_index": meta.get("chunk_index", 0),
                    "relevance_score": round(1 - distance, 4),
                })

        return matches

    def list_documents(self) -> list[dict]:
        """List all unique documents in the store."""
        all_items = self.collection.get()
        if not all_items or not all_items["metadatas"]:
            return []

        # Deduplicate by document_id
        docs = {}
        for meta in all_items["metadatas"]:
            doc_id = meta.get("document_id", "unknown")
            if doc_id not in docs:
                docs[doc_id] = {
                    "document_id": doc_id,
                    "source": meta.get("source", "unknown"),
                    "chunks": 0,
                }
            docs[doc_id]["chunks"] += 1

        return list(docs.values())

    def get_stats(self) -> dict:
        """Return store statistics."""
        return {
            "total_chunks": self.collection.count(),
            "total_documents": len(self.list_documents()),
        }


# Global singleton
vector_store = VectorStore()

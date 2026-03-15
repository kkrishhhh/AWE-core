"""
Vector store wrapper using LangChain's Chroma integrations and HuggingFace embeddings.
Implements Ensemble Retrieval (Semantic + MMR + BM25) for high-quality document search.
"""

import os
import uuid
import structlog
from typing import List, Dict, Any

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

from backend.rag.chunker import chunk_text

logger = structlog.get_logger()

# Set up global HuggingFace model
# We use all-MiniLM-L6-v2 as it's fast, free, and runs locally.
embed_model = "sentence-transformers/all-MiniLM-L6-v2"


class VectorStore:
    """Production vector store backed by LangChain Chroma with persistent storage."""

    def __init__(self, persist_dir: str = "./chroma_data"):
        self.persist_dir = persist_dir
        self.embeddings = HuggingFaceEmbeddings(model_name=embed_model)
        
        # Initialize LangChain's Chroma wrapper
        self.vectorstore = Chroma(
            collection_name="documents",
            embedding_function=self.embeddings,
            persist_directory=self.persist_dir
        )
        
        # We maintain an in-memory BM25 retriever for the ensemble
        self._bm25_retriever = None
        self._rebuild_bm25()
            
        logger.info("vector_store_initialized", persist_dir=persist_dir)

    def _rebuild_bm25(self):
        """Rebuilds the BM25 index from all documents in Chroma for the ensemble."""
        try:
            all_data = self.vectorstore.get()
            documents = []
            
            # Handle dictionary return type (raw Chroma format)
            if isinstance(all_data, dict) and all_data.get("documents"):
                for idx, text in enumerate(all_data["documents"]):
                    meta = all_data["metadatas"][idx] if all_data.get("metadatas") else {}
                    documents.append(Document(page_content=text, metadata=meta))
            # Handle Langchain Document list return type
            elif isinstance(all_data, list) and len(all_data) > 0 and hasattr(all_data[0], "page_content"):
                documents = all_data
                
            if documents:
                self._bm25_retriever = BM25Retriever.from_documents(documents)
            else:
                self._bm25_retriever = None
        except Exception as e:
            logger.error(f"Failed to rebuild BM25: {e}")
            self._bm25_retriever = None

    def ingest(
        self,
        text: str,
        source: str = "unknown",
        metadata: dict | None = None,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
    ) -> dict:
        """
        Ingest a document: chunk it dynamically and add to Chroma.
        Returns summary with document_id and chunk count.
        """
        doc_id = str(uuid.uuid4())
        
        # Using the advanced LangChain splitter from our chunker
        chunks_info = chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        if not chunks_info:
            return {"document_id": doc_id, "chunks": 0, "error": "Empty document"}

        documents = []
        for chunk in chunks_info:
            chunk_meta = {
                "document_id": doc_id,
                "source": source,
                "chunk_index": chunk["chunk_index"],
                **(metadata or {}),
            }
            documents.append(Document(page_content=chunk["text"], metadata=chunk_meta))

        # Add to Chroma
        self.vectorstore.add_documents(documents)
        
        # Rebuild BM25 with new docs
        self._rebuild_bm25()

        logger.info(
            "document_ingested",
            document_id=doc_id,
            source=source,
            chunks=len(documents),
        )

        return {
            "document_id": doc_id,
            "source": source,
            "chunks": len(documents),
        }

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Ensemble Semantic similarity search — returns top relevant chunks.
        Combines Standard Similarity, Maximum Marginal Relevance (MMR), and BM25 (Keyword).
        """
        count = self.vectorstore._collection.count()
        if count == 0:
            return []

        retrievers = []
        weights = []

        # 1. Standard semantic search
        retriever_vanilla = self.vectorstore.as_retriever(
            search_type="similarity", 
            search_kwargs={"k": min(top_k, count)}
        )
        retrievers.append(retriever_vanilla)
        weights.append(0.35)

        # 2. Maximum Marginal Relevance (for topic diversity)
        if count >= top_k:
            retriever_mmr = self.vectorstore.as_retriever(
                search_type="mmr", 
                search_kwargs={"k": min(top_k, count), "fetch_k": min(top_k * 2, count)}
            )
            retrievers.append(retriever_mmr)
            weights.append(0.35)

        # 3. BM25 Keyword Search
        bm25 = self._bm25_retriever
        if bm25:
            bm25.k = min(top_k, count)
            retrievers.append(bm25)

        # Custom Ensemble Merge (Deduplicated)
        seen_chunks = set()
        matches = []
        
        for retriever in retrievers:
            try:
                raw_results = retriever.invoke(query)
                for doc in raw_results:
                    meta = doc.metadata or {}
                    chunk_key = f"{meta.get('document_id')}_{meta.get('chunk_index')}"
                    
                    if chunk_key not in seen_chunks:
                        seen_chunks.add(chunk_key)
                        matches.append({
                            "text": doc.page_content,
                            "source": meta.get("source", "unknown"),
                            "document_id": meta.get("document_id", "unknown"),
                            "chunk_index": meta.get("chunk_index", 0),
                        })
                        if len(matches) >= top_k:
                            return matches
            except Exception as e:
                logger.error(f"Retriever failed: {e}")
                
        return matches[:top_k]

    def list_documents(self) -> list[dict]:
        """List all unique documents in the store."""
        all_items = self.vectorstore.get()
        docs = {}
        
        # Extract metadata list based on return type
        metadatas = []
        if isinstance(all_items, dict) and all_items.get("metadatas"):
            metadatas = all_items["metadatas"]
        elif isinstance(all_items, list):
            metadatas = [doc.metadata for doc in all_items if hasattr(doc, "metadata")]

        for meta in metadatas:
            if not isinstance(meta, dict): continue
            doc_id = meta.get("document_id", "unknown")
            if doc_id not in docs:
                docs[doc_id] = {
                    "document_id": doc_id,
                    "source": meta.get("source", "unknown"),
                    "chunks": 0,
                }
            docs[doc_id]["chunks"] += 1

        return list(docs.values())

    def delete_document(self, document_id: str) -> dict:
        """Delete all chunks belonging to a document_id."""
        all_items = self.vectorstore.get(where={"document_id": document_id})
        
        ids_to_delete = []
        if isinstance(all_items, dict) and all_items.get("ids"):
            ids_to_delete = all_items["ids"]
        elif isinstance(all_items, list):
            # In some LangChain versions, retrieving by 'where' returns Documents
            # We might not have IDs easily accessible if it returns just Documents without IDs.
            # Hopefully the underlying Chroma collection exposes them.
            try:
                raw_data = self.vectorstore._collection.get(where={"document_id": document_id})
                if raw_data and raw_data.get("ids"):
                    ids_to_delete = raw_data["ids"]
            except Exception as e:
                logger.error(f"Fallback delete extraction failed: {e}")

        if not ids_to_delete:
            return {"deleted": 0, "document_id": document_id}

        self.vectorstore.delete(ids=ids_to_delete)
        self._rebuild_bm25()
        
        logger.info("document_deleted", document_id=document_id, chunks_removed=len(ids_to_delete))
        return {"deleted": len(ids_to_delete), "document_id": document_id}

    def get_stats(self) -> dict:
        """Return store statistics."""
        return {
            "total_chunks": self.vectorstore._collection.count(),
            "total_documents": len(self.list_documents()),
        }

# Global singleton
vector_store = VectorStore()

"""
Knowledge Retrieval Tool — Searches the RAG vector store for relevant context.

This is the core tool that makes agents RAG-capable: they can query ingested
documents to answer questions grounded in real data.
"""

from backend.rag.vector_store import vector_store
from backend.tools.base import BaseTool, ToolResult


class KnowledgeRetrievalTool(BaseTool):
    """Search the knowledge base for relevant information."""

    name = "knowledge_retrieval"
    description = "Search ingested documents and knowledge base for information relevant to a query"

    async def execute(self, parameters: dict) -> ToolResult:
        query = parameters.get("query", "").strip()
        top_k = parameters.get("top_k", 5)

        if not query:
            return ToolResult(success=False, data={}, error="No query provided")

        try:
            results = vector_store.search(query, top_k=top_k)

            if not results:
                return ToolResult(
                    success=True,
                    data={
                        "query": query,
                        "matches": [],
                        "message": "No relevant documents found. Try ingesting documents first.",
                    },
                )

            # Build a combined context string for the agent
            context_parts = []
            for i, r in enumerate(results, 1):
                context_parts.append(f"[Source: {r['source']}] {r['text']}")

            return ToolResult(
                success=True,
                data={
                    "query": query,
                    "matches": len(results),
                    "context": "\n\n---\n\n".join(context_parts),
                    "sources": [{"source": r["source"], "relevance": r["relevance_score"]} for r in results],
                },
            )
        except Exception as e:
            return ToolResult(success=False, data={"query": query}, error=str(e))

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to find relevant knowledge",
                },
                "top_k": {
                    "type": "integer",
                    "description": "Number of results to return (default: 5)",
                    "default": 5,
                },
            },
            "required": ["query"],
        }

"""
Web Scraper Tool — Fetches and extracts clean text content from any URL.

Demonstrates:
- Async HTTP with httpx
- Robust content extraction with BeautifulSoup
- Timeout handling and error resilience
- Content truncation for LLM context windows
"""

import httpx
from bs4 import BeautifulSoup
from .base import BaseTool, ToolResult


class WebScraperTool(BaseTool):
    """Fetch and extract clean text content from a URL."""

    name = "web_scraper"
    description = "Scrape a web page and extract its main text content, title, and metadata"

    MAX_CONTENT_LENGTH = 3000  # Truncate to fit LLM context

    async def execute(self, parameters: dict) -> ToolResult:
        url = parameters.get("url", "").strip()

        if not url:
            return ToolResult(success=False, data={}, error="No URL provided")

        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        try:
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; AgenticBot/2.0)"
                },
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

            soup = BeautifulSoup(response.text, "lxml")

            # Remove non-content elements
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
                tag.decompose()

            # Extract metadata
            title = soup.title.string.strip() if soup.title and soup.title.string else "No title"
            meta_desc = ""
            meta_tag = soup.find("meta", attrs={"name": "description"})
            if meta_tag and meta_tag.get("content"):
                meta_desc = meta_tag["content"].strip()

            # Extract main content (prioritize article/main tags)
            main_content = soup.find("article") or soup.find("main") or soup.find("body")
            text = main_content.get_text(separator="\n", strip=True) if main_content else ""

            # Clean and truncate
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            clean_text = "\n".join(lines)
            truncated = len(clean_text) > self.MAX_CONTENT_LENGTH
            if truncated:
                clean_text = clean_text[: self.MAX_CONTENT_LENGTH] + "..."

            return ToolResult(
                success=True,
                data={
                    "url": str(response.url),
                    "title": title,
                    "meta_description": meta_desc,
                    "content": clean_text,
                    "content_length": len(clean_text),
                    "truncated": truncated,
                    "status_code": response.status_code,
                },
            )

        except httpx.TimeoutException:
            return ToolResult(success=False, data={"url": url}, error="Request timed out after 15 seconds")
        except httpx.HTTPStatusError as e:
            return ToolResult(success=False, data={"url": url}, error=f"HTTP {e.response.status_code}: {e.response.reason_phrase}")
        except Exception as e:
            return ToolResult(success=False, data={"url": url}, error=str(e))

    def get_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL of the web page to scrape",
                }
            },
            "required": ["url"],
        }

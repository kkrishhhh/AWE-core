"""
WebSocket Connection Manager with Human-in-the-Loop approval support.

Handles:
- Active WebSocket connections per task
- Cross-thread message broadcasting (LangGraph → FastAPI event loop)
- Plan approval requests and responses (HITL)
"""

import structlog
import asyncio
import queue
from fastapi import WebSocket
from typing import Dict, List

logger = structlog.get_logger()


class ConnectionManager:
    """Manages WebSocket connections and human-in-the-loop approval flows."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.message_queue: queue.Queue = queue.Queue()
        # HITL: approval queues per task — blocks agent until user responds
        self.approval_queues: Dict[str, asyncio.Queue] = {}

    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)
        logger.info("websocket_connected", task_id=task_id)

    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            if websocket in self.active_connections[task_id]:
                self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        logger.info("websocket_disconnected", task_id=task_id)

    async def _send(self, connection: WebSocket, message: dict, task_id: str):
        try:
            await connection.send_json(message)
        except Exception as e:
            logger.warning("websocket_broadcast_failed", task_id=task_id, error=str(e))
            self.disconnect(connection, task_id)

    def broadcast_sync(self, task_id: str, message: dict):
        """Thread-safe: push message for async delivery from any thread."""
        self.message_queue.put({"task_id": task_id, "message": message})

    async def broadcast(self, task_id: str, message: dict):
        """Async wrapper for same-thread sends."""
        self.broadcast_sync(task_id, message)

    # ── Human-in-the-Loop ─────────────────────────────────

    def request_approval_sync(self, task_id: str, plan: dict):
        """Thread-safe: send an approval request from the planner agent."""
        self.broadcast_sync(task_id, {
            "type": "approval_request",
            "plan": plan,
            "message": "Review the execution plan. Approve or reject to continue.",
        })

    async def wait_for_approval(self, task_id: str, timeout: float = 300) -> dict:
        """
        Block until the user approves or rejects the plan.
        Returns: {"approved": bool, "feedback": str}
        Auto-approves after timeout (default 5 minutes).
        """
        if task_id not in self.approval_queues:
            self.approval_queues[task_id] = asyncio.Queue()

        try:
            result = await asyncio.wait_for(
                self.approval_queues[task_id].get(),
                timeout=timeout,
            )
            logger.info("approval_received", task_id=task_id, approved=result.get("approved"))
            return result
        except asyncio.TimeoutError:
            logger.warning("approval_timeout", task_id=task_id)
            return {"approved": True, "feedback": "Auto-approved after timeout"}
        finally:
            self.approval_queues.pop(task_id, None)

    async def submit_approval(self, task_id: str, approved: bool, feedback: str = ""):
        """Called when the user sends an approval/rejection via WebSocket or API."""
        if task_id in self.approval_queues:
            await self.approval_queues[task_id].put({
                "approved": approved,
                "feedback": feedback,
            })
        else:
            logger.warning("approval_no_waiting_task", task_id=task_id)

    # ── Queue Processor ───────────────────────────────────

    async def process_queue(self):
        """Infinite loop on the main event loop — drains the cross-thread queue."""
        logger.info("websocket_queue_processor_started")
        while True:
            try:
                while not self.message_queue.empty():
                    data = self.message_queue.get_nowait()
                    task_id = data["task_id"]
                    message = data["message"]

                    if task_id in self.active_connections:
                        tasks = [
                            self._send(conn, message, task_id)
                            for conn in list(self.active_connections[task_id])
                        ]
                        if tasks:
                            await asyncio.gather(*tasks, return_exceptions=True)

                    self.message_queue.task_done()

            except Exception as e:
                logger.error("websocket_queue_processing_error", error=str(e))

            await asyncio.sleep(0.1)


# Global singleton
manager = ConnectionManager()

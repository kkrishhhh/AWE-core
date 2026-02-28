// ══════════════════════════════════════════════════════════
// WebSocket Manager — typed, with auto-reconnect
// ══════════════════════════════════════════════════════════

import type { WSMessage } from "@/types";

type MessageHandler = (msg: WSMessage) => void;

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private taskId: string;
    private handlers: Set<MessageHandler> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private _isConnected = false;

    constructor(taskId: string) {
        this.taskId = taskId;
    }

    get isConnected() {
        return this._isConnected;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket(`${WS_BASE}/api/ws/tasks/${this.taskId}`);

            this.ws.onopen = () => {
                this._isConnected = true;
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg: WSMessage = JSON.parse(event.data);
                    this.handlers.forEach((handler) => handler(msg));
                } catch {
                    // Skip non-JSON messages
                }
            };

            this.ws.onclose = () => {
                this._isConnected = false;
                this.attemptReconnect();
            };

            this.ws.onerror = () => {
                this._isConnected = false;
            };
        } catch {
            this.attemptReconnect();
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    onMessage(handler: MessageHandler) {
        this.handlers.add(handler);
        return () => {
            this.handlers.delete(handler);
        };
    }

    sendApproval(approved: boolean, feedback = "") {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
                JSON.stringify({
                    type: "approval_response",
                    approved,
                    feedback,
                })
            );
        }
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.ws?.close();
        this.ws = null;
        this._isConnected = false;
        this.handlers.clear();
    }
}

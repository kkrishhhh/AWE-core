"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { WebSocketManager } from "@/lib/websocket";
import { useAppStore } from "@/lib/store";
import type { WSMessage } from "@/types";

export function useWebSocket(taskId: string | null) {
    const wsRef = useRef<WebSocketManager | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<WSMessage[]>([]);
    const [streamingText, setStreamingText] = useState("");

    const {
        updateAgentStep,
        setIsStreaming,
        setPendingApproval,
        setActiveTask,
    } = useAppStore();

    const handleMessage = useCallback(
        (msg: WSMessage) => {
            if (msg.type !== "token") {
                setMessages((prev) => [...prev, msg]);
            }

            switch (msg.type) {
                case "token":
                    setStreamingText((prev) => prev + msg.token);
                    break;
                case "progress":
                    updateAgentStep(msg.agent, msg.status, msg.message);
                    break;
                case "approval_request":
                    setPendingApproval(taskId ? { ...msg, taskId } : null);
                    break;
                case "result":
                    setIsStreaming(false);
                    break;
                case "error":
                    setIsStreaming(false);
                    break;
                case "status":
                    if (msg.status === "running") {
                        setIsStreaming(true);
                    }
                    break;
            }
        },
        [taskId, updateAgentStep, setIsStreaming, setPendingApproval]
    );

    const sendApproval = useCallback(
        (approved: boolean, feedback = "") => {
            wsRef.current?.sendApproval(approved, feedback);
        },
        []
    );

    useEffect(() => {
        if (!taskId) return;

        setStreamingText(""); // Reset text on new task
        setMessages([]);

        // Initialize pipeline
        setActiveTask({
            id: taskId,
            status: "running",
            agentSteps: [],
        });
        setIsStreaming(true);

        const manager = new WebSocketManager(taskId);
        wsRef.current = manager;

        manager.onMessage(handleMessage);
        manager.connect();

        // Poll connection status
        const statusInterval = setInterval(() => {
            setIsConnected(manager.isConnected);
        }, 500);

        return () => {
            clearInterval(statusInterval);
            manager.disconnect();
            wsRef.current = null;
        };
    }, [taskId, handleMessage, setActiveTask, setIsStreaming]);

    return { messages, isConnected, sendApproval, streamingText };
}

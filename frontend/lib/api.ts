// ══════════════════════════════════════════════════════════
// Typed API client — all fetch helpers for backend endpoints
// ══════════════════════════════════════════════════════════

import type {
    ConversationDetail,
    ConversationListResponse,
    PaginatedTasks,
    TaskDetail,
    TaskLogsResponse,
    DocumentsResponse,
    IngestResult,
    ToolsResponse,
    AnalyticsResponse,
    HealthResponse,
} from "@/types";

const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

async function fetchAPI<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error: ${res.status}`);
    }
    return res.json();
}

// ── Conversations ──

export async function createConversation() {
    return fetchAPI<{ conversation_id: string; created_at: string }>(
        "/api/conversations",
        { method: "POST" }
    );
}

export async function getConversations(offset = 0, limit = 20) {
    return fetchAPI<ConversationListResponse>(
        `/api/conversations?offset=${offset}&limit=${limit}`
    );
}

export async function getConversation(id: string) {
    return fetchAPI<ConversationDetail>(`/api/conversations/${id}`);
}

export async function sendMessage(conversationId: string, message: string) {
    return fetchAPI<{
        task_id: string;
        conversation_id: string;
        status: string;
    }>(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
    });
}

// ── Tasks ──

export async function getTasks(offset = 0, limit = 20, status?: string) {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (status) params.set("status", status);
    return fetchAPI<PaginatedTasks>(`/api/tasks?${params}`);
}

export async function getTask(id: string) {
    return fetchAPI<TaskDetail>(`/api/tasks/${id}`);
}

export async function getTaskLogs(id: string) {
    return fetchAPI<TaskLogsResponse>(`/api/tasks/${id}/logs`);
}

export async function approveTask(
    taskId: string,
    approved: boolean,
    feedback = ""
) {
    return fetchAPI<{ task_id: string; approved: boolean }>(
        `/api/tasks/${taskId}/approve`,
        {
            method: "POST",
            body: JSON.stringify({ approved, feedback }),
        }
    );
}

// ── Documents (RAG) ──

export async function uploadDocument(
    text: string,
    source = "user_upload",
    metadata?: Record<string, unknown>
) {
    return fetchAPI<IngestResult>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ text, source, metadata }),
    });
}

export async function getDocuments() {
    return fetchAPI<DocumentsResponse>("/api/documents");
}

// ── Tools ──

export async function getTools() {
    return fetchAPI<ToolsResponse>("/api/tools");
}

// ── Analytics ──

export async function getAnalytics() {
    return fetchAPI<AnalyticsResponse>("/api/analytics");
}

// ── Health ──

export async function getHealth() {
    return fetchAPI<HealthResponse>("/health");
}

// ══════════════════════════════════════════════════════════
// All shared TypeScript types for the Agentic Workflow Engine
// ══════════════════════════════════════════════════════════

// ── Conversations ──

export interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
}

export interface Message {
    role: "user" | "assistant";
    content: string;
    task_id: string | null;
    timestamp: string;
}

export interface ConversationDetail {
    conversation_id: string;
    title: string | null;
    created_at: string;
    messages: Message[];
}

export interface ConversationListResponse {
    conversations: Conversation[];
    total: number;
    offset: number;
    limit: number;
}

// ── Tasks ──

export type TaskStatus =
    | "pending"
    | "running"
    | "awaiting_approval"
    | "completed"
    | "failed";

export interface TaskSummary {
    task_id: string;
    status: TaskStatus;
    user_input: string;
    created_at: string;
    completed_at: string | null;
}

export interface TaskDetail {
    task_id: string;
    status: TaskStatus;
    user_input: string;
    interpreted_task: Record<string, unknown> | null;
    mode: string | null;
    result: unknown;
    error: string | null;
    created_at: string;
    completed_at: string | null;
    total_cost: number;
}

export interface PaginatedTasks {
    tasks: TaskSummary[];
    total: number;
    offset: number;
    limit: number;
    has_more: boolean;
}

export interface ExecutionLog {
    agent_type: string | null;
    action: string | null;
    timestamp: string;
    tokens_used: number | null;
    cost: number | null;
}

export interface TaskLogsResponse {
    task_id: string;
    logs: ExecutionLog[];
}

// ── WebSocket Messages ──

export type WSMessageType =
    | "status"
    | "progress"
    | "approval_request"
    | "result"
    | "error"
    | "token";

export interface WSProgress {
    type: "progress";
    agent: string;
    status: "running" | "completed" | "rejected" | "approved";
    message: string;
}

export interface WSApprovalRequest {
    type: "approval_request";
    plan: {
        steps: Array<{
            step_number: number;
            description: string;
            tool_needed: string;
            expected_output: string;
        }>;
        estimated_complexity: string;
    };
    message: string;
}

export interface WSResult {
    type: "result";
    status: "completed";
    result: unknown;
    interpreted_task: Record<string, unknown> | null;
}

export interface WSError {
    type: "error";
    status: "failed";
    message: string;
}

export interface WSStatus {
    type: "status";
    status: string;
    message: string;
}

export interface WSToken {
    type: "token";
    token: string;
}

export type WSMessage =
    | WSProgress
    | WSApprovalRequest
    | WSResult
    | WSError
    | WSStatus
    | WSToken;

// ── Documents (RAG) ──

export interface DocumentInfo {
    document_id: string;
    source: string;
    chunks: number;
}

export interface DocumentsResponse {
    documents: DocumentInfo[];
    total_documents: number;
    total_chunks: number;
}

export interface IngestResult {
    document_id: string;
    source: string;
    chunks: number;
    total_characters: number;
}

// ── Tools ──

export interface ToolInfo {
    name: string;
    description: string;
    schema: Record<string, unknown>;
}

export interface ToolsResponse {
    tools: ToolInfo[];
    count: number;
}

// ── Analytics ──

export interface AgentMetric {
    agent_type: string;
    total_calls: number;
    avg_latency_ms: number;
    total_tokens: number;
    success_rate: number;
}

export interface AnalyticsResponse {
    overview: {
        total_tasks: number;
        completed: number;
        failed: number;
        success_rate: number;
    };
    agents: AgentMetric[];
}

// ── Health ──

export interface HealthResponse {
    status: string;
    environment: string;
    version: string;
    uptime_seconds: number;
    database: string;
    queue_depth: number;
    tools_registered: number;
}

// ── Agent Pipeline ──

export type AgentName =
    | "intent_interpreter"
    | "router"
    | "planner"
    | "executor"
    | "reflector";

export type AgentStepStatus = "pending" | "running" | "completed" | "failed";

export interface AgentStep {
    agent: AgentName;
    status: AgentStepStatus;
    message: string;
}

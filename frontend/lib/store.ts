// ══════════════════════════════════════════════════════════
//  Zustand Store — global state for the application
// ══════════════════════════════════════════════════════════

import { create } from "zustand";
import type {
    Conversation,
    AgentStep,
    WSApprovalRequest,
    AgentName,
} from "@/types";

interface ActiveTask {
    id: string;
    status: string;
    agentSteps: AgentStep[];
}

interface AppStore {
    // Active task tracking
    activeTask: ActiveTask | null;
    setActiveTask: (task: ActiveTask | null) => void;
    updateAgentStep: (agent: string, status: string, message: string) => void;

    // Conversations
    currentConversationId: string | null;
    setCurrentConversationId: (id: string | null) => void;
    conversations: Conversation[];
    setConversations: (convs: Conversation[]) => void;
    addConversation: (conv: Conversation) => void;

    // Streaming state
    isStreaming: boolean;
    setIsStreaming: (val: boolean) => void;

    // HITL Approval
    pendingApproval: (WSApprovalRequest & { taskId: string }) | null;
    setPendingApproval: (
        approval: (WSApprovalRequest & { taskId: string }) | null
    ) => void;
}

const AGENT_ORDER: AgentName[] = [
    "intent_interpreter",
    "router",
    "planner",
    "executor",
    "reflector",
];

export const useAppStore = create<AppStore>((set) => ({
    // ── Active Task ──
    activeTask: null,
    setActiveTask: (task) => set({ activeTask: task }),
    updateAgentStep: (agent, status, message) =>
        set((state) => {
            if (!state.activeTask) return state;

            const steps = [...state.activeTask.agentSteps];
            const existing = steps.findIndex((s) => s.agent === agent);

            if (existing >= 0) {
                steps[existing] = {
                    ...steps[existing],
                    status: status as AgentStep["status"],
                    message,
                };
            } else {
                steps.push({
                    agent: agent as AgentName,
                    status: status as AgentStep["status"],
                    message,
                });
            }

            // Ensure all pipeline agents exist in order
            const orderedSteps = AGENT_ORDER.map(
                (a) =>
                    steps.find((s) => s.agent === a) || {
                        agent: a,
                        status: "pending" as const,
                        message: "",
                    }
            );

            return {
                activeTask: { ...state.activeTask, agentSteps: orderedSteps },
            };
        }),

    // ── Conversations ──
    currentConversationId: null,
    setCurrentConversationId: (id) => set({ currentConversationId: id }),
    conversations: [],
    setConversations: (convs) => set({ conversations: convs }),
    addConversation: (conv) =>
        set((state) => ({
            conversations: [conv, ...state.conversations],
        })),

    // ── Streaming ──
    isStreaming: false,
    setIsStreaming: (val) => set({ isStreaming: val }),

    // ── Approval ──
    pendingApproval: null,
    setPendingApproval: (approval) => set({ pendingApproval: approval }),
}));

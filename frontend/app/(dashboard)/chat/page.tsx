"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Send,
    Loader2,
    MessageSquare,
    Wifi,
    WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
    createConversation,
    getConversations,
    getConversation,
    sendMessage,
    approveTask,
} from "@/lib/api";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { AgentPipeline } from "@/components/chat/AgentPipeline";
import { ApprovalDialog } from "@/components/chat/ApprovalDialog";
import type { Message } from "@/types";

const PLACEHOLDERS = [
    "What's the weather in Mumbai?",
    "Summarize this article for me...",
    "Calculate 2^10 * 3.14",
    "Analyze the sentiment of this text...",
    "Search my documents for...",
];

export default function ChatPage() {
    const queryClient = useQueryClient();
    const [input, setInput] = useState("");
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        currentConversationId,
        setCurrentConversationId,
        activeTask,
        isStreaming,
        pendingApproval,
        setPendingApproval,
    } = useAppStore();

    // Fetch conversations list
    const { data: conversations } = useQuery({
        queryKey: ["conversations"],
        queryFn: () => getConversations(),
    });

    // Fetch current conversation messages
    const { data: conversationData } = useQuery({
        queryKey: ["conversation", currentConversationId],
        queryFn: () => getConversation(currentConversationId!),
        enabled: !!currentConversationId,
    });

    // WebSocket connection
    const { isConnected, streamingText } = useWebSocket(activeTaskId);

    // Placeholder cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIdx((p) => (p + 1) % PLACEHOLDERS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversationData, localMessages, activeTask]);

    // Merge server + local messages
    const messages: Message[] = [
        ...(conversationData?.messages || []),
        ...localMessages,
    ];

    // Create new conversation
    const handleNewChat = useCallback(async () => {
        try {
            const res = await createConversation();
            setCurrentConversationId(res.conversation_id);
            setLocalMessages([]);
            setActiveTaskId(null);
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        } catch (err) {
            console.error("Failed to create conversation:", err);
        }
    }, [setCurrentConversationId, queryClient]);

    // Send message
    const handleSend = useCallback(async () => {
        if (!input.trim() || isStreaming) return;

        let convId = currentConversationId;

        // Auto-create conversation if none selected
        if (!convId) {
            try {
                const res = await createConversation();
                convId = res.conversation_id;
                setCurrentConversationId(convId);
                queryClient.invalidateQueries({ queryKey: ["conversations"] });
            } catch {
                return;
            }
        }

        // Add user message locally
        const userMessage: Message = {
            role: "user",
            content: input.trim(),
            task_id: null,
            timestamp: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, userMessage]);
        setInput("");

        // Send to backend
        try {
            // Start streaming immediately BEFORE the API call
            useAppStore.getState().setIsStreaming(true);
            const res = await sendMessage(convId, userMessage.content);
            setActiveTaskId(res.task_id);

            // After task completes, refetch conversation for updated messages
            const checkResult = async () => {
                await new Promise((r) => setTimeout(r, 2000));
                for (let i = 0; i < 30; i++) {
                    await new Promise((r) => setTimeout(r, 2000));
                    const data = await getConversation(convId!);
                    const hasAssistantResponse = data.messages.some(
                        (m) => m.role === "assistant" && m.timestamp > userMessage.timestamp
                    );
                    if (hasAssistantResponse) {
                        setLocalMessages([]);
                        queryClient.invalidateQueries({
                            queryKey: ["conversation", convId],
                        });
                        queryClient.invalidateQueries({ queryKey: ["conversations"] });
                        setActiveTaskId(null);
                        useAppStore.getState().setIsStreaming(false);
                        break;
                    }
                }
                // Timeout fallback — stop streaming after max attempts
                useAppStore.getState().setIsStreaming(false);
            };
            checkResult();
        } catch (err) {
            console.error("Failed to send message:", err);
            setLocalMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                    task_id: null,
                    timestamp: new Date().toISOString(),
                },
            ]);
            useAppStore.getState().setIsStreaming(false);
        }
    }, [input, currentConversationId, isStreaming, setCurrentConversationId, queryClient]);


    // Handle approval
    const handleApproval = useCallback(
        async (approved: boolean, feedback: string) => {
            if (!pendingApproval) return;
            try {
                await approveTask(pendingApproval.taskId, approved, feedback);
                setPendingApproval(null);
            } catch (err) {
                console.error("Approval failed:", err);
            }
        },
        [pendingApproval, setPendingApproval]
    );


    return (
        <div className="flex h-screen">
            {/* Conversation List */}
            <div className="hidden md:flex flex-col w-[280px] border-r border-border bg-muted/20">
                <div className="p-4 border-b border-border">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {conversations?.conversations?.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => {
                                setCurrentConversationId(conv.id);
                                setLocalMessages([]);
                                setActiveTaskId(null);
                            }}
                            className={cn(
                                "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted flex items-center gap-3 relative",
                                currentConversationId === conv.id && "bg-muted"
                            )}
                        >
                            {currentConversationId === conv.id && (
                                <motion.div
                                    layoutId="conv-active"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r"
                                />
                            )}
                            <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="truncate">
                                    {conv.title || "New conversation"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(conv.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </button>
                    ))}

                    {(!conversations?.conversations ||
                        conversations.conversations.length === 0) && (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No conversations yet.
                                <br />
                                Start one above!
                            </div>
                        )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm font-semibold">
                            {conversationData?.title || "Chat"}
                        </h1>
                        {currentConversationId && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {currentConversationId.slice(0, 8)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {activeTaskId &&
                            (isConnected ? (
                                <span className="flex items-center gap-1 text-success">
                                    <Wifi className="w-3 h-3" /> Connected
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-warning">
                                    <WifiOff className="w-3 h-3" /> Connecting...
                                </span>
                            ))}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {messages.length === 0 && !activeTask && (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-xl w-full">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">
                                    What can I help you with?
                                </h2>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Click an example below or type your own message
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                                    {[
                                        { emoji: "🔢", label: "Calculate", prompt: "Calculate 345 * 87" },
                                        { emoji: "🌤️", label: "Weather", prompt: "What's the weather in Mumbai?" },
                                        { emoji: "📝", label: "Summarize", prompt: "Summarize: Artificial intelligence is transforming how we live and work, from voice assistants to autonomous vehicles. It enables machines to learn from data, recognize patterns, and make decisions with minimal human intervention." },
                                        { emoji: "🎭", label: "Sentiment", prompt: "Analyze sentiment: This product is absolutely amazing, I love everything about it!" },
                                        { emoji: "💻", label: "Run Code", prompt: "Execute: [x**2 for x in range(1, 11)]" },
                                        { emoji: "📊", label: "Analyze Data", prompt: "Analyze this data: 23, 45, 67, 12, 89, 34, 56, 78, 90, 11" },
                                        { emoji: "🌐", label: "Web Scraper", prompt: "Scrape https://example.com and show the main content" },
                                        { emoji: "🔄", label: "JSON Transform", prompt: 'Transform this JSON: {"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}' },
                                        { emoji: "📚", label: "Knowledge Base", prompt: "Search my documents for any uploaded information" },
                                    ].map((ex) => (
                                        <motion.button
                                            key={ex.label}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setInput(ex.prompt);
                                                setTimeout(() => {
                                                    // Trigger send
                                                    const textarea = textareaRef.current;
                                                    if (textarea) textarea.focus();
                                                }, 100);
                                            }}
                                            className="glassmorphism rounded-xl p-3 text-sm hover:border-primary/30 transition-all group cursor-pointer text-left"
                                        >
                                            <span className="text-lg mr-2">{ex.emoji}</span>
                                            <span className="font-medium text-foreground">{ex.label}</span>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 group-hover:text-foreground/70 transition-colors">
                                                {ex.prompt}
                                            </p>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <MessageBubble key={`${msg.timestamp}-${i}`} message={msg} />
                    ))}

                    {streamingText && (
                        <MessageBubble
                            message={{
                                role: "assistant",
                                content: streamingText + " ▍",
                                task_id: null,
                                timestamp: new Date().toISOString()
                            }}
                        />
                    )}

                    {/* Streaming indicator + Agent Pipeline (only shown WHILE agents are working) */}
                    <AnimatePresence>
                        {isStreaming && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11 mb-2">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Agents are working...
                                </div>

                                {activeTask && activeTask.agentSteps.length > 0 && (
                                    <AgentPipeline steps={activeTask.agentSteps} />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-4 border-t border-border">
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={PLACEHOLDERS[placeholderIdx]}
                            disabled={isStreaming}
                            rows={1}
                            className={cn(
                                "w-full resize-none bg-muted/50 border border-border rounded-xl pl-4 pr-12 py-3 text-sm",
                                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                                "placeholder:text-muted-foreground/60 transition-all",
                                isStreaming && "opacity-60 cursor-not-allowed"
                            )}
                            style={{
                                minHeight: "44px",
                                maxHeight: "120px",
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "44px";
                                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming}
                            className={cn(
                                "absolute right-2 top-[6px] p-2 rounded-lg transition-all flex items-center justify-center",
                                input.trim() && !isStreaming
                                    ? "bg-primary text-white hover:shadow-[0_0_15px_var(--primary-glow)]"
                                    : "text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            {isStreaming ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        Press Enter to send · Shift + Enter for new line
                    </p>
                </div>
            </div>

            {/* HITL Approval Modal */}
            {pendingApproval && (
                <ApprovalDialog approval={pendingApproval} onRespond={handleApproval} />
            )}
        </div>
    );
}

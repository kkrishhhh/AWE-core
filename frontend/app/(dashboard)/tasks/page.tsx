"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    ListTodo,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    ChevronRight,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTasks, getTask, getTaskLogs } from "@/lib/api";


const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    completed: { icon: CheckCircle2, color: "text-success", label: "Completed" },
    failed: { icon: XCircle, color: "text-error", label: "Failed" },
    running: { icon: Loader2, color: "text-primary", label: "Running" },
    pending: { icon: Clock, color: "text-warning", label: "Pending" },
    awaiting_approval: { icon: Clock, color: "text-secondary", label: "Awaiting Approval" },
};

export default function TasksPage() {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const { data: tasksData, isLoading } = useQuery({
        queryKey: ["tasks"],
        queryFn: () => getTasks(0, 50),
    });

    const { data: taskDetail } = useQuery({
        queryKey: ["task", selectedTaskId],
        queryFn: () => getTask(selectedTaskId!),
        enabled: !!selectedTaskId,
    });

    const { data: taskLogs } = useQuery({
        queryKey: ["taskLogs", selectedTaskId],
        queryFn: () => getTaskLogs(selectedTaskId!),
        enabled: !!selectedTaskId,
    });

    return (
        <div className="flex h-screen">
            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <ListTodo className="w-6 h-6 text-primary" />
                                Tasks
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Browse and inspect all task executions.
                            </p>
                        </div>
                        {tasksData && (
                            <span className="text-sm text-muted-foreground">
                                {tasksData.total} total
                            </span>
                        )}
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    )}

                    <div className="space-y-2">
                        {tasksData?.tasks?.map((task) => {
                            const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                            const StatusIcon = cfg.icon;

                            return (
                                <motion.button
                                    key={task.task_id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => setSelectedTaskId(task.task_id)}
                                    className={cn(
                                        "w-full text-left glassmorphism rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all group",
                                        selectedTaskId === task.task_id && "border-primary/30"
                                    )}
                                >
                                    <StatusIcon
                                        className={cn(
                                            "w-5 h-5 flex-shrink-0",
                                            cfg.color,
                                            task.status === "running" && "animate-spin"
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate font-medium">
                                            {task.user_input.length > 60 ? task.user_input.slice(0, 60) + "…" : task.user_input}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn("text-xs font-medium", cfg.color)}>
                                                {cfg.label}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(task.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Task Detail Drawer */}
            <AnimatePresence>
                {selectedTaskId && taskDetail && (
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: "spring", damping: 25 }}
                        className="w-[400px] border-l border-border bg-background overflow-y-auto flex-shrink-0"
                    >
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold">Task Detail</h2>
                                <button
                                    onClick={() => setSelectedTaskId(null)}
                                    className="p-1 rounded hover:bg-muted"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-3 mb-6">
                                <div>
                                    <span className="text-xs text-muted-foreground">ID</span>
                                    <p className="text-sm font-mono">{taskDetail.task_id.slice(0, 12)}...</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">Status</span>
                                    <p className={cn("text-sm font-medium", STATUS_CONFIG[taskDetail.status]?.color)}>
                                        {STATUS_CONFIG[taskDetail.status]?.label}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">Mode</span>
                                    <p className="text-sm">{taskDetail.mode || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground">Input</span>
                                    <p className="text-sm mt-1">{taskDetail.user_input}</p>
                                </div>
                                {taskDetail.interpreted_task && (
                                    <div>
                                        <span className="text-xs text-muted-foreground">Interpreted Goal</span>
                                        <p className="text-sm mt-1 text-primary">
                                            {(taskDetail.interpreted_task as Record<string, string>)?.primary_goal || "—"}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Result */}
                            {!!taskDetail.result && (
                                <div className="mb-6">
                                    <span className="text-xs text-muted-foreground">Result</span>
                                    <div className="mt-1 p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                                        {(() => {
                                            const results = Array.isArray(taskDetail.result) ? taskDetail.result : [taskDetail.result];
                                            return results.map((r: Record<string, unknown>, idx: number) => {
                                                if (typeof r === "string") return <p key={idx}>{r}</p>;
                                                if (typeof r !== "object" || !r) return <p key={idx}>{String(r)}</p>;

                                                // If it has a natural language response, show that
                                                if ("response" in r) return <p key={idx}>{String(r.response)}</p>;

                                                // Filter out internal IDs and metadata
                                                const display = Object.entries(r as Record<string, unknown>)
                                                    .filter(([k]) => !['task_id', 'id', 'document_id', 'chunk_index', 'tool'].includes(k))
                                                    .map(([k, v]) => ({ key: k, value: v }));

                                                if (display.length === 0) return null;

                                                // Special case: error
                                                if ("error" in r) return (
                                                    <p key={idx} className="text-error">⚠ {String(r.error)}</p>
                                                );

                                                // Show clean key-value pairs
                                                return (
                                                    <div key={idx} className="space-y-1">
                                                        {display.map(({ key, value }) => (
                                                            <div key={key} className="flex gap-2">
                                                                <span className="text-muted-foreground capitalize min-w-[80px]">{key.replace(/_/g, ' ')}:</span>
                                                                <span className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {taskDetail.error && (
                                <div className="mb-6">
                                    <span className="text-xs text-muted-foreground">Error</span>
                                    <p className="mt-1 text-sm text-error bg-error/10 rounded-lg p-3">
                                        {taskDetail.error}
                                    </p>
                                </div>
                            )}

                            {/* Execution Logs */}
                            {taskLogs && taskLogs.logs.length > 0 && (
                                <div>
                                    <span className="text-xs text-muted-foreground mb-3 block">
                                        Execution Logs
                                    </span>
                                    <div className="space-y-2">
                                        {taskLogs.logs.map((log, i) => (
                                            <div
                                                key={i}
                                                className="flex gap-3 text-xs p-2 bg-muted/30 rounded-lg"
                                            >
                                                <div className="w-1 rounded bg-primary flex-shrink-0" />
                                                <div>
                                                    <span className="font-medium">
                                                        {log.agent_type || "system"}
                                                    </span>
                                                    <span className="text-muted-foreground ml-2">
                                                        {log.action}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

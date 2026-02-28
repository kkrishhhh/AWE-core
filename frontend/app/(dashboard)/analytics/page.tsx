"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    BarChart3,
    ListTodo,
    CheckCircle2,
    TrendingUp,
    Bot,
    Activity,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAnalytics, getHealth } from "@/lib/api";

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
    return (
        <span className="tabular-nums">
            {value.toLocaleString()}{suffix}
        </span>
    );
}

export default function AnalyticsPage() {
    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ["analytics"],
        queryFn: getAnalytics,
    });

    const { data: health } = useQuery({
        queryKey: ["health"],
        queryFn: getHealth,
        refetchInterval: 30000,
    });

    const overview = analytics?.overview;
    const agents = analytics?.agents || [];

    const METRICS = [
        {
            label: "Total Tasks",
            value: overview?.total_tasks || 0,
            icon: ListTodo,
            color: "text-primary",
        },
        {
            label: "Completed",
            value: overview?.completed || 0,
            icon: CheckCircle2,
            color: "text-success",
        },
        {
            label: "Success Rate",
            value: Math.round((overview?.success_rate || 0) * 100),
            suffix: "%",
            icon: TrendingUp,
            color: "text-accent",
        },
        {
            label: "Active Agents",
            value: agents.length,
            icon: Bot,
            color: "text-secondary",
        },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    Analytics
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Agent evaluation dashboard — performance metrics and system health.
                </p>
            </div>

            {analyticsLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            )}

            {!analyticsLoading && (
                <>
                    {/* Health Status */}
                    {health && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glassmorphism rounded-2xl p-4 mb-6 flex items-center gap-4"
                        >
                            <div
                                className={cn(
                                    "w-3 h-3 rounded-full",
                                    health.status === "healthy"
                                        ? "bg-success animate-pulse-ring"
                                        : "bg-error"
                                )}
                            />
                            <div className="flex items-center gap-6 text-sm">
                                <span>
                                    <span className="text-muted-foreground">Status:</span>{" "}
                                    <span className="font-medium">{health.status}</span>
                                </span>
                                <span>
                                    <span className="text-muted-foreground">Version:</span>{" "}
                                    <span className="font-medium">{health.version}</span>
                                </span>
                                <span>
                                    <span className="text-muted-foreground">Tools:</span>{" "}
                                    <span className="font-medium">{health.tools_registered}</span>
                                </span>
                                <span>
                                    <span className="text-muted-foreground">Uptime:</span>{" "}
                                    <span className="font-medium">
                                        {Math.round(health.uptime_seconds / 60)}m
                                    </span>
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* Overview Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {METRICS.map((metric, i) => (
                            <motion.div
                                key={metric.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glassmorphism rounded-2xl p-5"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                        {metric.label}
                                    </span>
                                    <metric.icon className={cn("w-4 h-4", metric.color)} />
                                </div>
                                <div className="text-3xl font-bold">
                                    <CountUp value={metric.value} suffix={metric.suffix} />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Agent Performance */}
                    {agents.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Agent Performance
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {agents.map((agent, i) => (
                                    <motion.div
                                        key={agent.agent_type}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + i * 0.1 }}
                                        whileHover={{ y: -2 }}
                                        className="glassmorphism rounded-2xl p-5"
                                    >
                                        <h3 className="text-sm font-semibold capitalize mb-3">
                                            {agent.agent_type.replace(/_/g, " ")}
                                        </h3>
                                        <div className="space-y-3">
                                            {/* Latency bar */}
                                            <div>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">
                                                        Avg Latency
                                                    </span>
                                                    <span className="font-medium">
                                                        {Math.round(agent.avg_latency_ms)}ms
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{
                                                            width: `${Math.min(
                                                                (agent.avg_latency_ms / 5000) * 100,
                                                                100
                                                            )}%`,
                                                        }}
                                                        transition={{ duration: 1, delay: 0.5 }}
                                                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                                                    />
                                                </div>
                                            </div>

                                            {/* Success rate */}
                                            <div>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">
                                                        Success Rate
                                                    </span>
                                                    <span className="font-medium">
                                                        {Math.round(agent.success_rate * 100)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{
                                                            width: `${agent.success_rate * 100}%`,
                                                        }}
                                                        transition={{ duration: 1, delay: 0.7 }}
                                                        className="h-full rounded-full bg-success"
                                                    />
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                                <span>{agent.total_calls} calls</span>
                                                <span>{agent.total_tokens.toLocaleString()} tokens</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {agents.length === 0 && (
                        <div className="text-center py-12 text-sm text-muted-foreground glassmorphism rounded-2xl">
                            No agent metrics yet. Run some tasks to generate data.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

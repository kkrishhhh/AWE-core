"use client";

import { useState, useEffect, useRef } from "react";
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
    Zap,
    Clock,
    Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAnalytics, getHealth, getTasks } from "@/lib/api";

function AnimatedNumber({ value, suffix = "", duration = 1200 }: { value: number; suffix?: string; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (value === 0) { setDisplayValue(0); return; }
        const startTime = performance.now();
        const startVal = 0;

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setDisplayValue(Math.round(startVal + (value - startVal) * eased));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [value, duration]);

    return (
        <span className="tabular-nums">
            {displayValue.toLocaleString()}{suffix}
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

    const { data: recentTasks } = useQuery({
        queryKey: ["tasks", "recent"],
        queryFn: () => getTasks(0, 5),
    });

    const overview = analytics?.overview;
    const agents = analytics?.agents || [];

    const METRICS = [
        {
            label: "Total Tasks",
            value: overview?.total_tasks || 0,
            icon: ListTodo,
            color: "text-primary",
            bgColor: "bg-primary/10",
            gradient: "from-blue-500/20 to-blue-600/5",
        },
        {
            label: "Completed",
            value: overview?.completed || 0,
            icon: CheckCircle2,
            color: "text-success",
            bgColor: "bg-success/10",
            gradient: "from-emerald-500/20 to-emerald-600/5",
        },
        {
            label: "Success Rate",
            value: Math.round((overview?.success_rate || 0) * 100),
            suffix: "%",
            icon: TrendingUp,
            color: "text-accent",
            bgColor: "bg-accent/10",
            gradient: "from-cyan-500/20 to-cyan-600/5",
        },
        {
            label: "Active Agents",
            value: 5,
            icon: Bot,
            color: "text-secondary",
            bgColor: "bg-secondary/10",
            gradient: "from-violet-500/20 to-violet-600/5",
        },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    Analytics Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Real-time performance metrics for your AI agent pipeline.
                </p>
            </div>

            {analyticsLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            )}

            {!analyticsLoading && (
                <>
                    {/* Health Status Bar */}
                    {health && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glassmorphism rounded-2xl p-4 mb-6"
                        >
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={cn(
                                            "w-2.5 h-2.5 rounded-full",
                                            health.status === "healthy"
                                                ? "bg-success animate-pulse-ring"
                                                : "bg-error"
                                        )}
                                    />
                                    <span className="text-sm font-medium">
                                        {health.status === "healthy" ? "System Healthy" : "System Down"}
                                    </span>
                                </div>
                                <div className="h-4 w-px bg-border" />
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        v{health.version}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Wrench className="w-3 h-3" />
                                        {health.tools_registered} tools
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {Math.round(health.uptime_seconds / 60)}m uptime
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {METRICS.map((metric, i) => (
                            <motion.div
                                key={metric.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -3, scale: 1.02 }}
                                className="glassmorphism rounded-2xl p-5 relative overflow-hidden group"
                            >
                                {/* Subtle gradient overlay */}
                                <div className={cn(
                                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                    metric.gradient
                                )} />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                            {metric.label}
                                        </span>
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", metric.bgColor)}>
                                            <metric.icon className={cn("w-4 h-4", metric.color)} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold">
                                        <AnimatedNumber value={metric.value} suffix={metric.suffix} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Agent Performance — 2 columns */}
                        <div className="lg:col-span-2">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Agent Performance
                            </h2>
                            {agents.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {agents.map((agent: any, i: number) => (
                                        <motion.div
                                            key={agent.agent_type}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            whileHover={{ y: -2 }}
                                            className="glassmorphism rounded-2xl p-5"
                                        >
                                            <h3 className="text-sm font-semibold capitalize mb-3 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                {agent.agent_type.replace(/_/g, " ")}
                                            </h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-muted-foreground">Avg Latency</span>
                                                        <span className="font-medium">{Math.round(agent.avg_latency_ms)}ms</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min((agent.avg_latency_ms / 5000) * 100, 100)}%` }}
                                                            transition={{ duration: 1, delay: 0.5 }}
                                                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-muted-foreground">Success Rate</span>
                                                        <span className="font-medium">{Math.round(agent.success_rate * 100)}%</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${agent.success_rate * 100}%` }}
                                                            transition={{ duration: 1, delay: 0.7 }}
                                                            className="h-full rounded-full bg-success"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                                    <span>{agent.total_calls} calls</span>
                                                    <span>{agent.total_tokens.toLocaleString()} tokens</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glassmorphism rounded-2xl p-8 text-center">
                                    <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No agent metrics yet. Send some messages in Chat to generate data.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Recent Activity — 1 column */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Recent Activity
                            </h2>
                            <div className="glassmorphism rounded-2xl p-4">
                                {recentTasks?.tasks && recentTasks.tasks.length > 0 ? (
                                    <div className="space-y-3">
                                        {recentTasks.tasks.map((task: any, i: number) => (
                                            <motion.div
                                                key={task.task_id}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.5 + i * 0.1 }}
                                                className="flex items-start gap-3 text-xs"
                                            >
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                                    task.status === "completed" ? "bg-success" :
                                                        task.status === "failed" ? "bg-error" : "bg-warning"
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-foreground truncate font-medium">
                                                        {task.user_input?.slice(0, 50) || "Task"}
                                                    </p>
                                                    <p className="text-muted-foreground mt-0.5">
                                                        {new Date(task.created_at).toLocaleString(undefined, {
                                                            hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-8">
                                        No recent activity
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

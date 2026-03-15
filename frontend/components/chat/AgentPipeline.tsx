"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStep, AgentName } from "@/types";

const AGENTS: { name: AgentName; label: string; emoji: string; color: string; description: string }[] = [
    { name: "intent_interpreter", label: "Interpreter", emoji: "🧠", color: "#3B8EFF", description: "Understanding your request" },
    { name: "router", label: "Router", emoji: "🔀", color: "#06B6D4", description: "Selecting the best path" },
    { name: "planner", label: "Planner", emoji: "📋", color: "#8B5CF6", description: "Creating execution plan" },
    { name: "executor", label: "Executor", emoji: "⚡", color: "#10B981", description: "Running tools & actions" },
    { name: "reflector", label: "Reflector", emoji: "🔍", color: "#F59E0B", description: "Evaluating the result" },
];

function ElapsedTimer() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setElapsed((e) => e + 0.1), 100);
        return () => clearInterval(interval);
    }, []);
    return (
        <span className="text-[8px] text-foreground/50 font-mono tabular-nums">
            {elapsed.toFixed(1)}s
        </span>
    );
}

function ProgressBar({ color, running }: { color: string; running: boolean }) {
    if (!running) return null;
    return (
        <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
            <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: "0%" }}
                animate={{ width: ["0%", "60%", "30%", "80%", "50%", "90%"] }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}

interface Props {
    steps: AgentStep[];
}

export function AgentPipeline({ steps }: Props) {
    return (
        <div className="glassmorphism rounded-2xl p-5 mb-4 overflow-hidden">
            {/* Header with live indicator */}
            <div className="flex items-center gap-2 mb-3">
                <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Agent Pipeline — Live
                </span>
            </div>

            <div className="flex items-stretch gap-2 sm:gap-3 overflow-x-auto pb-2">
                {AGENTS.map((agent, i) => {
                    const step = steps.find((s) => s.agent === agent.name);
                    const status = step?.status || "pending";

                    return (
                        <div key={agent.name} className="flex items-center flex-shrink-0">
                            {/* Agent Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
                                className={cn(
                                    "relative rounded-xl px-4 py-4 min-w-[130px] text-center transition-all duration-500",
                                    status === "completed" && "bg-gradient-to-b from-white/8 to-transparent",
                                    status === "running" && "bg-gradient-to-b from-white/12 to-transparent",
                                    status === "pending" && "bg-white/[0.02]"
                                )}
                                style={{
                                    boxShadow:
                                        status === "completed"
                                            ? `0 0 25px ${agent.color}25, inset 0 1px 0 rgba(255,255,255,0.06)`
                                            : status === "running"
                                                ? `0 0 40px ${agent.color}35, 0 0 80px ${agent.color}10, inset 0 1px 0 rgba(255,255,255,0.1)`
                                                : "none",
                                    border:
                                        status === "completed"
                                            ? `1px solid ${agent.color}50`
                                            : status === "running"
                                                ? `2px solid ${agent.color}70`
                                                : "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                {/* Pulsing glow ring for running */}
                                {status === "running" && (
                                    <motion.div
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            border: `2px solid ${agent.color}`,
                                        }}
                                        animate={{
                                            opacity: [0.1, 0.6, 0.1],
                                            scale: [1, 1.04, 1],
                                        }}
                                        transition={{
                                            duration: 1.2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    />
                                )}

                                {/* Status indicator */}
                                <div className="flex items-center justify-center mb-2">
                                    {status === "completed" ? (
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                            className="w-9 h-9 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${agent.color}25` }}
                                        >
                                            <Check className="w-5 h-5" style={{ color: agent.color }} />
                                        </motion.div>
                                    ) : status === "running" ? (
                                        <motion.div
                                            className="w-9 h-9 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: `${agent.color}20` }}
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        >
                                            <Loader2
                                                className="w-5 h-5 animate-spin"
                                                style={{ color: agent.color }}
                                            />
                                        </motion.div>
                                    ) : (
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg opacity-30">
                                            {agent.emoji}
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        "text-xs font-bold block tracking-wide",
                                        status === "completed" && "text-foreground",
                                        status === "running" && "text-foreground",
                                        status === "pending" && "text-muted-foreground/40"
                                    )}
                                >
                                    {agent.label}
                                </span>

                                {/* Description / Status message */}
                                <span
                                    className={cn(
                                        "text-[9px] block mt-1 max-w-[110px] truncate mx-auto leading-tight",
                                        status === "running" && "text-foreground/70",
                                        status === "completed" && "text-muted-foreground",
                                        status === "pending" && "text-muted-foreground/25"
                                    )}
                                >
                                    {step?.message || agent.description}
                                </span>

                                {/* Elapsed timer for running agent */}
                                {status === "running" && (
                                    <div className="mt-1">
                                        <ElapsedTimer />
                                    </div>
                                )}

                                {/* Progress bar for running agent */}
                                <ProgressBar color={agent.color} running={status === "running"} />
                            </motion.div>

                            {/* Connector */}
                            {i < AGENTS.length - 1 && (
                                <div className="flex-shrink-0 mx-1">
                                    <motion.div
                                        className="h-[2px] w-5 sm:w-8 rounded-full"
                                        initial={{ scaleX: 0 }}
                                        animate={{
                                            scaleX: 1,
                                            backgroundColor:
                                                status === "completed"
                                                    ? agent.color
                                                    : status === "running"
                                                        ? `${agent.color}80`
                                                        : "rgba(255,255,255,0.06)",
                                        }}
                                        transition={{ delay: i * 0.12 + 0.15, duration: 0.5 }}
                                        style={{ transformOrigin: "left" }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

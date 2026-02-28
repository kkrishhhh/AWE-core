"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStep, AgentName } from "@/types";

const AGENTS: { name: AgentName; label: string; color: string }[] = [
    { name: "intent_interpreter", label: "Interpreter", color: "#0A84FF" },
    { name: "router", label: "Router", color: "#06B6D4" },
    { name: "planner", label: "Planner", color: "#7C3AED" },
    { name: "executor", label: "Executor", color: "#10B981" },
    { name: "reflector", label: "Reflector", color: "#F59E0B" },
];

interface Props {
    steps: AgentStep[];
}

export function AgentPipeline({ steps }: Props) {
    return (
        <div className="glassmorphism rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {AGENTS.map((agent, i) => {
                    const step = steps.find((s) => s.agent === agent.name);
                    const status = step?.status || "pending";

                    return (
                        <div key={agent.name} className="flex items-center">
                            {/* Node */}
                            <div className="flex flex-col items-center min-w-[64px]">
                                <motion.div
                                    animate={{
                                        scale: status === "running" ? [1, 1.1, 1] : 1,
                                        borderColor:
                                            status === "completed"
                                                ? agent.color
                                                : status === "running"
                                                    ? agent.color
                                                    : "rgba(255,255,255,0.1)",
                                    }}
                                    transition={{
                                        scale: {
                                            repeat: status === "running" ? Infinity : 0,
                                            duration: 1.5,
                                        },
                                        borderColor: { duration: 0.3 },
                                    }}
                                    className={cn(
                                        "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                                        status === "completed" && "bg-opacity-20",
                                        status === "running" && "animate-pulse-ring"
                                    )}
                                    style={{
                                        backgroundColor:
                                            status === "completed"
                                                ? `${agent.color}20`
                                                : status === "running"
                                                    ? `${agent.color}10`
                                                    : "transparent",
                                    }}
                                >
                                    {status === "completed" ? (
                                        <Check className="w-4 h-4" style={{ color: agent.color }} />
                                    ) : status === "running" ? (
                                        <Loader2
                                            className="w-4 h-4 animate-spin"
                                            style={{ color: agent.color }}
                                        />
                                    ) : (
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                                        />
                                    )}
                                </motion.div>
                                <span
                                    className={cn(
                                        "text-[10px] mt-1 font-medium whitespace-nowrap",
                                        status === "running"
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {agent.label}
                                </span>
                                {step?.message && status === "running" && (
                                    <span className="text-[9px] text-muted-foreground max-w-[80px] truncate">
                                        {step.message}
                                    </span>
                                )}
                            </div>

                            {/* Connector line */}
                            {i < AGENTS.length - 1 && (
                                <div className="flex-shrink-0 mx-1">
                                    <div
                                        className={cn(
                                            "w-6 h-px transition-all duration-500",
                                            status === "completed"
                                                ? "bg-gradient-to-r from-primary to-secondary"
                                                : "bg-border"
                                        )}
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

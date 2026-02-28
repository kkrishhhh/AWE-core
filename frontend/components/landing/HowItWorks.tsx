"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MessageSquare, Route, Wrench, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
    {
        icon: MessageSquare,
        title: "Define Intent",
        description:
            "You speak naturally. The Intent Interpreter uses LLM-backed classification to extract your exact intent, parameters, and complexity level.",
        detail: "Supports follow-up detection, context carryover, and multi-entity extraction.",
        color: "#3B8EFF",
    },
    {
        icon: Route,
        title: "Route to Agent",
        description:
            "The Router dynamically selects the right path — simple tasks go direct to tools, complex ones generate multi-step plans with dependency graphs.",
        detail: "Includes complexity analysis and parallel execution detection.",
        color: "#8B5CF6",
    },
    {
        icon: Wrench,
        title: "Execute with Tools",
        description:
            "The Executor calls tools — web search, code execution, weather API, calculations — and streams each step in real-time via WebSocket.",
        detail: "9 production tools with auto-discovery and error recovery.",
        color: "#10B981",
    },
    {
        icon: Sparkles,
        title: "Reflect & Deliver",
        description:
            "The Reflection Agent evaluates quality with confidence scoring. Low-confidence results trigger automatic retry with adjusted strategy.",
        detail: "Delivers polished, verified answers you can trust.",
        color: "#F59E0B",
    },
];

export function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start 80%", "end 50%"],
    });

    const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    return (
        <section id="how-it-works" className="py-14 lg:py-20 relative" ref={containerRef}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 block">
                        Pipeline
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                        From Intent to Result
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Your message flows through 4 specialized agents, each with a distinct
                        role in the orchestration pipeline.
                    </p>
                </motion.div>

                {/* Timeline */}
                <div className="relative">
                    {/* Vertical line — background track */}
                    <div className="absolute left-8 lg:left-1/2 lg:-translate-x-px top-0 bottom-0 w-[2px] bg-border" />

                    {/* Vertical line — animated progress fill */}
                    <motion.div
                        className="absolute left-8 lg:left-1/2 lg:-translate-x-px top-0 w-[2px] bg-gradient-to-b from-primary via-secondary to-success"
                        style={{ height: lineHeight }}
                    />

                    {/* Steps */}
                    <div className="flex flex-col gap-16">
                        {STEPS.map((step, idx) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-80px" }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className={cn(
                                    "relative flex items-start gap-6",
                                    "lg:items-center",
                                    idx % 2 === 0
                                        ? "lg:flex-row"
                                        : "lg:flex-row-reverse lg:text-right"
                                )}
                            >
                                {/* Content */}
                                <div
                                    className={cn(
                                        "flex-1 pl-16 lg:pl-0",
                                        idx % 2 === 0 ? "lg:pr-16" : "lg:pl-16"
                                    )}
                                >
                                    <div className="glassmorphism rounded-2xl p-6 card-hover-glow hover:-translate-y-1 transition-all duration-300">
                                        <div className={cn(
                                            "flex items-center gap-3 mb-3",
                                            idx % 2 !== 0 && "lg:flex-row-reverse"
                                        )}>
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${step.color}12` }}
                                            >
                                                <step.icon className="w-5 h-5" style={{ color: step.color }} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                                    Step {idx + 1}
                                                </span>
                                                <h3 className="font-semibold text-lg">{step.title}</h3>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                            {step.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 italic">
                                            {step.detail}
                                        </p>
                                    </div>
                                </div>

                                {/* Center dot */}
                                <div className="absolute left-8 lg:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-background z-10"
                                    style={{ backgroundColor: step.color }}
                                >
                                    <div
                                        className="absolute inset-0 rounded-full animate-pulse"
                                        style={{
                                            boxShadow: `0 0 12px ${step.color}60`,
                                        }}
                                    />
                                </div>

                                {/* Spacer for opposite side */}
                                <div className="hidden lg:block flex-1" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

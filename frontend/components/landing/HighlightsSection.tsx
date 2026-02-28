"use client";

import { motion } from "framer-motion";
import { Sparkles, BookOpen, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
    {
        icon: Sparkles,
        title: "Real-Time Streaming",
        description: "Watch agents think step-by-step via WebSocket. Every tool call, every reasoning step, streamed live.",
        color: "#3B8EFF",
        rotate: "-3deg",
        translateY: "0px",
    },
    {
        icon: Shield,
        title: "Human-in-the-Loop",
        description: "Complex plans require your explicit approval before execution. You stay in control of the AI.",
        color: "#F59E0B",
        rotate: "2deg",
        translateY: "10px",
    },
    {
        icon: BookOpen,
        title: "RAG Knowledge Base",
        description: "Upload your docs. Agents search them with semantic similarity for grounded, accurate answers.",
        color: "#10B981",
        rotate: "-2deg",
        translateY: "5px",
    },
    {
        icon: Globe,
        title: "Multi-Step Plans",
        description: "Complex queries become dependency-aware task graphs with parallel execution and conditional routing.",
        color: "#8B5CF6",
        rotate: "3deg",
        translateY: "-5px",
    },
];

export function HighlightsSection() {
    return (
        <section className="py-14 lg:py-20 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 block">
                        Highlights
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                        Built for Real-World AI
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Not just a chatbot — a complete AI orchestration platform with
                        enterprise-grade features.
                    </p>
                </motion.div>

                {/* Aceternity-style stacked / fanned cards */}
                <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
                    {HIGHLIGHTS.map((h, i) => (
                        <motion.div
                            key={h.title}
                            initial={{ opacity: 0, y: 40, rotate: 0 }}
                            whileInView={{
                                opacity: 1,
                                y: 0,
                                rotate: h.rotate,
                                transition: { delay: i * 0.1, duration: 0.5 },
                            }}
                            whileHover={{
                                rotate: "0deg",
                                y: -10,
                                scale: 1.03,
                                transition: { duration: 0.3 },
                            }}
                            viewport={{ once: true }}
                            className={cn(
                                "w-[280px] glassmorphism rounded-2xl p-6 cursor-default card-hover-glow",
                                "hover:shadow-xl transition-shadow duration-300"
                            )}
                            style={{ translateY: h.translateY }}
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                style={{ backgroundColor: `${h.color}12` }}
                            >
                                <h.icon className="w-6 h-6" style={{ color: h.color }} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{h.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {h.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Bot, Cpu, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ROTATING_WORDS = [
    "orchestrates",
    "reasons",
    "executes",
    "reflects",
    "delivers",
];

const DISPLAY_CARDS = [
    {
        icon: Bot,
        title: "5 AI Agents",
        description: "Interpreter → Router → Planner → Executor → Reflector",
        color: "#3B8EFF",
    },
    {
        icon: Cpu,
        title: "Real-Time Streaming",
        description: "WebSocket streaming of every thought step",
        color: "#8B5CF6",
    },
    {
        icon: Sparkles,
        title: "RAG Powered",
        description: "Semantic search over your uploaded documents",
        color: "#10B981",
    },
];

export function HeroSection() {
    const [wordIndex, setWordIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated dot grid background */}
            <div className="absolute inset-0 hero-grid-bg" />

            {/* Radial gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[120px] bg-[rgba(59,142,255,0.08)]" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />

            <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left — Text Content */}
                    <div>
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glassmorphism text-xs font-medium mb-8">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span>Open Source AI Agent Platform</span>
                            </div>
                        </motion.div>

                        {/* Headline with rotating word */}
                        <motion.h1
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <span>The AI that</span>
                            <br />
                            <span className="relative block h-[1.3em]">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={ROTATING_WORDS[wordIndex]}
                                        className="absolute left-0 gradient-text font-extrabold"
                                        initial={{ y: 30, opacity: 0, filter: "blur(4px)" }}
                                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                        exit={{ y: -30, opacity: 0, filter: "blur(4px)" }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                    >
                                        {ROTATING_WORDS[wordIndex]}
                                    </motion.span>
                                </AnimatePresence>
                            </span>
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            A multi-agent orchestration engine with RAG, human-in-the-loop approval,
                            real-time streaming, and 9 production tools — built on LangGraph + FastAPI.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            className="flex flex-wrap gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <Link
                                href="/chat"
                                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-medium rounded-xl hover:shadow-[0_0_40px_var(--primary-glow)] hover:scale-[1.02] transition-all active:scale-[0.98]"
                            >
                                Start Building
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#features"
                                className="flex items-center gap-2 px-6 py-3 glassmorphism rounded-xl font-medium hover:bg-muted transition-all"
                            >
                                See How It Works
                            </a>
                        </motion.div>
                    </div>

                    {/* Right — Cascading Display Cards */}
                    <div className="relative hidden lg:flex items-center justify-center min-h-[400px]">
                        {/* Glow behind cards */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] bg-[rgba(59,142,255,0.12)]" />

                        {/* Connecting dashed line behind cards */}
                        <div className="absolute left-10 top-8 bottom-8 w-[2px] border-l-2 border-dashed border-primary/20 z-0" />

                        <div className="relative w-full max-w-sm space-y-5">
                            {DISPLAY_CARDS.map((card, idx) => (
                                <motion.div
                                    key={card.title}
                                    initial={{ opacity: 0, x: 60, rotate: 0 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        rotate: idx === 0 ? -4 : idx === 1 ? 3 : -2,
                                    }}
                                    transition={{ duration: 0.6, delay: 0.5 + idx * 0.15 }}
                                    whileHover={{
                                        scale: 1.05,
                                        rotate: 0,
                                        x: 5,
                                        transition: { duration: 0.25 },
                                    }}
                                    className={cn(
                                        "relative z-10 glassmorphism rounded-xl p-5 cursor-default transition-shadow duration-300",
                                        "hover:border-white/20 hover:shadow-xl",
                                        idx === 0 && "ml-0 w-[90%]",
                                        idx === 1 && "ml-12 w-[85%]",
                                        idx === 2 && "ml-6 w-[88%]"
                                    )}
                                >
                                    {/* Step number badge */}
                                    <span
                                        className="absolute -left-3 -top-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-20"
                                        style={{ backgroundColor: card.color }}
                                    >
                                        {String(idx + 1).padStart(2, "0")}
                                    </span>

                                    <div className="flex items-center gap-3 mb-2">
                                        <span
                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${card.color}20` }}
                                        >
                                            <card.icon className="w-4 h-4" style={{ color: card.color }} />
                                        </span>
                                        <span className="text-sm font-bold" style={{ color: card.color }}>
                                            {card.title}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{card.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

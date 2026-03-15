"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    FolderOpen,
    ListTodo,
    ArrowRight,
    X,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
    {
        icon: Sparkles,
        color: "#3B8EFF",
        title: "Welcome to Agentic Workflow Engine",
        description:
            "Your personal AI assistant powered by 5 AI agents that work together as a team — not just a chatbot, but a real AI workflow engine that can DO things for you.",
        visual: "🤖 → 🧠 → 📋 → ⚡ → ✅",
    },
    {
        icon: MessageSquare,
        color: "#3B8EFF",
        title: "💬 Chat — Talk to AI",
        description:
            "Ask anything! The AI can calculate, summarize text, check weather, analyze data, run code, and much more. Behind the scenes, 5 agents collaborate: Interpreter → Router → Planner → Executor → Reflector.",
        visual: null,
        examples: [
            "Calculate 345 × 87",
            "Summarize this article...",
            "What's the weather in Delhi?",
            "Analyze the sentiment of this review",
        ],
    },
    {
        icon: FolderOpen,
        color: "#8B5CF6",
        title: "📄 Documents — Teach the AI",
        description:
            "Upload files (.txt, .csv, .json, etc.) and the AI learns from them. Then go to Chat and ask questions about your documents — the AI will search through them to give you accurate answers!",
        visual: null,
        flow: ["Upload a File", "AI Learns from It", "Ask Questions in Chat"],
    },
    {
        icon: ListTodo,
        color: "#10B981",
        title: "📋 Tasks & 📊 Analytics",
        description:
            "Tasks shows the history of everything the AI did — what it understood, which tools it used, and the results. Analytics tracks the AI's performance, success rates, and the tools used most.",
        visual: null,
    },
];

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Reset to first slide every time the modal opens
    useEffect(() => {
        if (isOpen) setCurrentSlide(0);
    }, [isOpen]);

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const slide = SLIDES[currentSlide];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full max-w-lg glassmorphism rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
                            {/* Header gradient bar */}
                            <div
                                className="h-1.5 w-full"
                                style={{
                                    background: `linear-gradient(90deg, ${slide.color}, ${slide.color}80, transparent)`,
                                }}
                            />

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="p-8">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentSlide}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                                            style={{ backgroundColor: `${slide.color}15` }}
                                        >
                                            <slide.icon
                                                className="w-7 h-7"
                                                style={{ color: slide.color }}
                                            />
                                        </div>

                                        {/* Title */}
                                        <h2 className="text-xl font-bold mb-3">
                                            {slide.title}
                                        </h2>

                                        {/* Description */}
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                            {slide.description}
                                        </p>

                                        {/* Visual elements */}
                                        {slide.visual && (
                                            <div className="text-3xl tracking-wider text-center py-4 bg-muted/30 rounded-xl mb-5">
                                                {slide.visual}
                                            </div>
                                        )}

                                        {/* Example prompts */}
                                        {slide.examples && (
                                            <div className="space-y-2 mb-5">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Try these:</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {slide.examples.map((ex) => (
                                                        <div
                                                            key={ex}
                                                            className="text-xs px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground"
                                                        >
                                                            {ex}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Flow diagram */}
                                        {slide.flow && (
                                            <div className="flex items-center gap-2 text-sm mb-5 flex-wrap">
                                                {slide.flow.map((step, i) => (
                                                    <div key={step} className="flex items-center gap-2">
                                                        <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                                                            {step}
                                                        </span>
                                                        {i < slide.flow!.length - 1 && (
                                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                {/* Navigation */}
                                <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/30">
                                    {/* Dots */}
                                    <div className="flex items-center gap-2">
                                        {SLIDES.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentSlide(i)}
                                                className={cn(
                                                    "w-2 h-2 rounded-full transition-all",
                                                    i === currentSlide
                                                        ? "w-6 bg-primary"
                                                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                                )}
                                            />
                                        ))}
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex items-center gap-2">
                                        {currentSlide > 0 && (
                                            <button
                                                onClick={handlePrev}
                                                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                            >
                                                Back
                                            </button>
                                        )}
                                        <button
                                            onClick={handleNext}
                                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_var(--primary-glow)] transition-all"
                                        >
                                            {currentSlide === SLIDES.length - 1
                                                ? "Get Started"
                                                : "Next"}
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

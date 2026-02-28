"use client";

import { motion } from "framer-motion";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import {
    Calculator,
    Cloud,
    FileText,
    Globe,
    BarChart2,
    Terminal,
    Braces,
    SmilePlus,
    Search,
} from "lucide-react";

// Mapping exactly 8 tools directly to the Orbital Timeline format
const timelineData = [
    {
        id: 1,
        title: "Web Scraper",
        date: "Core Web Tool",
        content: "Scrapes and parses entire webpages instantly, extracting smart text and filtering out HTML noise.",
        category: "Data Extraction",
        icon: Globe,
        relatedIds: [3, 5], // Connects to text summarizer & data analyzer
        status: "completed" as const,
        energy: 98,
    },
    {
        id: 2,
        title: "Calculator",
        date: "Core Math Tool",
        content: "Evaluates complex mathematical expressions with absolute precision securely.",
        category: "Execution",
        icon: Calculator,
        relatedIds: [5, 6], // Connects to data analyzer & code exec
        status: "completed" as const,
        energy: 99,
    },
    {
        id: 3,
        title: "Text Summarizer",
        date: "LLM Processing",
        content: "Intelligently condenses massive blocks of text into concise, contextually accurate summaries.",
        category: "Language",
        icon: FileText,
        relatedIds: [1, 8], // Connects to web scraper & knowledge
        status: "completed" as const,
        energy: 92,
    },
    {
        id: 4,
        title: "Weather API",
        date: "External API",
        content: "Fetches live, real-time meteorological conditions for nearly any geographical location on earth.",
        category: "Information",
        icon: Cloud,
        relatedIds: [1, 5],
        status: "completed" as const,
        energy: 88,
    },
    {
        id: 5,
        title: "Data Analyzer",
        date: "Analytics Engine",
        content: "Pipes tabulated data through intelligent statistical algorithms to spot invisible trends.",
        category: "Data Processing",
        icon: BarChart2,
        relatedIds: [2, 6],
        status: "completed" as const,
        energy: 95,
    },
    {
        id: 6,
        title: "Code Executor",
        date: "Sandboxed Env",
        content: "Spins up an isolated Python container to execute dynamically generated code safely on the fly.",
        category: "Execution",
        icon: Terminal,
        relatedIds: [5, 7],
        status: "completed" as const,
        energy: 97,
    },
    {
        id: 7,
        title: "JSON Transformer",
        date: "Data Formatting",
        content: "Reshapes, reformats, and sanitizes unstructured or messy JSON payloads into strict schemas.",
        category: "Data Processing",
        icon: Braces,
        relatedIds: [1, 6],
        status: "completed" as const,
        energy: 94,
    },
    {
        id: 8,
        title: "Knowledge Retrieval",
        date: "RAG Pipeline",
        content: "Queries the ChromaDB vector database to semantically hunt for relevant internal document context.",
        category: "Memory",
        icon: Search,
        relatedIds: [3, 7],
        status: "completed" as const,
        energy: 99,
    },
    {
        id: 9,
        title: "Sentiment Analyzer",
        date: "Context Analysis",
        content: "Detects emotional tone, sentiment, and implicit intent from natural language interactions.",
        category: "Language",
        icon: SmilePlus,
        relatedIds: [3, 8],
        status: "completed" as const,
        energy: 90,
    },
];

export function ToolsGrid() {
    return (
        <section id="tools" className="py-14 lg:py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-background/50 dot-grid-bg mask-radial-fade"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-8 relative z-20"
                >
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 block">
                        Agent Arsenal
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                        Interactive Tool Orbital
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        A total of 9 specialized tools, auto-discovered and ready to be called by any agent at any time. Click on any orbiting tool to inspect its capabilities.
                    </p>
                </motion.div>

                {/* The Radial Orbital Timeline wrapper takes full height */}
                <div className="relative -mt-10 h-[700px] lg:h-[800px] w-full max-w-6xl mx-auto flex items-center justify-center pointer-events-auto">
                    <RadialOrbitalTimeline timelineData={timelineData} />
                </div>
            </div>
        </section>
    );
}

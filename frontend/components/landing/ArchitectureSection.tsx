"use client";

import { motion } from "framer-motion";
import { Database, Server, Cpu, Wifi, Sparkles } from "lucide-react";


const ARCH_ITEMS = [
    {
        icon: Cpu,
        title: "LangGraph Orchestration",
        description: "Stateful graph machine with cyclic execution, conditional routing, and state persistence.",
        color: "#3B8EFF",
    },
    {
        icon: Server,
        title: "FastAPI v3.0",
        description: "15 REST endpoints, WebSocket streaming, CORS, pagination, typed error envelopes.",
        color: "#10B981",
    },
    {
        icon: Database,
        title: "PostgreSQL + ChromaDB",
        description: "Relational storage for tasks & memory. Vector store for RAG semantic search.",
        color: "#8B5CF6",
    },
    {
        icon: Wifi,
        title: "Real-Time WebSocket",
        description: "Bidirectional streaming for agent progress, HITL approval, and live results.",
        color: "#F59E0B",
    },
];

const API_BADGES = [
    { label: "GET", desc: "/tasks" },
    { label: "POST", desc: "/chat" },
    { label: "PUT", desc: "/approve" },
    { label: "DELETE", desc: "/docs" },
];

const STATS = [
    { label: "Agents", value: 5 },
    { label: "Tools", value: 9 },
    { label: "Endpoints", value: 15 },
];

export function ArchitectureSection() {
    return (
        <section id="architecture" className="py-14 lg:py-20 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 block">
                        Architecture
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                        Built Like Production Software
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Enterprise patterns. Real databases. Not a toy project.
                    </p>
                </motion.div>

                {/* Architecture cards in 2x2 grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {ARCH_ITEMS.map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="glassmorphism rounded-2xl p-6 flex gap-4 group card-hover-glow hover:-translate-y-1 transition-all duration-300"
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center relative"
                                style={{ backgroundColor: `${item.color}12` }}
                            >
                                <item.icon className="w-6 h-6" style={{ color: item.color }} />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">{item.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Animated API Visualization (Aceternity-style) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative flex flex-col items-center"
                >
                    {/* Stats line */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {STATS.map((stat) => (
                            <div
                                key={stat.label}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-full glassmorphism"
                            >
                                <span className="text-sm font-bold gradient-text">{stat.value}</span>
                                <span className="text-xs text-muted-foreground">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* SVG API Flow Visualization */}
                    <div className="relative w-full max-w-[500px] h-[350px] flex flex-col items-center">
                        <svg
                            className="h-full w-full text-muted-foreground/20"
                            viewBox="0 0 200 100"
                        >
                            <g stroke="currentColor" fill="none" strokeWidth="0.4" strokeDasharray="100 100" pathLength="100">
                                <path d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10" />
                                <path d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10" />
                                <path d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10" />
                                <path d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10" />
                                <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
                            </g>

                            {/* Flowing light dots */}
                            <g mask="url(#api-mask-1)">
                                <circle className="database db-light-1" cx="0" cy="0" r="12" fill="url(#api-grad)" />
                            </g>
                            <g mask="url(#api-mask-2)">
                                <circle className="database db-light-2" cx="0" cy="0" r="12" fill="url(#api-grad)" />
                            </g>
                            <g mask="url(#api-mask-3)">
                                <circle className="database db-light-3" cx="0" cy="0" r="12" fill="url(#api-grad)" />
                            </g>
                            <g mask="url(#api-mask-4)">
                                <circle className="database db-light-4" cx="0" cy="0" r="12" fill="url(#api-grad)" />
                            </g>

                            {/* API Method badges */}
                            {API_BADGES.map((badge, idx) => {
                                const x = 14 + idx * 48;
                                return (
                                    <g key={badge.label} stroke="currentColor" fill="none" strokeWidth="0.4">
                                        <rect fill="var(--background)" x={x} y="3" width="38" height="12" rx="6" stroke="var(--border)" />
                                        <text x={x + 19} y="11" fill="var(--foreground)" stroke="none" fontSize="5" fontWeight="600" textAnchor="middle">
                                            {badge.label}
                                        </text>
                                    </g>
                                );
                            })}

                            <defs>
                                <mask id="api-mask-1"><path d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 25" strokeWidth="0.5" stroke="white" /></mask>
                                <mask id="api-mask-2"><path d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 25" strokeWidth="0.5" stroke="white" /></mask>
                                <mask id="api-mask-3"><path d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 25" strokeWidth="0.5" stroke="white" /></mask>
                                <mask id="api-mask-4"><path d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 25" strokeWidth="0.5" stroke="white" /></mask>
                                <radialGradient id="api-grad" fx="1">
                                    <stop offset="0%" stopColor="#3B8EFF" />
                                    <stop offset="100%" stopColor="transparent" />
                                </radialGradient>
                            </defs>
                        </svg>

                        {/* Center box */}
                        <div className="absolute bottom-8 flex flex-col items-center w-full">
                            <div className="absolute -bottom-4 h-24 w-[60%] rounded-lg bg-muted/20" />
                            <div className="absolute -top-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-lg glassmorphism text-xs">
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span>REST API with 15 endpoints</span>
                            </div>
                            <div className="absolute -bottom-8 z-30 w-14 h-14 rounded-full glassmorphism grid place-items-center font-bold text-sm gradient-text">
                                API
                            </div>
                            <div className="relative z-10 w-full h-[140px] glassmorphism rounded-xl overflow-hidden">
                                {/* Pulsing circles */}
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-t border-border/30 bg-muted/5 animate-pulse" />
                                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full border-t border-border/20 bg-muted/5" style={{ animationDelay: "0.3s" }} />
                                <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full border-t border-border/10 bg-muted/5" style={{ animationDelay: "0.6s" }} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ArrowUpRight } from "lucide-react";

const FOOTER_LINKS = [
    { label: "Features", href: "#features" },
    { label: "Architecture", href: "#architecture" },
    { label: "Tools", href: "#tools" },
    { label: "Dashboard", href: "/chat" },
    { label: "Analytics", href: "/analytics" },
];

const TECH_STACK = [
    { name: "Next.js", color: "#0A84FF" },
    { name: "FastAPI", color: "#10B981" },
    { name: "LangGraph", color: "#8B5CF6" },
    { name: "ChromaDB", color: "#F59E0B" },
    { name: "PostgreSQL", color: "#06B6D4" },
];

export function Footer() {
    return (
        <footer className="relative border-t border-border">
            {/* Animated gradient top line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent animate-gradient bg-[length:200%_200%]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    {/* Brand — wider column */}
                    <div className="md:col-span-5">
                        <Link href="/" className="flex items-center gap-2 group mb-4">
                            <div className="relative">
                                <Zap className="w-5 h-5 text-primary" />
                                <div className="absolute inset-0 bg-primary/30 rounded-full blur-md group-hover:blur-lg transition-all" />
                            </div>
                            <span className="font-bold text-lg">AWE</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                            Orchestrating intelligence, one agent at a time. A full-stack AI platform
                            with RAG, memory, human-in-the-loop approval, and real-time streaming.
                        </p>

                        {/* Tech Stack */}
                        <div className="flex flex-wrap gap-2 mt-6">
                            {TECH_STACK.map((tech) => (
                                <span
                                    key={tech.name}
                                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full glassmorphism"
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                                        style={{ backgroundColor: tech.color }}
                                    />
                                    {tech.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div className="md:col-span-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Navigate
                        </h4>
                        <div className="flex flex-col gap-2.5">
                            {FOOTER_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {link.label}
                                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Connect */}
                    <div className="md:col-span-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Connect
                        </h4>
                        <div className="flex flex-col gap-3">
                            <a
                                href="https://www.linkedin.com/in/krishhhhh"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <div className="p-2 rounded-lg glassmorphism group-hover:border-primary/30 transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-foreground text-sm">LinkedIn</p>
                                    <p className="text-xs text-muted-foreground">in/krishhhhh</p>
                                </div>
                            </a>
                            <a
                                href="tel:7028289876"
                                className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <div className="p-2 rounded-lg glassmorphism group-hover:border-primary/30 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-foreground text-sm">Phone</p>
                                    <p className="text-xs text-muted-foreground">+91 70282 89876</p>
                                </div>
                            </a>
                            <a
                                href="mailto:krishhhh.work@gmail.com"
                                className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <div className="p-2 rounded-lg glassmorphism group-hover:border-primary/30 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="20" height="16" x="2" y="4" rx="2" />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-foreground text-sm">Email</p>
                                    <p className="text-xs text-muted-foreground">krishhhh.work@gmail.com</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Agentic Workflow Engine. All rights reserved.
                    </p>
                    <motion.p
                        className="text-xs text-muted-foreground/60 italic"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        Orchestrating intelligence, one agent at a time.
                    </motion.p>
                </div>
            </div>
        </footer>
    );
}

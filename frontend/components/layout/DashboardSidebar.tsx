"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
    MessageSquare,
    ListTodo,
    FolderOpen,
    BarChart3,
    Zap,
    Sun,
    Moon,
    Menu,
    X,
    HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";

const SIDEBAR_LINKS = [
    { label: "Chat", href: "/chat", icon: MessageSquare },
    { label: "Tasks", href: "/tasks", icon: ListTodo },
    { label: "Documents", href: "/documents", icon: FolderOpen },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function DashboardSidebar({ onOpenGuide }: { onOpenGuide?: () => void }) {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => setMounted(true), []);

    const { data: health } = useQuery({
        queryKey: ["health"],
        queryFn: getHealth,
        refetchInterval: 30000,
    });

    const isHealthy = health?.status === "healthy";

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 flex items-center gap-3 border-b border-border">
                <div className="relative flex-shrink-0">
                    <Zap className="w-6 h-6 text-primary" />
                </div>
                <AnimatePresence>
                    {(isExpanded || isMobileOpen) && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="font-bold text-sm whitespace-nowrap overflow-hidden"
                        >
                            Agentic Engine
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Links */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {SIDEBAR_LINKS.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <link.icon className="w-4 h-4 flex-shrink-0" />
                            <AnimatePresence>
                                {(isExpanded || isMobileOpen) && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="whitespace-nowrap overflow-hidden"
                                    >
                                        {link.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-border space-y-2">
                {/* Health status */}
                <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
                    <div
                        className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            isHealthy ? "bg-success animate-pulse-ring" : "bg-error"
                        )}
                    />
                    <AnimatePresence>
                        {(isExpanded || isMobileOpen) && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="whitespace-nowrap overflow-hidden"
                            >
                                {isHealthy ? "Engine Online" : "Engine Offline"}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* How to Use button */}
                {onOpenGuide && (
                    <button
                        onClick={onOpenGuide}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg w-full transition-colors"
                    >
                        <HelpCircle className="w-4 h-4 flex-shrink-0" />
                        <AnimatePresence>
                            {(isExpanded || isMobileOpen) && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="whitespace-nowrap overflow-hidden"
                                >
                                    How to Use
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                )}

                {/* Theme toggle */}
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg w-full transition-colors"
                    >
                        {theme === "dark" ? (
                            <Sun className="w-4 h-4 flex-shrink-0" />
                        ) : (
                            <Moon className="w-4 h-4 flex-shrink-0" />
                        )}
                        <AnimatePresence>
                            {(isExpanded || isMobileOpen) && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="whitespace-nowrap overflow-hidden"
                                >
                                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile toggle */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg glassmorphism"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                            onClick={() => setIsMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-background border-r border-border lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop sidebar */}
            <aside
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
                className={cn(
                    "hidden lg:flex flex-col h-screen sticky top-0 border-r border-border bg-background/80 backdrop-blur-xl transition-all duration-300",
                    isExpanded ? "w-[220px]" : "w-[60px]"
                )}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
